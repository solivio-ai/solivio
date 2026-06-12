import type { ApiContract } from "@solivio/sdk/contracts";

import { productRoutes } from "./product.ts";

export const routes = [...productRoutes] as const satisfies readonly ApiContract[];
