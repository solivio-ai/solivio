import type { ApiContract } from "@solivio/sdk/contracts";

import { chatRoutes } from "./offer-chat.ts";

export const routes = [...chatRoutes] as const satisfies readonly ApiContract[];
