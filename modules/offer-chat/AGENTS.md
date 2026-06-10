# offer-chat module

Owns the offer review chat domain: threads + messages, the salesperson copilot
agent (chatAgent), and the streaming + thread HTTP routes. The chat PANEL UI
lives in the offers module (it integrates imperatively with the offer review
screen); it talks to this module over HTTP only.

- **Tables (owned):** `offer_chat_threads`, `offer_chat_messages` (own journal).
  `offer_id` is an id-only reference to the offers module.
- **Routes:** `POST /api/chat` (streaming — preserve setWaitUntil/after wiring
  and segment config), `/api/offers/[offerId]/chat/threads/**`.
- **Agent:** `src/ai/chatAgent.ts` builds the copilot from the merged agent-tool
  registry (`getAgentTools()` from @solivio/sdk/runtime).
- Consumes the offers service (getOffer/getDraft) for chat context; the type
  comes from the sanctioned type-only import of
  `@solivio/module-offers/services.ts` in `src/service-deps.ts`.
- After changes: `yarn generate && yarn check && yarn typecheck`.
