export const EMBEDDING_MODELS = [
  { id: "text-embedding-3-small", label: "text-embedding-3-small", dimensions: 1536 },
  { id: "text-embedding-ada-002", label: "text-embedding-ada-002 (legacy)", dimensions: 1536 },
] as const;

export type EmbeddingModelId = (typeof EMBEDDING_MODELS)[number]["id"];
