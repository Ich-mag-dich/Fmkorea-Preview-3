import { useEffect, useRef, useState } from "react";

import {
  fetchCommentPage,
  fetchPost,
  submitComment,
  voteComment,
  voteDocument,
} from "./api/fmkorea-api";
import { CommentItem } from "./components/CommentItem";
import { MemberPopupMenu } from "./components/MemberPopupMenu";
import { UpdateToast } from "./components/UpdateToast";
import { historyManager } from "./lib/history-manager";
import { hidePageScrollbar, restorePageScrollbar } from "./lib/page-scrollbar";
import { getPreviewLink } from "./lib/preview-link";
import type {
  AuthorClickHandler,
  CommentVoteType,
  MemberPopup,
  PostData,
  SubmitResult,
} from "./types";

const parseCommentAnchor = (href: string | null | undefined) =>
  href?.match(/#comment_(\d+)/)?.[1] ?? null;

export default function FmkoreaPreview() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const commentSectionRef = useRef<HTMLDivElement>(null);
  const postContentRef = useRef<HTMLDivElement>(null);
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentResult, setCommentResult] = useState<SubmitResult>(null);
  const [votedComments, setVotedComments] = useState<Set<string>>(new Set());
  const [memberPopup, setMemberPopup] = useState<MemberPopup | null>(null);
  const [commentPageLoading, setCommentPageLoading] = useState(false);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyResult, setReplyResult] = useState<SubmitResult>(null);

  const handleCommentPageChange = async (page: number) => {
    if (!post || page === post.commentPage || commentPageLoading) return;
    setCommentPageLoading(true);
    try {
      const pageData = await fetchCommentPage(post, page);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comments: pageData.comments,
              commentPage: pageData.commentPage,
              totalCommentPages: Math.max(
                prev.totalCommentPages,
                pageData.totalCommentPages,
              ),
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

  const handleAuthorClick: AuthorClickHandler = (memberSrl, author, event) => {
    if (!memberSrl) return;
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const overlayRect = overlayRef.current?.getBoundingClientRect();
    const scrollTop = overlayRef.current?.scrollTop ?? 0;
    const overlayLeft = overlayRect?.left ?? 0;
    const overlayTop = overlayRect?.top ?? 0;
    const x = Math.max(
      8,
      Math.min(rect.left - overlayLeft, window.innerWidth - 208),
    );
    const y = rect.bottom - overlayTop + scrollTop + 6;
    setMemberPopup((prev) =>
      prev?.memberSrl === memberSrl ? null : { memberSrl, author, x, y },
    );
  };

  const handleVote = async (type: CommentVoteType) => {
    if (!post?.docId) return;
    try {
      const ok = await voteDocument(post, type);
      if (ok) setVoteCount((c) => c + 1);
    } catch {}
  };

  const handleCommentVote = async (
    type: CommentVoteType,
    commentId: string,
  ) => {
    if (votedComments.has(commentId)) return;
    try {
      const votedCount = await voteComment(commentId, type);
      if (votedCount === null) return;

      setVotedComments((prev) => new Set([...prev, commentId]));
      setPost((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          comments: prev.comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  voteUp: type === "up" ? (votedCount ?? c.voteUp + 1) : c.voteUp,
                  voteDown:
                    type === "down" ? (votedCount ?? c.voteDown + 1) : c.voteDown,
                }
              : c,
          ),
        };
      });
    } catch {}
  };

  const handleCommentPost = async () => {
    if (!post?.docId || !commentText.trim() || submitting) return;
    setSubmitting(true);
    const content = commentText.trim();

    try {
      const newComment = await submitComment({ post, content });
      if (newComment) {
        setPost((prev) =>
          prev ? { ...prev, comments: [...prev.comments, newComment] } : prev,
        );
        setCommentText("");
      }
      setCommentResult(newComment ? "success" : "error");
    } catch {
      setCommentResult("error");
    } finally {
      setSubmitting(false);
      setTimeout(() => setCommentResult(null), 3000);
    }
  };

  const handleReplyPost = async () => {
    if (!post?.docId || !replyText.trim() || replySubmitting || !replyingTo)
      return;
    setReplySubmitting(true);
    const content = replyText.trim();

    try {
      const newReply = await submitComment({
        post,
        content,
        parentSrl: replyingTo,
      });
      if (newReply) {
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
      setReplyResult(newReply ? "success" : "error");
    } catch {
      setReplyResult("error");
    } finally {
      setReplySubmitting(false);
      setTimeout(() => setReplyResult(null), 3000);
    }
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
    if (!visible) return;
    hidePageScrollbar();
    return restorePageScrollbar;
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
        <UpdateToast
          version={updateVersion}
          onClose={() => setUpdateVersion(null)}
        />
      )}
      {visible && (
        <div
          ref={overlayRef}
          className="fmk-overlay-animate fmk-overlay-surface fixed inset-0 z-[2147483647] overflow-y-auto"
          onClick={closePreview}
          onScroll={() => setMemberPopup(null)}
        >
          <div className="flex min-h-full items-start justify-center px-4 py-6 sm:px-6 sm:py-8">
            <div
              className="fmk-modal-animate fmk-preview-modal relative my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/80 backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="fmk-preview-header flex items-start gap-4 border-b border-gray-300/70 px-6 py-5 backdrop-blur-xl sm:px-9">
                <div className="min-w-0 flex-1">
                  {loading ? (
                    <div className="space-y-2.5">
                      <div className="h-5 w-4/5 animate-pulse rounded-full bg-gray-200" />
                      <div className="h-3.5 w-1/3 animate-pulse rounded-full bg-gray-100" />
                    </div>
                  ) : (
                    <>
                      <h2 className="line-clamp-2 text-xl font-bold leading-snug tracking-normal text-gray-950">
                        {post?.title}
                      </h2>
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {post?.author && (
                          <button
                            onClick={(e) =>
                              handleAuthorClick(
                                post.authorMemberSrl,
                                post.author,
                                e,
                              )
                            }
                            className={`fmk-focus-ring inline-flex items-center gap-1.5 rounded-md font-semibold text-gray-700 transition-colors ${post.authorMemberSrl ? "cursor-pointer hover:text-blue-500 hover:underline" : "cursor-default"}`}
                          >
                            {post.authorLevelIcon && (
                              <img
                                src={post.authorLevelIcon}
                                alt=""
                                className="h-4 w-4 shrink-0 object-contain"
                              />
                            )}
                            {post.authorUserIcon && (
                              <img
                                src={post.authorUserIcon}
                                alt=""
                                className="h-4 w-4 shrink-0 object-contain"
                              />
                            )}
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
                  className="fmk-focus-ring shrink-0 rounded-full border border-gray-200/80 bg-white/70 p-2 text-gray-400 shadow-sm transition-colors hover:border-gray-300 hover:bg-white hover:text-gray-600"
                >
                  <svg
                    className="h-5 w-5"
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

              <div className="min-h-0 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="space-y-3 px-6 py-7 sm:px-9">
                    {[100, 95, 100, 88, 70].map((w, i) => (
                      <div
                        key={i}
                        className="h-4 animate-pulse rounded-full bg-gray-100"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <svg
                      className="mb-3 h-10 w-10 opacity-50"
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
                    <div className="px-6 py-7 sm:px-9">
                      <div
                        className="fmk-post-content overflow-hidden [&_iframe]:max-w-full [&_img]:mx-auto [&_img]:my-3 [&_img]:block [&_img]:h-auto [&_img]:w-auto [&_img]:[max-width:min(600px,100%)] [&_img]:rounded-lg [&_p]:my-2 [&_video]:max-h-[480px] [&_video]:max-w-full [&_video]:w-auto"
                        ref={postContentRef}
                      />
                    </div>

                    <div className="fmk-vote-strip flex justify-center border-y border-white/70 py-8">
                      <div className="fmk-vote-capsule flex items-stretch overflow-hidden rounded-full backdrop-blur-md">
                        <button
                          onClick={() => handleVote("up")}
                          className="fmk-focus-ring flex items-center gap-2 px-7 py-3 text-sm font-semibold text-blue-500 transition-colors hover:bg-blue-50/90"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
                          </svg>
                          추천
                        </button>
                        <div className="fmk-vote-count flex min-w-[72px] items-center justify-center px-6">
                          <span className="text-xl font-bold tabular-nums text-gray-800">
                            {voteCount}
                          </span>
                        </div>
                        <button
                          onClick={() => handleVote("down")}
                          className="fmk-focus-ring flex items-center gap-2 px-7 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-50/90"
                        >
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.322-.41.74-.741 1.213-.924.227-.088.45-.205.6-.397.151-.193.302-.386.454-.578.302-.387.609-.807.793-1.249.242-.578.483-1.156.717-1.738.219-.545.464-1.105.64-1.667.136-.435.246-.877.32-1.32.08-.466.133-.938.17-1.413.042-.537.044-1.076.016-1.614a4.502 4.502 0 0 0-.293-1.39" />
                          </svg>
                          비추천
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-5 sm:px-9" ref={commentSectionRef}>
                      <div className="mb-2 flex items-center gap-2 border-b border-gray-300/80 py-3">
                        <span className="text-sm font-bold text-gray-700">
                          댓글
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-500">
                          {post.comments.length}
                        </span>
                        <span className="text-sm text-gray-400">개</span>
                      </div>

                      {post.comments.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">
                          댓글이 없습니다.
                        </p>
                      ) : (
                        <div
                          className="space-y-2"
                          onClick={(e) => {
                            const link = (e.target as HTMLElement).closest(
                              "a.findParent",
                            ) as HTMLAnchorElement | null;
                            if (!link) return;
                            e.preventDefault();
                            const commentId = parseCommentAnchor(
                              link.getAttribute("href"),
                            );
                            if (!commentId) return;
                            const el = (
                              e.currentTarget as HTMLElement
                            ).querySelector(`[data-comment-id="${commentId}"]`);
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

                      {post.totalCommentPages > 1 && (
                        <div className="flex items-center justify-center gap-1 py-3">
                          <button
                            onClick={() => handleCommentPageChange(1)}
                            disabled={
                              post.commentPage === 1 || commentPageLoading
                            }
                            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            처음
                          </button>
                          {(() => {
                            const total = post.totalCommentPages;
                            const cur = post.commentPage;
                            const pages: (number | "...")[] = [];
                            if (total <= 7) {
                              for (let i = 1; i <= total; i++) pages.push(i);
                            } else {
                              pages.push(1);
                              const lo = Math.max(2, cur - 2);
                              const hi = Math.min(total - 1, cur + 2);
                              if (lo > 2) pages.push("...");
                              for (let i = lo; i <= hi; i++) pages.push(i);
                              if (hi < total - 1) pages.push("...");
                              pages.push(total);
                            }
                            return pages.map((p, i) =>
                              p === "..." ? (
                                <span
                                  key={`e${i}`}
                                  className="px-1 text-xs text-gray-400"
                                >
                                  ...
                                </span>
                              ) : (
                                <button
                                  key={p}
                                  onClick={() =>
                                    handleCommentPageChange(p as number)
                                  }
                                  disabled={commentPageLoading}
                                  className={`h-7 min-w-[28px] rounded px-1.5 text-xs font-medium transition-colors ${
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
                            끝
                          </button>
                        </div>
                      )}

                      <div
                        className="mt-5 overflow-hidden rounded-xl border border-gray-300/90 bg-white/75 backdrop-blur-md transition-colors focus-within:border-blue-300/90"
                        style={{
                          boxShadow:
                            "0 10px 26px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.88)",
                        }}
                      >
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                              handleCommentPost();
                          }}
                          placeholder="댓글을 입력하세요..."
                          className="min-h-[96px] w-full resize-none bg-white/45 px-4 pb-2 pt-3 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:outline-none"
                          rows={3}
                        />
                        <div className="flex items-center justify-between border-t border-gray-200/90 bg-slate-50/80 px-4 py-2">
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
                            className="fmk-focus-ring rounded-lg bg-blue-500 px-5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            {submitting ? "등록 중..." : "작성"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {!loading && !error && post && (
                <div className="flex shrink-0 items-center justify-between border-t border-white/70 bg-white/40 px-6 py-4 backdrop-blur-md sm:px-9">
                  <span className="text-xs text-gray-400">ESC로 닫기</span>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noreferrer"
                    className="fmk-focus-ring rounded text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline"
                  >
                    원문 보기 →
                  </a>
                </div>
              )}
            </div>
          </div>

          {memberPopup && (
            <MemberPopupMenu
              popup={memberPopup}
              post={post}
              onClose={() => setMemberPopup(null)}
            />
          )}
        </div>
      )}
    </>
  );
}
