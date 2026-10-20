import { defineModule } from "@solivio/sdk";

export default defineModule({
  id: "project-scoping",
  title: "Project Scoping",
  version: "0.1.0",
  description:
    "Expands project-style requests (a house, a room, an installation) into an approximate item list using the knowledge base.",
  dependsOn: ["knowledge-base"],
});
