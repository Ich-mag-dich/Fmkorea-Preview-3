import { BASE_URL } from "../constants";
import type { Comment, PostData } from "../types";
import { absolutizeMedia, cleanContent } from "./media";

export const extractAuthorText = (memberPlate: Element | null): string => {
  if (!memberPlate) return "알 수 없음";
  const textNode = Array.from(memberPlate.childNodes)
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent?.trim())
    .filter(Boolean)
    .join("");
  return textNode || "알 수 없음";
};

export const fixIconUrl = (src: string | null | undefined): string => {
  if (!src) return "";
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `${BASE_URL}${src}`;
  return src;
};

export const parsePagination = (
  doc: Document,
): { currentPage: number; totalPages: number } => {
  const allPgDivs = Array.from(doc.querySelectorAll(".bd_pg"));
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

export const parseComments = (doc: Document): Comment[] => {
  const items = doc.querySelectorAll("ul.fdb_lst_ul > li");
  return Array.from(items).flatMap((li): Comment[] => {
    const id = li.id?.replace("comment_", "") ?? "";
    if (!id || li.querySelector(".fdb_delete")) return [];

    const contentWrap = li.querySelector(".comment-content");
    const contentEl = contentWrap?.querySelector(".xe_content") ?? contentWrap;
    if (contentEl) {
      absolutizeMedia(contentEl);
      contentEl
        .querySelectorAll("a[onclick]")
        .forEach((a) => a.removeAttribute("onclick"));
    }

    const memberPlate = li.querySelector(".member_plate");
    const levelImg = memberPlate?.querySelector("img.level");
    const userIconImg = memberPlate?.querySelector("img.icon");
    const memberClass = Array.from(memberPlate?.classList ?? []).find((c) =>
      /^member_\d+$/.test(c),
    );
    const memberSrl = memberClass?.replace("member_", "") ?? "";

    return [
      {
        id,
        author: extractAuthorText(memberPlate),
        levelIcon: fixIconUrl(levelImg?.getAttribute("src")),
        userIcon: fixIconUrl(userIconImg?.getAttribute("src")),
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
        isWriter: contentWrap?.classList.contains("document_writer") ?? false,
      },
    ];
  });
};

export const parsePostDocument = (url: string, doc: Document): PostData => {
  const title =
    doc.querySelector(".np_18px_span")?.textContent?.trim() ?? "제목 없음";
  const authorPlate = doc.querySelector(".member_plate");
  const author = extractAuthorText(authorPlate);
  const authorLevelIcon = fixIconUrl(
    authorPlate?.querySelector("img.level")?.getAttribute("src"),
  );
  const authorUserIcon = fixIconUrl(
    authorPlate?.querySelector("img.icon")?.getAttribute("src"),
  );
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
      .replace(`${BASE_URL}/`, "")
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
  contentEl ??= doc.querySelector(".xe_content") ?? doc.querySelector(".rd_body");

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
    authorLevelIcon,
    authorUserIcon,
    voteRid,
    voteCount,
    comments: parseComments(doc),
    mid,
    commentPage: pagination.currentPage,
    totalCommentPages: pagination.totalPages,
  };
};
