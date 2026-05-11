import cssText from "data-text:~/style.css";
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo";
import { useEffect, useRef, useState } from "react";

export const config: PlasmoCSConfig = {
  matches: ["https://www.fmkorea.com/*"],
};

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText;
  return style;
};

interface Comment {
  id: string;
  author: string;
  levelIcon: string;
  memberSrl: string;
  date: string;
  content: string;
  voteUp: number;
  voteDown: number;
  isReply: boolean;
  isBest: boolean;
}

interface MemberPopup {
  memberSrl: string;
  author: string;
  x: number;
  y: number;
}

interface PostData {
  title: string;
  author: string;
  date: string;
  views: string;
  content: string;
  url: string;
  docId: string;
  authorMemberSrl: string;
  voteRid: string;
  voteCount: number;
  comments: Comment[];
  mid: string;
  commentPage: number;
  totalCommentPages: number;
}

const BASE = "https://www.fmkorea.com";

const fixAttr = (el: Element, attr: string) => {
  const val = el.getAttribute(attr);
  if (val?.startsWith("//")) el.setAttribute(attr, `https:${val}`);
  else if (val?.startsWith("/")) el.setAttribute(attr, `${BASE}${val}`);
};

const absolutizeMedia = (root: Element) => {
  root.querySelectorAll("img").forEach((img) => {
    const orig =
      img.getAttribute("data-original") ?? img.getAttribute("data-src");
    if (orig) img.setAttribute("src", orig);
    fixAttr(img, "src");
  });
  root.querySelectorAll("source").forEach((s) => fixAttr(s, "src"));
};

const cleanVideoWrappers = (root: Element) => {
  root.querySelectorAll(".height_keep").forEach((wrapper) => {
    const video = wrapper.querySelector("video");
    const source = video?.querySelector("source");
    if (!video) return;

    const newVid = document.createElement("video");
    newVid.src = source?.getAttribute("src") ?? video.getAttribute("src") ?? "";
    fixAttr(newVid, "src");
    newVid.controls = true;
    newVid.preload = "metadata";
    newVid.style.cssText =
      "max-width:100%;max-height:480px;width:auto;border-radius:6px;margin:8px 0;display:block";

    const poster = video.getAttribute("poster");
    if (poster) {
      newVid.poster = poster.startsWith("//") ? `https:${poster}` : poster;
    }

    if (video.classList.contains("video-without-sound")) {
      newVid.autoplay = true;
      newVid.loop = true;
      newVid.muted = true;
    }

    newVid.addEventListener("loadedmetadata", () => {
      newVid.volume = 0.5;
    });

    wrapper.replaceWith(newVid);
  });
};

