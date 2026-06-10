import { defineModule } from "@solivio/sdk";

export default defineModule({
  id: "order-history",
  title: "Order History",
  version: "0.1.0",
  description: "Lets the copilot and offer-generation agents recall a customer's past orders.",
  dependsOn: ["offers"],
});
