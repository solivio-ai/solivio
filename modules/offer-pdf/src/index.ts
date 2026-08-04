import { defineModule } from "@solivio/sdk";

export default defineModule({
  id: "offer-pdf",
  title: "Offer PDF",
  version: "0.1.0",
  description:
    "PDF channel for the offer target: renders a finalized offer into a document and shows it on the accepted-offer screen.",
  // Rendering runs on the server, so it needs a route; that route takes an id and
  // re-fetches rather than trusting the offer its slot components already hold
  // client-side. Re-fetching is what requires the offers service.
  dependsOn: ["offers"],
});
