import "server-only";

// Per-role model routing. Quality-critical roles use a top-tier model;
// cheap roles (short outputs, low-stakes reasoning) use a smaller one.
// Override per-role via OPENAI_MODEL_<ROLE> env vars.

export type AgentRole =
  | "offerGeneration"
  | "offerValidation"
  | "offerName"
  | "chat"
  | "productSearch";

const ROLE_DEFAULTS: Record<AgentRole, string> = {
  offerGeneration: "openai/gpt-5.5",
  offerValidation: "openai/gpt-5.4-mini",
  offerName: "openai/gpt-5.4-nano",
  chat: "openai/gpt-5.4-mini",
  productSearch: "openai/gpt-5.4-nano",
};

const ROLE_ENV_KEYS: Record<AgentRole, string> = {
  offerGeneration: "OPENAI_MODEL_OFFER_GENERATION",
  offerValidation: "OPENAI_MODEL_OFFER_VALIDATION",
  offerName: "OPENAI_MODEL_OFFER_NAME",
  chat: "OPENAI_MODEL_CHAT",
  productSearch: "OPENAI_MODEL_PRODUCT_SEARCH",
};

export function getModelFor(role: AgentRole): string {
  const override = process.env[ROLE_ENV_KEYS[role]]?.trim();
  return override || ROLE_DEFAULTS[role];
}
