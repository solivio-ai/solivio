import type { ApiContract } from "./common";
import { requestRoutes } from "./customer-request";
import { offerRoutesAfterRevisions, offerRoutesBeforeRevisions } from "./offer";
import { chatRoutes } from "./offer-chat";
import { documentRoutes } from "./offer-pdf";
import { offerRevisionRoutes } from "./offer-revision";
import { productRoutes } from "./product";
import { systemRoutes } from "./system";

export const apiContracts = [
  ...systemRoutes,
  ...productRoutes,
  ...requestRoutes,
  ...offerRoutesBeforeRevisions,
  ...offerRevisionRoutes,
  ...offerRoutesAfterRevisions,
  ...chatRoutes,
  ...documentRoutes,
] as const satisfies readonly ApiContract[];
