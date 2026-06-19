import type {} from "@solivio/sdk";

declare module "@solivio/sdk" {
  interface Events {
    "knowledge-base.space.created": { spaceId: string };
    "knowledge-base.article.created": { articleId: string; spaceId: string };
    "knowledge-base.article.updated": { articleId: string; spaceId: string };
    "knowledge-base.import.completed": { spaceId: string; upserted: number; errors: number };
    "knowledge-base.article.indexed": { articleId: string };
  }
}
