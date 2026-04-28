import "server-only";

const DEFAULT_OPENAI_MODEL = "openai/gpt-5.4-mini";

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
}
