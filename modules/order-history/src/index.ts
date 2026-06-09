import { defineModule } from "@solivio/sdk";

import { createOrderHistoryTools } from "./tools.js";

export default defineModule({
  id: "order-history",
  name: "Order History",
  version: "0.1.0",
  register(ctx) {
    return {
      agentTools: createOrderHistoryTools(ctx.services),
    };
  },
});
