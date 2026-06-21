export type CommentAuthor = {
  id: string;
  username: string;
  isAdmin?: boolean;
  cultivation: {
    level: number;
    realm: string;
    realmStage: number;
    realmImageKey: string;
  };
};

export type ChapterComment = {
  id: string;
  parentId: string | null;
  contentText: string;
  createdAt: string;
  author: CommentAuthor;
};

export type CommentsResponse = {
  items: ChapterComment[];
  replies: ChapterComment[];
};
