import type { ApiContract } from "@solivio/sdk/contracts";

import { offerRoutesAfterRevisions, offerRoutesBeforeRevisions } from "./offer.ts";
import { documentRoutes } from "./offer-pdf.ts";
import { offerRevisionRoutes } from "./offer-revision.ts";

export const routes = [
  ...offerRoutesBeforeRevisions,
  ...offerRevisionRoutes,
  ...offerRoutesAfterRevisions,
  ...documentRoutes,
] as const satisfies readonly ApiContract[];