const YT_RE =
  /(?:youtube\.com\/(?:watch\?[^&\s]*?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const TW_RE = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
const IG_RE = /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/;
const CHZZK_RE = /chzzk\.naver\.com\/clips\/([A-Za-z0-9_-]+)/;
const SOOP_RE = /vod\.sooplive\.com\/player\/(\d+)/;

const makeVideoWrap = (iframe: HTMLIFrameElement): HTMLElement => {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "width:100%;aspect-ratio:16/9;margin:8px 0;border-radius:8px;overflow:hidden";
  iframe.style.cssText = "width:100%;height:100%;border:0";
  wrap.appendChild(iframe);
  return wrap;
};

const makeEmbed = (url: string): HTMLElement | null => {
  const yt = url.match(YT_RE);
  if (yt) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${yt[1]}`;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.setAttribute("allowfullscreen", "");
    return makeVideoWrap(iframe);
  }
  const chzzk = url.match(CHZZK_RE);
  if (chzzk) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://chzzk.naver.com/embed/clip/${chzzk[1]}`;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.setAttribute("allowfullscreen", "");
    return makeVideoWrap(iframe);
  }
  const soop = url.match(SOOP_RE);
  if (soop) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://vod.sooplive.com/player/${soop[1]}/embed`;
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.setAttribute("allowfullscreen", "");
    return makeVideoWrap(iframe);
  }
  const tw = url.match(TW_RE);
  if (tw) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://platform.twitter.com/embed/Tweet.html?id=${tw[1]}`;
    iframe.style.cssText =
      "width:100%;max-width:550px;border:0;border-radius:12px;margin:8px 0;display:block;min-height:280px";
    return iframe;
  }
  const ig = url.match(IG_RE);
  if (ig) {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.instagram.com/p/${ig[1]}/embed/`;
    iframe.style.cssText =
      "width:100%;max-width:400px;border:0;border-radius:8px;margin:8px 0;display:block;min-height:480px";
    return iframe;
  }
  return null;
};

const embedKey = (url: string): string | null => {
  const yt = url.match(YT_RE);
  if (yt) return `yt:${yt[1]}`;
  const chzzk = url.match(CHZZK_RE);
  if (chzzk) return `chzzk:${chzzk[1]}`;
  const soop = url.match(SOOP_RE);
  if (soop) return `soop:${soop[1]}`;
  const tw = url.match(TW_RE);
  if (tw) return `tw:${tw[1]}`;
  const ig = url.match(IG_RE);
  if (ig) return `ig:${ig[1]}`;
  return null;
};

const embedMedia = (root: Element) => {
  const seen = new Set<string>();

  const tryEmbed = (url: string): HTMLElement | null => {
    const key = embedKey(url);
    if (!key || seen.has(key)) return null;
    const embed = makeEmbed(url);
    if (embed) seen.add(key);
    return embed;
  };

  // <a> 태그 처리
  Array.from(root.querySelectorAll("a[href]")).forEach((a) => {
    const embed = tryEmbed(a.getAttribute("href") ?? "");
    if (embed) a.replaceWith(embed);
  });

  // 텍스트 노드의 bare URL 처리 (p 태그 안에 그냥 URL만 있는 경우 등)
  const BARE_URL_RE = /https?:\/\/[^\s<>"]+/g;

  const collectTextNodes = (el: Element): Text[] => {
    const out: Text[] = [];
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === 3) out.push(child as Text);
      else if (
        child.nodeType === 1 &&
        !["IFRAME", "SCRIPT", "STYLE"].includes((child as Element).tagName)
      )
        out.push(...collectTextNodes(child as Element));
    }
    return out;
  };

  for (const textNode of collectTextNodes(root)) {
    const text = textNode.textContent ?? "";
    const matches = [...text.matchAll(BARE_URL_RE)];
    if (!matches.length) continue;

    const hits: { start: number; end: number; el: HTMLElement }[] = [];
    for (const m of matches) {
      const embed = tryEmbed(m[0]);
      if (embed) {
        hits.push({ start: m.index!, end: m.index! + m[0].length, el: embed });
      } else {
        const a = document.createElement("a");
        a.href = m[0];
        a.textContent = m[0];
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        hits.push({ start: m.index!, end: m.index! + m[0].length, el: a });
      }
    }

    const parent = textNode.parentNode!;
    const frag = document.createDocumentFragment();
    let last = 0;
    for (const { start, end, el } of hits) {
      if (start > last)
        frag.appendChild(document.createTextNode(text.slice(last, start)));
      frag.appendChild(el);
      last = end;
    }
    if (last < text.length)
      frag.appendChild(document.createTextNode(text.slice(last)));
    parent.replaceChild(frag, textNode);
  }
};

const cleanContent = (root: Element) => {
  root.querySelectorAll(".beforeLoad").forEach((el) => {
    el.className = el.className.replace("beforeLoad", "").trim();
  });
  root.querySelectorAll<HTMLElement>(".auto_media_wrapper").forEach((el) => {
    el.style.opacity = "1";
    el.style.width = "100%";
    el.style.maxWidth = "100%";
    const vid = el.querySelector<HTMLVideoElement>("video");
    if (vid) {
      vid.style.maxWidth = "100%";
      vid.style.maxHeight = "480px";
      vid.style.width = "auto";
    }
  });
  absolutizeMedia(root);
  cleanVideoWrappers(root);
  root.innerHTML = root.innerHTML.replace(/<!--[\s\S]*?-->/g, "");
  embedMedia(root);
};

const extractAuthorText = (memberPlate: Element | null): string => {
  if (!memberPlate) return "알 수 없음";
  const textNode = Array.from(memberPlate.childNodes)
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent?.trim())
    .filter(Boolean)
    .join("");
  return textNode || "알 수 없음";
};

const fixIconUrl = (src: string | null | undefined): string => {
  if (!src) return "";
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${BASE}${src}`;
  return src;
};

const parsePagination = (
  doc: Document,
): { currentPage: number; totalPages: number } => {
  const allPgDivs = Array.from(doc.querySelectorAll(".bd_pg"));
  // 댓글 페이지네이션만 찾기: #comment 안에 있거나 cpage 파라미터를 포함한 링크를 가진 것
  const pgDiv =
    allPgDivs.find(
      (div) =>
        !!div.closest("#comment") ||
        Array.from(div.querySelectorAll("a")).some((a) =>
          a.getAttribute("href")?.includes("cpage="),
        ),
    ) ?? null;
  if (!pgDiv) return { currentPage: 1, totalPages: 1 };
  const currentPage =
    parseInt(pgDiv.querySelector("strong.this")?.textContent?.trim() ?? "1") ||
    1;
  const nums = Array.from(pgDiv.querySelectorAll("a:not(.direction)"))
    .map((a) => parseInt(a.textContent?.trim() ?? ""))
    .filter((n) => !isNaN(n) && n > 0);
  const totalPages = Math.max(...nums, currentPage);
  return { currentPage, totalPages };
};

