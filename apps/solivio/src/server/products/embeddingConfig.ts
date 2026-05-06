import "server-only";

import type { EmbeddingModelId } from "./embeddingModels";
import { EMBEDDING_MODELS } from "./embeddingModels";

const DEFAULT_EMBEDDING_MODEL: EmbeddingModelId = "text-embedding-3-large";

const VALID_IDS = new Set<string>(EMBEDDING_MODELS.map((m) => m.id));

export function getDefaultEmbeddingModel(): EmbeddingModelId {
  const fromEnv = process.env.EMBEDDING_MODEL?.trim();
  if (fromEnv && VALID_IDS.has(fromEnv)) return fromEnv as EmbeddingModelId;
  return DEFAULT_EMBEDDING_MODEL;
}
