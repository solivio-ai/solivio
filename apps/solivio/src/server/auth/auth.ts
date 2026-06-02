import "server-only";

import { authFlags, createAuth } from "./createAuth";

export { authFlags };

export const auth = createAuth();

export type Session = typeof auth.$Infer.Session;