const parseComments = (doc: Document): Comment[] => {
  const items = doc.querySelectorAll("ul.fdb_lst_ul > li");
  return Array.from(items).flatMap((li): Comment[] => {
    const id = li.id?.replace("comment_", "") ?? "";
    if (!id || li.querySelector(".fdb_delete")) return [];

    const contentEl = li.querySelector(
      ".comment-content .xe_content, .comment-content",
    );
    if (contentEl) {
      absolutizeMedia(contentEl);
      contentEl
        .querySelectorAll("a[onclick]")
        .forEach((a) => a.removeAttribute("onclick"));
    }

    const memberPlate = li.querySelector(".member_plate");
    const levelImg = memberPlate?.querySelector("img.level");
    const memberClass = Array.from(memberPlate?.classList ?? []).find((c) =>
      /^member_\d+$/.test(c),
    );
    const memberSrl = memberClass?.replace("member_", "") ?? "";

    return [
      {
        id,
        author: extractAuthorText(memberPlate),
        levelIcon: fixIconUrl(levelImg?.getAttribute("src")),
        memberSrl,
        date: li.querySelector(".date")?.textContent?.trim() ?? "",
        content: contentEl?.innerHTML ?? "",
        voteUp:
          parseInt(
            li.querySelector(".voted_count")?.textContent?.trim() ?? "0",
          ) || 0,
        voteDown:
          parseInt(
            li.querySelector(".blamed_count")?.textContent?.trim() ?? "0",
          ) || 0,
        isReply: li.classList.contains("re"),
        isBest: li.classList.contains("comment_best"),
      },
    ];
  });
};

