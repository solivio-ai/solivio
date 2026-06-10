import "server-only";

import { inArray } from "drizzle-orm";

import type { CoreUsersService, Services } from "@solivio/sdk";
import { db } from "@/server/database/db";
import { users } from "@/server/database/schema";

/**
 * Core-provided service exposing minimal user display data to modules
 * (auth and the users table stay core-owned; modules reference users by id).
 * The interface lives in the SDK ({@link CoreUsersService}) so modules can
 * type against it.
 */
export function createUsersService(_deps: Services): CoreUsersService {
  return {
    async findDisplayByIds(ids) {
      if (ids.length === 0) return [];
      return db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, ids));
    },
  };
}
