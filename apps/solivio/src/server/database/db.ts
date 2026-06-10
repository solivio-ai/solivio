import { drizzle } from "drizzle-orm/node-postgres";

import * as moduleSchema from "../../generated/schema";
import * as coreSchema from "./schema";

// The runtime client sees the full schema: core tables plus every enabled
// module's tables (generated barrel). Migration journals stay per-owner.
export const db = drizzle(process.env.DATABASE_URL!, {
  schema: { ...coreSchema, ...moduleSchema },
});
