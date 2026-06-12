// Type-side wiring for this module's `dependsOn`: pulls the Services
// augmentations of dependency modules into the standalone typecheck program.
// Type-only — erased at runtime; runtime calls still go through getService().
import type {} from "@solivio/module-offers/services.ts";
