import { moduleApiContracts } from "../../../generated/contracts";
import type { ApiContract } from "./common";
import { systemRoutes } from "./system";

export const apiContracts = [
  ...systemRoutes,
  ...moduleApiContracts,
] as const satisfies readonly ApiContract[];
