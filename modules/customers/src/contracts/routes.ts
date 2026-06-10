import type { ApiContract } from "@solivio/sdk/contracts";

import { customerRoutes } from "./customer.ts";
import { requestRoutes } from "./customer-request.ts";

export const routes = [
  ...customerRoutes,
  ...requestRoutes,
] as const satisfies readonly ApiContract[];
