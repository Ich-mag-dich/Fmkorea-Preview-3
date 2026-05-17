import type {
  AuthorClickHandler,
  Comment,
  CommentVoteType,
  SubmitResult,
} from "../types";

interface CommentItemProps {
  comment: Comment;
  voted: boolean;
  onVote: (type: CommentVoteType, id: string) => void;
  onAuthorClick: AuthorClickHandler;
  onReply: (id: string) => void;
  isReplying: boolean;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onReplySubmit: () => void;
  replySubmitting: boolean;
  replyResult: SubmitResult;
}

function ThumbUpIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
    </svg>
  );
}

function ThumbDownIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.322-.41.74-.741 1.213-.924.227-.088.45-.205.6-.397.151-.193.302-.386.454-.578.302-.387.609-.807.793-1.249.242-.578.483-1.156.717-1.738.219-.545.464-1.105.64-1.667.136-.435.246-.877.32-1.32.08-.466.133-.938.17-1.413.042-.537.044-1.076.016-1.614a4.502 4.502 0 0 0-.293-1.39" />
    </svg>
  );
}

function ReplyIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
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
  );
}

export function CommentItem({
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
}: CommentItemProps) {
  return (
    <div
      data-comment-id={comment.id}
      className={`fmk-comment-card px-4 py-3 ${
        comment.isReply ? "fmk-comment-card-reply" : ""
      } ${comment.isBest ? "fmk-comment-card-best" : ""} ${
        comment.isWriter ? "fmk-comment-card-writer" : ""
      }`}
    >
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            {comment.isBest && (
              <span className="fmk-best-badge shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none">
                BEST
              </span>
            )}
            <button
              onClick={(e) =>
                onAuthorClick(comment.memberSrl, comment.author, e)
              }
              className={`fmk-focus-ring inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-[#4878b8] leading-none ${comment.memberSrl ? "cursor-pointer hover:underline" : "cursor-default"}`}
            >
              {comment.levelIcon && (
                <img
                  src={comment.levelIcon}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded-sm object-contain"
                />
              )}
              {comment.userIcon && (
                <img
                  src={comment.userIcon}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded-sm object-contain"
                />
              )}
              {comment.author}
            </button>
            <span className="text-xs leading-none text-gray-500">
              {comment.date}
            </span>
          </div>
          <div
            className={`fmk-comment-content min-w-0 max-w-full text-sm leading-relaxed [&_a]:text-blue-500 [&_a]:underline [&_img]:max-w-full [&_img]:rounded ${
              comment.isWriter ? "text-blue-600" : "text-gray-900"
            }`}
            dangerouslySetInnerHTML={{ __html: comment.content }}
          />
          <div className="mt-2 flex items-center gap-2.5">
            <button
              onClick={() => onVote("up", comment.id)}
              disabled={voted}
              className={`fmk-focus-ring flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                voted
                  ? "bg-gray-50 text-gray-300"
                  : "text-gray-500 hover:bg-blue-50/70 hover:text-blue-500"
              }`}
            >
              <ThumbUpIcon className="h-3.5 w-3.5" />
              <span>{comment.voteUp > 0 ? comment.voteUp : "추천"}</span>
            </button>
            <button
              onClick={() => onVote("down", comment.id)}
              disabled={voted}
              className={`fmk-focus-ring flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                voted
                  ? "bg-gray-50 text-gray-300"
                  : "text-gray-500 hover:bg-red-50/70 hover:text-red-400"
              }`}
            >
              <ThumbDownIcon className="h-3.5 w-3.5" />
              <span>{comment.voteDown > 0 ? comment.voteDown : "비추"}</span>
            </button>
            <button
              onClick={() => onReply(comment.id)}
              className={`fmk-focus-ring flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                isReplying
                  ? "bg-blue-50/80 text-blue-500"
                  : "text-gray-400 hover:bg-gray-100/70 hover:text-gray-600"
              }`}
            >
              <ReplyIcon className="h-3.5 w-3.5" />
              <span>답글</span>
            </button>
          </div>
        </div>
      </div>

      {isReplying && (
        <div className="ml-0 mt-3 overflow-hidden rounded-xl border border-blue-200/90 bg-white/70 shadow-sm sm:ml-10">
          <textarea
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                onReplySubmit();
            }}
            placeholder="답글을 입력하세요..."
            className="min-h-[76px] w-full resize-none bg-white/50 px-4 pb-2 pt-3 text-sm leading-relaxed text-gray-800 placeholder:text-gray-400 focus:outline-none"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-between border-t border-blue-100 bg-blue-50/60 px-4 py-2">
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
              className="fmk-focus-ring rounded-lg bg-blue-500 px-5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {replySubmitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
