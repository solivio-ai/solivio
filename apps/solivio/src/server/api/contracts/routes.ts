import { moduleApiContracts } from "../../../generated/contracts";
import type { ApiContract } from "./common";
import { offerRoutesAfterRevisions, offerRoutesBeforeRevisions } from "./offer";
import { chatRoutes } from "./offer-chat";
import { documentRoutes } from "./offer-pdf";
import { offerRevisionRoutes } from "./offer-revision";
import { productRoutes } from "./product";
import { systemRoutes } from "./system";

export const apiContracts = [
  ...systemRoutes,
  ...moduleApiContracts,
  ...productRoutes,
  ...offerRoutesBeforeRevisions,
  ...offerRevisionRoutes,
  ...offerRoutesAfterRevisions,
  ...chatRoutes,
  ...documentRoutes,
] as const satisfies readonly ApiContract[];
