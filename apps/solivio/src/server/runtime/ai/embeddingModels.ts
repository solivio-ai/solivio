export const EMBEDDING_MODELS = [
  { id: "text-embedding-3-large", label: "text-embedding-3-large", dimensions: 3072 },
  { id: "text-embedding-3-small", label: "text-embedding-3-small (legacy)", dimensions: 1536 },
] as const;

export type EmbeddingModelId = (typeof EMBEDDING_MODELS)[number]["id"];
