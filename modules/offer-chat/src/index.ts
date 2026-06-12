import { defineModule } from "@solivio/sdk";

export default defineModule({
  id: "offer-chat",
  title: "Offer Chat",
  version: "0.1.0",
  description: "Offer review chat threads, messages, the salesperson copilot, and chat UI.",
  dependsOn: ["offers"],
});
