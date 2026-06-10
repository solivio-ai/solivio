import { defineModule } from "@solivio/sdk";

export default defineModule({
  id: "offers",
  title: "Offers",
  version: "0.1.0",
  description: "Offer drafts, line items, revisions, PDF rendering, and generation agents.",
  dependsOn: ["catalog", "customers"],
});
