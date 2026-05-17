import type { MouseEvent } from "react";

export interface Comment {
  id: string;
  author: string;
  levelIcon: string;
  userIcon: string;
  memberSrl: string;
  date: string;
  content: string;
  voteUp: number;
  voteDown: number;
  isReply: boolean;
  isBest: boolean;
  isWriter: boolean;
}

export interface MemberPopup {
  memberSrl: string;
  author: string;
  x: number;
  y: number;
}

export interface PostData {
  title: string;
  author: string;
  date: string;
  views: string;
  content: string;
  url: string;
  docId: string;
  authorMemberSrl: string;
  authorLevelIcon: string;
  authorUserIcon: string;
  voteRid: string;
  voteCount: number;
  comments: Comment[];
  mid: string;
  commentPage: number;
  totalCommentPages: number;
}

export type SubmitResult = "success" | "error" | null;

export type CommentVoteType = "up" | "down";

export type AuthorClickHandler = (
  memberSrl: string,
  author: string,
  event: MouseEvent,
) => void;
