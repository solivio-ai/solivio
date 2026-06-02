import { errorResponseSchema } from "./schemas/common";

export function apiError(code: string, message: string, issues?: string[]) {
  return errorResponseSchema.parse({
    error: {
      code,
      message,
      issues: issues && issues.length > 0 ? issues : undefined,
    },
  });
}
