import type { ApiContract } from "@solivio/sdk/contracts";

import { offerRoutesAfterRevisions, offerRoutesBeforeRevisions } from "./offer.ts";
import { offerRevisionRoutes } from "./offer-revision.ts";

export const routes = [
  ...offerRoutesBeforeRevisions,
  ...offerRevisionRoutes,
  ...offerRoutesAfterRevisions,
] as const satisfies readonly ApiContract[];
