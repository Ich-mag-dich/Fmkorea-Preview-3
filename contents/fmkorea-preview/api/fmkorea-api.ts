import { BASE_URL } from "../constants";
import type { Comment, CommentVoteType, PostData } from "../types";
import { parseComments, parsePagination, parsePostDocument } from "../lib/parser";

const parseXmlResponse = async (res: Response) => {
  const text = await res.text();
  const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
  return {
    errorCode: xmlDoc.querySelector("error")?.textContent?.trim(),
    commentSrl: xmlDoc.querySelector("comment_srl")?.textContent?.trim(),
  };
};

const buildCommentXml = ({
  mid,
  docId,
  content,
  parentSrl,
}: {
  mid: string;
  docId: string;
  content: string;
  parentSrl?: string;
}) =>
  `<?xml version="1.0" encoding="utf-8" ?>\n<methodCall>\n<params>\n` +
  `<_filter><![CDATA[insert_comment]]></_filter>\n` +
  `<mid><![CDATA[${mid}]]></mid>\n` +
  `<document_srl><![CDATA[${docId}]]></document_srl>\n` +
  `<content><![CDATA[${content}]]></content>\n` +
  (parentSrl ? `<parent_srl><![CDATA[${parentSrl}]]></parent_srl>\n` : "") +
  `<use_html><![CDATA[Y]]></use_html>\n` +
  `<module><![CDATA[board]]></module>\n` +
  `<act><![CDATA[procBoardInsertComment]]></act>\n` +
  `</params>\n</methodCall>`;

export const fetchPost = async (url: string): Promise<PostData> => {
  const res = await fetch(url);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  return parsePostDocument(url, doc);
};

export const fetchCommentPage = async (
  post: PostData,
  page: number,
): Promise<Pick<PostData, "comments" | "commentPage" | "totalCommentPages">> => {
  const url = new URL(post.url);
  url.searchParams.set("cpage", page.toString());
  const res = await fetch(url.toString());
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const { totalPages } = parsePagination(doc);
  return {
    comments: parseComments(doc),
    commentPage: page,
    totalCommentPages: totalPages,
  };
};

export const voteDocument = async (
  post: PostData,
  type: CommentVoteType,
): Promise<boolean> => {
  const act = type === "up" ? "procDocumentVoteUp" : "procDocumentVoteDown";
  const params = new URLSearchParams({
    target_srl: post.docId,
    midz: post.mid,
    module: "document",
    act,
  });
  if (post.voteRid) params.set("rid", post.voteRid);

  const res = await fetch(`${BASE_URL}/?act=${act}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    credentials: "include",
    body: params.toString(),
  });
  const data = await res.json();
  return !data.error;
};

export const voteComment = async (
  commentId: string,
  type: CommentVoteType,
): Promise<number | null> => {
  const act = type === "up" ? "procCommentVoteUp" : "procCommentVoteDown";
  const params = new URLSearchParams({
    target_srl: commentId,
    module: "comment",
    act,
  });

  const res = await fetch(`${BASE_URL}/?act=${act}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    credentials: "include",
    body: params.toString(),
  });
  const data = await res.json();
  return typeof data.voted_count !== "undefined" ? data.voted_count : null;
};

export const submitComment = async ({
  post,
  content,
  parentSrl,
}: {
  post: PostData;
  content: string;
  parentSrl?: string;
}): Promise<Comment | null> => {
  const res = await fetch(`${BASE_URL}/write.php?act=procBoardInsertComment`, {
    method: "POST",
    headers: {
      accept: "application/xml, text/xml, */*; q=0.01",
      "content-type": "text/xml; charset=UTF-8",
      "x-requested-with": "XMLHttpRequest",
    },
    credentials: "include",
    body: buildCommentXml({
      mid: post.mid,
      docId: post.docId,
      content,
      parentSrl,
    }),
  });

  const { errorCode, commentSrl } = await parseXmlResponse(res);
  if (!res.ok || errorCode !== "0" || !commentSrl) return null;

  return {
    id: commentSrl,
    author: "나",
    levelIcon: "",
    userIcon: "",
    memberSrl: "",
    date: "방금",
    content: content.replace(/\n/g, "<br>"),
    voteUp: 0,
    voteDown: 0,
    isReply: Boolean(parentSrl),
    isBest: false,
    isWriter: false,
  };
};
