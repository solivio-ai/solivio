import { defineLegacyModule } from "@solivio/sdk";

import { createOfferTools } from "./tools.js";

export default defineLegacyModule({
  id: "offer-tools",
  name: "Offer Tools",
  version: "0.1.0",
  register(ctx) {
    return {
      agentTools: createOfferTools(ctx.services),
    };
  },
});
