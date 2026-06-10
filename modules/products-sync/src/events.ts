// This file must be a module (the import below) so the declaration AUGMENTS
// the SDK's Events interface instead of replacing the module type.
import type {} from "@solivio/sdk";

declare module "@solivio/sdk" {
  interface Events {
    "products-sync.run.completed": { runId: string; imported: number };
  }
}