async function fetchPost(url: string): Promise<PostData> {
  const res = await fetch(url);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  const title =
    doc.querySelector(".np_18px_span")?.textContent?.trim() ?? "제목 없음";
  const authorPlate = doc.querySelector(".member_plate");
  const author = extractAuthorText(authorPlate);
  const authorMemberSrl =
    Array.from(authorPlate?.classList ?? [])
      .find((c) => /^member_\d+$/.test(c))
      ?.replace("member_", "") ?? "";
  const date =
    doc.querySelector("span.date.m_no")?.textContent?.trim() ??
    doc.querySelector(".date")?.textContent?.trim() ??
    "";
  const views =
    doc
      .querySelector("div.side.fr")
      ?.textContent?.trim()
      .replace(/\s+/g, " ") ?? "";

  let docId = url.match(/\/(\d+)(?:\/|\?|$)/)?.[1] ?? "";
  try {
    const docHref = (
      doc.querySelector("div.document_address > a") as HTMLAnchorElement
    ).href;
    const extracted = docHref
      .replace(`${BASE}/`, "")
      .replace("best/", "")
      .match(/^(\d+)/)?.[1];
    if (extracted) docId = extracted;
  } catch {}

  const voteCount =
    parseInt(
      (
        doc.querySelector(".new_voted_count") as HTMLElement
      )?.textContent?.trim() ?? "0",
    ) || 0;

  let voteRid = "";
  if (docId) {
    const voteBtn = doc.querySelector(`#fm_vote${docId}`);
    voteRid =
      voteBtn?.getAttribute("data-rid") ?? voteBtn?.getAttribute("rid") ?? "";
  }
  if (!voteRid) {
    for (const s of Array.from(doc.querySelectorAll("script"))) {
      const m = s.textContent?.match(/"rid"\s*[=:]\s*"([A-Za-z0-9+/=]{20,})"/);
      if (m) {
        voteRid = m[1];
        break;
      }
    }
  }

  const mid =
    doc.querySelector<HTMLInputElement>("input[name='mid']")?.value ??
    url.match(/fmkorea\.com\/(?:best\/)?([a-z_]+)\//)?.[1] ??
    "";

  let contentEl: Element | null = null;
  if (doc.querySelector(".hotdeal_table")) {
    const parent = doc.querySelector(".hotdeal_url")?.parentElement;
    const rdBody = doc.querySelector(".rd_body");
    if (parent && rdBody) {
      parent.appendChild(rdBody);
      contentEl = parent;
    }
  }
  contentEl ??=
    doc.querySelector(".xe_content") ?? doc.querySelector(".rd_body");

  if (contentEl) {
    cleanContent(contentEl);
    contentEl.querySelector(".document_address")?.remove();
  }

  const pagination = parsePagination(doc);

  return {
    title,
    author,
    date,
    views,
    content: contentEl?.innerHTML ?? "<p>내용을 불러올 수 없습니다.</p>",
    url,
    docId,
    authorMemberSrl,
    voteRid,
    voteCount,
    comments: parseComments(doc),
    mid,
    commentPage: pagination.currentPage,
    totalCommentPages: pagination.totalPages,
  };
}

class HistoryManager {
  private state = { isActive: false, previousTitle: "", previousUrl: "" };

  push(url: string, title: string, currentUrl: string) {
    if (this.state.isActive) return;
    this.state.isActive = true;
    this.state.previousTitle = document.title;
    this.state.previousUrl = currentUrl;
    history.pushState(null, "", url);
    document.title = title;
  }

  restore() {
    if (!this.state.isActive) return;
    this.state.isActive = false;
    history.replaceState(null, "", this.state.previousUrl);
    document.title = this.state.previousTitle;
  }

  isActive() {
    return this.state.isActive;
  }

  reset() {
    this.state.isActive = false;
    document.title = this.state.previousTitle;
  }
}

const historyManager = new HistoryManager();

const getPreviewLink = (el: HTMLElement): HTMLAnchorElement | null => {
  const link = el.closest("a");
  if (
    link?.classList.contains("title") ||
    link?.classList.contains("hotdeal_var8") ||
    el.closest("td")?.classList.contains("title")
  ) {
    return link as HTMLAnchorElement;
  }
  return null;
};

export default function FmkoreaPreview() {
  const commentSectionRef = useRef<HTMLDivElement>(null);
  const postContentRef = useRef<HTMLDivElement>(null);
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentResult, setCommentResult] = useState<
    "success" | "error" | null
  >(null);
  const [votedComments, setVotedComments] = useState<Set<string>>(new Set());
  const [memberPopup, setMemberPopup] = useState<MemberPopup | null>(null);
  const [commentPageLoading, setCommentPageLoading] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyResult, setReplyResult] = useState<"success" | "error" | null>(
    null,
  );

  const handleCommentPageChange = async (page: number) => {
    if (!post || page === post.commentPage || commentPageLoading) return;
    setCommentPageLoading(true);
    try {
      const url = new URL(post.url);
      url.searchParams.set("cpage", page.toString());
      const res = await fetch(url.toString());
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const { totalPages } = parsePagination(doc);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comments: parseComments(doc),
              commentPage: page,
              totalCommentPages: Math.max(prev.totalCommentPages, totalPages),
            }
          : prev,
      );
      setVotedComments(new Set());
      setReplyingTo(null);
      setReplyText("");
      setTimeout(() => {
        commentSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    } catch {
    } finally {
      setCommentPageLoading(false);
    }
  };

  const closePreview = () => {
    historyManager.restore();
    setVisible(false);
    setPost(null);
    setCommentText("");
    setCommentResult(null);
    setVotedComments(new Set());
    setMemberPopup(null);
    setReplyingTo(null);
    setReplyText("");
    setReplyResult(null);
  };

  const handleAuthorClick = (
    memberSrl: string,
    author: string,
    e: React.MouseEvent,
  ) => {
    if (!memberSrl) return;
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = e.clientY + 6;
    setMemberPopup((prev) =>
      prev?.memberSrl === memberSrl ? null : { memberSrl, author, x, y },
    );
  };

  const handleVote = async (type: "up" | "down") => {
    if (!post?.docId) return;
    const act = type === "up" ? "procDocumentVoteUp" : "procDocumentVoteDown";
    const params = new URLSearchParams({
      target_srl: post.docId,
      midz: post.mid,
      module: "document",
      act,
    });
    if (post.voteRid) params.set("rid", post.voteRid);
    try {
      const res = await fetch(`${BASE}/?act=${act}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        credentials: "include",
        body: params.toString(),
      });
      const data = await res.json();
      if (!data.error) setVoteCount((c) => c + 1);
    } catch {}
  };

  const handleCommentVote = async (type: "up" | "down", commentId: string) => {
    if (votedComments.has(commentId)) return;
    const act = type === "up" ? "procCommentVoteUp" : "procCommentVoteDown";
    const params = new URLSearchParams({
      target_srl: commentId,
      module: "comment",
      act,
    });
    try {
      const res = await fetch(`${BASE}/?act=${act}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-requested-with": "XMLHttpRequest",
        },
        credentials: "include",
        body: params.toString(),
      });
      const data = await res.json();
      // voted_count 필드가 있으면 성공 (error: -2도 정상 처리)
      if (typeof data.voted_count !== "undefined") {
        setVotedComments((prev) => new Set([...prev, commentId]));
        setPost((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            comments: prev.comments.map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    voteUp:
                      type === "up"
                        ? (data.voted_count ?? c.voteUp + 1)
                        : c.voteUp,
                    voteDown:
                      type === "down"
                        ? (data.voted_count ?? c.voteDown + 1)
                        : c.voteDown,
                  }
                : c,
            ),
          };
        });
      }
    } catch {}
  };

  const handleCommentPost = async () => {
    if (!post?.docId || !commentText.trim() || submitting) return;
    setSubmitting(true);
    const content = commentText.trim();
    const xml =
      `<?xml version="1.0" encoding="utf-8" ?>\n<methodCall>\n<params>\n` +
      `<_filter><![CDATA[insert_comment]]></_filter>\n` +
      `<mid><![CDATA[${post.mid}]]></mid>\n` +
      `<document_srl><![CDATA[${post.docId}]]></document_srl>\n` +
      `<content><![CDATA[${content}]]></content>\n` +
      `<use_html><![CDATA[Y]]></use_html>\n` +
      `<module><![CDATA[board]]></module>\n` +
      `<act><![CDATA[procBoardInsertComment]]></act>\n` +
      `</params>\n</methodCall>`;
    try {
      const res = await fetch(`${BASE}/write.php?act=procBoardInsertComment`, {
        method: "POST",
        headers: {
          accept: "application/xml, text/xml, */*; q=0.01",
          "content-type": "text/xml; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
        },
        credentials: "include",
        body: xml,
      });
      const text = await res.text();
      const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
      const errorCode = xmlDoc.querySelector("error")?.textContent?.trim();
      const commentSrl = xmlDoc
        .querySelector("comment_srl")
        ?.textContent?.trim();
      const ok = res.ok && errorCode === "0";

      if (ok && commentSrl) {
        const newComment: Comment = {
          id: commentSrl,
          author: "나",
          levelIcon: "",
          memberSrl: "",
          date: "방금",
          content: content.replace(/\n/g, "<br>"),
          voteUp: 0,
          voteDown: 0,
          isReply: false,
          isBest: false,
        };
        setPost((prev) =>
          prev ? { ...prev, comments: [...prev.comments, newComment] } : prev,
        );
        setCommentText("");
      }

      setSubmitting(false);
      setCommentResult(ok ? "success" : "error");
    } catch {
      setSubmitting(false);
      setCommentResult("error");
    }
    setTimeout(() => setCommentResult(null), 3000);
  };

  const handleReplyPost = async () => {
    if (!post?.docId || !replyText.trim() || replySubmitting || !replyingTo)
      return;
    setReplySubmitting(true);
    const content = replyText.trim();
    const xml =
      `<?xml version="1.0" encoding="utf-8" ?>\n<methodCall>\n<params>\n` +
      `<_filter><![CDATA[insert_comment]]></_filter>\n` +
      `<mid><![CDATA[${post.mid}]]></mid>\n` +
      `<document_srl><![CDATA[${post.docId}]]></document_srl>\n` +
      `<content><![CDATA[${content}]]></content>\n` +
      `<parent_srl><![CDATA[${replyingTo}]]></parent_srl>\n` +
      `<use_html><![CDATA[Y]]></use_html>\n` +
      `<module><![CDATA[board]]></module>\n` +
      `<act><![CDATA[procBoardInsertComment]]></act>\n` +
      `</params>\n</methodCall>`;
    try {
      const res = await fetch(`${BASE}/write.php?act=procBoardInsertComment`, {
        method: "POST",
        headers: {
          accept: "application/xml, text/xml, */*; q=0.01",
          "content-type": "text/xml; charset=UTF-8",
          "x-requested-with": "XMLHttpRequest",
        },
        credentials: "include",
        body: xml,
      });
      const text = await res.text();
      const xmlDoc = new DOMParser().parseFromString(text, "text/xml");
      const errorCode = xmlDoc.querySelector("error")?.textContent?.trim();
      const commentSrl = xmlDoc
        .querySelector("comment_srl")
        ?.textContent?.trim();
      const ok = res.ok && errorCode === "0";

      if (ok && commentSrl) {
        const newReply: Comment = {
          id: commentSrl,
          author: "나",
          levelIcon: "",
          memberSrl: "",
          date: "방금",
          content: content.replace(/\n/g, "<br>"),
          voteUp: 0,
          voteDown: 0,
          isReply: true,
          isBest: false,
        };
        setPost((prev) => {
          if (!prev) return prev;
          const idx = prev.comments.findIndex((c) => c.id === replyingTo);
          const comments = [...prev.comments];
          comments.splice(idx === -1 ? comments.length : idx + 1, 0, newReply);
          return { ...prev, comments };
        });
        setReplyText("");
        setReplyingTo(null);
      }

      setReplySubmitting(false);
      setReplyResult(ok ? "success" : "error");
    } catch {
      setReplySubmitting(false);
      setReplyResult("error");
    }
    setTimeout(() => setReplyResult(null), 3000);
  };

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = getPreviewLink(target);
      if (!link?.href) return;
      e.preventDefault();

      setVisible(true);
      setLoading(true);
      setError(false);
      setPost(null);

      fetchPost(link.href)
        .then((data) => {
          setPost(data);
          setVoteCount(data.voteCount);
          historyManager.push(link.href, data.title, window.location.href);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible]);

  useEffect(() => {
    const handler = () => {
      if (!historyManager.isActive()) return;
      historyManager.reset();
      setVisible(false);
      setPost(null);
      setError(false);
      setLoading(false);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  useEffect(() => {
    chrome.storage.local.get("fmk_updated", (result) => {
      if (result.fmk_updated) {
        setTimeout(() => setUpdateVersion(result.fmk_updated as string), 2000);
        chrome.storage.local.remove("fmk_updated");
      }
    });
  }, []);

  useEffect(() => {
    if (!updateVersion) return;
    const timer = setTimeout(() => setUpdateVersion(null), 5000);
    return () => clearTimeout(timer);
  }, [updateVersion]);

  useEffect(() => {
    if (postContentRef.current && post?.content) {
      postContentRef.current.innerHTML = post.content;
    }
  }, [post?.content]);

  if (!visible && !updateVersion) return null;

  return (
    <>
      {updateVersion && (
        <div
          className="fmk-toast-animate fixed bottom-6 right-6 z-[2147483647] w-80 bg-white rounded-2xl overflow-hidden"
          style={{
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)",
          }}
        >
          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">
                  에펨코리아 미리보기 업데이트
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  v{updateVersion} — 대댓글, 미디어 임베드, UI 개선
                </p>
              </div>
              <button
                onClick={() => setUpdateVersion(null)}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div className="fmk-toast-progress h-1 bg-blue-500" />
        </div>
      )}
      {visible && (
        <div
          className="fmk-overlay-animate fixed inset-0 z-[2147483647] overflow-y-auto bg-black/50"
          onClick={closePreview}
          onScroll={() => setMemberPopup(null)}
        >
          <div className="flex min-h-full items-start justify-center py-8 px-6">
            <div
              className="fmk-modal-animate relative bg-white rounded-2xl w-full max-w-5xl my-auto overflow-hidden"
              style={{
                boxShadow:
                  "0 8px 48px rgba(0,0,0,0.28), 0 2px 12px rgba(0,0,0,0.16)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="flex items-start gap-4 px-9 py-6 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  {loading ? (
                    <div className="space-y-2.5">
                      <div className="h-5 bg-gray-200 rounded-full animate-pulse w-4/5" />
                      <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-1/3" />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2">
                        {post?.title}
                      </h2>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
                        {post?.author && (
                          <button
                            onClick={(e) => handleAuthorClick(post.authorMemberSrl, post.author, e)}
                            className={`font-medium text-gray-500 ${post.authorMemberSrl ? "hover:underline cursor-pointer" : "cursor-default"}`}
                          >
                            {post.author}
                          </button>
                        )}
                        {post?.date && <span>{post.date}</span>}
                        {post?.views && <span>{post.views}</span>}
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={closePreview}
                  className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* 본문 */}
              <div className="overflow-y-auto flex-1 min-h-0">
                {loading ? (
                  <div className="px-9 py-7 space-y-3">
                    {[100, 95, 100, 88, 70].map((w, i) => (
                      <div
                        key={i}
                        className="h-4 bg-gray-100 rounded-full animate-pulse"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <svg
                      className="w-10 h-10 mb-3 opacity-50"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                    <p className="text-sm">게시글을 불러오지 못했습니다.</p>
                  </div>
                ) : post ? (
                  <>
                    {/* 게시글 본문 */}
                    <div className="px-9 py-6">
                      <div
                        className="text-sm text-gray-800 leading-relaxed overflow-hidden [&_img]:max-w-full [&_img]:h-auto [&_img]:block [&_img]:mx-auto [&_img]:rounded-md [&_img]:my-2 [&_p]:my-1.5 [&_video]:max-w-full [&_video]:max-h-[480px] [&_video]:w-auto [&_iframe]:max-w-full"
                        ref={postContentRef}
                      />
                    </div>

                    {/* 추천/비추천 */}
                    <div className="flex justify-center py-8 border-y border-gray-100">
                      <div className="flex items-stretch rounded-full border border-gray-200 overflow-hidden shadow-sm">
                        <button
                          onClick={() => handleVote("up")}
                          className="flex items-center gap-2 px-7 py-3 text-sm font-semibold text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" /></svg>
                          추천
                        </button>
                        <div className="flex items-center px-6 border-x border-gray-200 bg-gray-50">
                          <span className="text-xl font-bold text-gray-800 tabular-nums">{voteCount}</span>
                        </div>
                        <button
                          onClick={() => handleVote("down")}
                          className="flex items-center gap-2 px-7 py-3 text-sm font-semibold text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.322-.41.74-.741 1.213-.924.227-.088.45-.205.6-.397.151-.193.302-.386.454-.578.302-.387.609-.807.793-1.249.242-.578.483-1.156.717-1.738.219-.545.464-1.105.64-1.667.136-.435.246-.877.32-1.32.08-.466.133-.938.17-1.413.042-.537.044-1.076.016-1.614a4.502 4.502 0 0 0-.293-1.39" /></svg>
                          비추천
                        </button>
                      </div>
                    </div>

                    {/* 댓글 */}
                    <div className="px-9 py-5" ref={commentSectionRef}>
                      <div className="flex items-center gap-2 py-3 border-b border-gray-200 mb-1">
                        <span className="text-sm font-bold text-gray-700">
                          댓글
                        </span>
                        <span className="text-sm font-bold text-blue-500">
                          {post.comments.length}
                        </span>
                        <span className="text-sm text-gray-400">개</span>
                      </div>

                      {post.comments.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">
                          댓글이 없습니다.
                        </p>
                      ) : (
                        <div
                          onClick={(e) => {
                            const link = (e.target as HTMLElement).closest(
                              "a.findParent",
                            ) as HTMLAnchorElement | null;
                            if (!link) return;
                            e.preventDefault();
                            const match = link
                              .getAttribute("href")
                              ?.match(/#comment_(\d+)/);
                            if (!match) return;
                            const el = (
                              e.currentTarget as HTMLElement
                            ).querySelector(`[data-comment-id="${match[1]}"]`);
                            el?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }}
                        >
                          {post.comments.map((comment) => (
                            <CommentItem
                              key={comment.id}
                              comment={comment}
                              voted={votedComments.has(comment.id)}
                              onVote={handleCommentVote}
                              onAuthorClick={handleAuthorClick}
                              onReply={(id) => {
                                setReplyingTo((prev) =>
                                  prev === id ? null : id,
                                );
                                setReplyText("");
                              }}
                              isReplying={replyingTo === comment.id}
                              replyText={replyText}
                              onReplyTextChange={setReplyText}
                              onReplySubmit={handleReplyPost}
                              replySubmitting={replySubmitting}
                              replyResult={replyResult}
                            />
                          ))}
                        </div>
                      )}

                      {/* 댓글 페이지네이션 */}
                      {post.totalCommentPages > 1 && (
                        <div className="flex items-center justify-center gap-1 py-3">
                          <button
                            onClick={() => handleCommentPageChange(1)}
                            disabled={
                              post.commentPage === 1 || commentPageLoading
                            }
                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            «
                          </button>
                          {(() => {
                            const total = post.totalCommentPages;
                            const cur = post.commentPage;
                            const pages: (number | "…")[] = [];
                            if (total <= 7) {
                              for (let i = 1; i <= total; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              const lo = Math.max(2, cur - 2);
                              const hi = Math.min(total - 1, cur + 2);
                              if (lo > 2) pages.push("…");
                              for (let i = lo; i <= hi; i++) pages.push(i);
                              if (hi < total - 1) pages.push("…");
                              pages.push(total);
                            }
                            return pages.map((p, i) =>
                              p === "…" ? (
                                <span
                                  key={`e${i}`}
                                  className="px-1 text-xs text-gray-400"
                                >
                                  …
                                </span>
                              ) : (
                                <button
                                  key={p}
                                  onClick={() =>
                                    handleCommentPageChange(p as number)
                                  }
                                  disabled={commentPageLoading}
                                  className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-medium transition-colors ${
                                    p === cur
                                      ? "bg-blue-500 text-white"
                                      : "text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                                  }`}
                                >
                                  {p}
                                </button>
                              ),
                            );
                          })()}
                          <button
                            onClick={() =>
                              handleCommentPageChange(post.totalCommentPages)
                            }
                            disabled={
                              post.commentPage === post.totalCommentPages ||
                              commentPageLoading
                            }
                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            »
                          </button>
                        </div>
                      )}

                      {/* 댓글 입력 */}
                      <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                              handleCommentPost();
                          }}
                          placeholder="댓글을 입력하세요..."
                          className="w-full px-4 pt-3 pb-2 text-sm resize-none focus:outline-none leading-relaxed min-h-[80px]"
                          rows={3}
                        />
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100">
                          <span
                            className={`text-xs ${
                              commentResult === "success"
                                ? "text-green-500"
                                : commentResult === "error"
                                  ? "text-red-400"
                                  : "text-gray-400"
                            }`}
                          >
                            {commentResult === "success"
                              ? "댓글이 등록되었습니다."
                              : commentResult === "error"
                                ? "댓글 등록에 실패했습니다."
                                : "Ctrl+Enter로 빠른 등록"}
                          </span>
                          <button
                            onClick={handleCommentPost}
                            disabled={submitting || !commentText.trim()}
                            className="px-5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-100 text-white disabled:text-gray-400 rounded-lg text-sm font-medium transition-colors"
                          >
                            {submitting ? "등록 중..." : "작성"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* 푸터 */}
              {!loading && !error && post && (
                <div className="shrink-0 flex items-center justify-between px-9 py-4 border-t border-gray-100 bg-gray-50">
                  <span className="text-xs text-gray-400">ESC로 닫기</span>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline"
                  >
                    원문 보기 →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 멤버 팝업 */}
          {memberPopup && (
            <div
              className="fixed z-[2147483648] bg-white border border-gray-300 shadow-lg py-1 min-w-[160px]"
              style={{ top: memberPopup.y, left: memberPopup.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <ul>
                {[
                  {
                    icon: "https://www.fmkorea.com/modules/communication/tpl/images/icon_write_message.gif",
                    label: "쪽지 보내기",
                    onClick: () => {
                      window.open(
                        `${BASE}/index.php?module=communication&act=dispCommunicationSendMessage&receiver_srl=${memberPopup.memberSrl}`,
                        "popup",
                        "width=500,height=500,scrollbars=yes",
                      );
                      setMemberPopup(null);
                    },
                  },
                  {
                    icon: "https://static.fmkorea.com/modules/member/tpl/images/icon_view_info.gif",
                    label: "회원 정보 보기",
                    onClick: () => {
                      window.open(
                        `${BASE}/index.php?mid=${post?.mid ?? "humor"}&act=dispMemberInfo&member_srl=${memberPopup.memberSrl}`,
                        "_blank",
                      );
                      setMemberPopup(null);
                    },
                  },
                  {
                    icon: "https://www.fmkorea.com/modules/member/tpl/images/icon_view_written.gif",
                    label: "작성 글 보기",
                    onClick: () => {
                      window.open(
                        `${BASE}/index.php?mid=${post?.mid ?? "humor"}&search_target=member_srl&search_keyword=${memberPopup.memberSrl}`,
                        "_blank",
                      );
                      setMemberPopup(null);
                    },
                  },
                  {
                    icon: "https://www.fmkorea.com/modules/blind/tpl/icon_blind.gif",
                    label: "블라인드(글,댓글)",
                    onClick: () => {
                      try {
                        (window as any).blind_click(
                          null,
                          memberPopup.memberSrl,
                          0,
                        );
                      } catch {}
                      setMemberPopup(null);
                    },
                  },
                  {
                    icon: "https://www.fmkorea.com/modules/blind/tpl/icon_blind.gif",
                    label: "블라인드(쪽지)",
                    onClick: () => {
                      try {
                        (window as any).blind_click(
                          null,
                          memberPopup.memberSrl,
                          1,
                        );
                      } catch {}
                      setMemberPopup(null);
                    },
                  },
                ].map(({ icon, label, onClick }) => (
                  <li key={label}>
                    <button
                      onClick={onClick}
                      className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-[#e8f0fe] text-left whitespace-nowrap"
                    >
                      <img
                        src={icon}
                        alt=""
                        className="w-4 h-4 object-contain shrink-0"
                      />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function CommentItem({
  comment,
  voted,
  onVote,
  onAuthorClick,
  onReply,
  isReplying,
  replyText,
  onReplyTextChange,
  onReplySubmit,
  replySubmitting,
  replyResult,
}: {
  comment: Comment;
  voted: boolean;
  onVote: (type: "up" | "down", id: string) => void;
  onAuthorClick: (
    memberSrl: string,
    author: string,
    e: React.MouseEvent,
  ) => void;
  onReply: (id: string) => void;
  isReplying: boolean;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onReplySubmit: () => void;
  replySubmitting: boolean;
  replyResult: "success" | "error" | null;
}) {
  return (
    <div
      data-comment-id={comment.id}
      className={`py-4 px-2 border-b border-gray-200 last:border-0 ${
        comment.isReply
          ? "pl-6 ml-4 border-l-2 border-l-gray-300 bg-gray-50"
          : comment.isBest
            ? "bg-blue-50/50"
            : ""
      }`}
    >
      <div className="flex gap-3">
        {comment.isReply && (
          <span className="text-gray-300 text-sm shrink-0 mt-0.5 leading-none">
            ↳
          </span>
        )}
        {comment.levelIcon ? (
          <img
            src={comment.levelIcon}
            alt=""
            className="w-7 h-7 shrink-0 mt-0.5 object-contain"
          />
        ) : (
          <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full bg-gray-200" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {comment.isBest && (
              <span className="text-[10px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded leading-none shrink-0">
                BEST
              </span>
            )}
            <button
              onClick={(e) =>
                onAuthorClick(comment.memberSrl, comment.author, e)
              }
              className={`text-sm font-semibold text-[#4878b8] leading-none ${comment.memberSrl ? "hover:underline cursor-pointer" : "cursor-default"}`}
            >
              {comment.author}
            </button>
            <span className="text-xs text-gray-500 leading-none">
              {comment.date}
            </span>
          </div>
          <div
            className="text-sm text-gray-900 leading-relaxed [&_img]:max-w-full [&_img]:rounded [&_a]:text-blue-500 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: comment.content }}
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => onVote("up", comment.id)}
              disabled={voted}
              className={`flex items-center gap-1 text-xs font-medium transition-colors px-2 py-0.5 rounded ${
                voted
                  ? "text-gray-300 bg-gray-50"
                  : "text-gray-500 hover:text-blue-500 hover:bg-blue-50"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
              </svg>
              <span>{comment.voteUp > 0 ? comment.voteUp : "추천"}</span>
            </button>
            <button
              onClick={() => onVote("down", comment.id)}
              disabled={voted}
              className={`flex items-center gap-1 text-xs font-medium transition-colors px-2 py-0.5 rounded ${
                voted
                  ? "text-gray-300 bg-gray-50"
                  : "text-gray-500 hover:text-red-400 hover:bg-red-50"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.322-.41.74-.741 1.213-.924.227-.088.45-.205.6-.397.151-.193.302-.386.454-.578.302-.387.609-.807.793-1.249.242-.578.483-1.156.717-1.738.219-.545.464-1.105.64-1.667.136-.435.246-.877.32-1.32.08-.466.133-.938.17-1.413.042-.537.044-1.076.016-1.614a4.502 4.502 0 0 0-.293-1.39" />
              </svg>
              <span>{comment.voteDown > 0 ? comment.voteDown : "비추"}</span>
            </button>
            <button
              onClick={() => onReply(comment.id)}
              className={`flex items-center gap-1 text-xs font-medium transition-colors px-2 py-0.5 rounded ${
                isReplying
                  ? "text-blue-500 bg-blue-50"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6 6-6"
                />
              </svg>
              <span>답글</span>
            </button>
          </div>
        </div>
      </div>

      {isReplying && (
        <div className="mt-3 ml-10 border border-blue-200 rounded-xl overflow-hidden">
          <textarea
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                onReplySubmit();
            }}
            placeholder="답글을 입력하세요..."
            className="w-full px-4 pt-3 pb-2 text-sm resize-none focus:outline-none leading-relaxed min-h-[72px]"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50/50 border-t border-blue-100">
            <span
              className={`text-xs ${
                replyResult === "success"
                  ? "text-green-500"
                  : replyResult === "error"
                    ? "text-red-400"
                    : "text-gray-400"
              }`}
            >
              {replyResult === "success"
                ? "답글이 등록되었습니다."
                : replyResult === "error"
                  ? "답글 등록에 실패했습니다."
                  : "Ctrl+Enter로 빠른 등록"}
            </span>
            <button
              onClick={onReplySubmit}
              disabled={replySubmitting || !replyText.trim()}
              className="px-5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-100 text-white disabled:text-gray-400 rounded-lg text-sm font-medium transition-colors"
            >
              {replySubmitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
