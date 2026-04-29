import "server-only";

import { VoltOpsClient } from "@voltagent/core";

// Set VOLTAGENT_TRACING=true to enable VoltOps tracing. Off by default.
export const voltOpsClient =
  process.env.VOLTAGENT_TRACING === "true" &&
  process.env.VOLTAGENT_PUBLIC_KEY &&
  process.env.VOLTAGENT_SECRET_KEY
    ? new VoltOpsClient({
        publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
        secretKey: process.env.VOLTAGENT_SECRET_KEY
      })
    : undefined;
