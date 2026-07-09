import type { AnyImporterDefinition, ImportResult } from "@solivio/sdk";

import type { ImportPayload } from "../lib/importSchema.ts";
import { flattenPayload, importPayloadSchema } from "../lib/importSchema.ts";

const knowledgeBaseImporter: AnyImporterDefinition = {
  name: "json-knowledge-base",
  description: "Imports knowledge base spaces and articles from a JSON file.",
  target: "knowledge-base",
  accept: [".json", "application/json"],
  run: async (payload: unknown): Promise<ImportResult<ImportPayload>> => {
    if (typeof payload !== "string") {
      return {
        status: "failed",
        records: [],
        errors: [{ message: "Expected JSON file contents as a string" }],
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return {
        status: "failed",
        records: [],
        errors: [{ message: "Invalid JSON" }],
      };
    }

    const result = importPayloadSchema.safeParse(parsed);
    if (!result.success) {
      return {
        status: "failed",
        records: [],
        errors: result.error.issues.map((issue) => ({
          message: `${issue.path.join(".")}: ${issue.message}`,
        })),
      };
    }

    const flattened = flattenPayload(result.data);

    return {
      status: "success",
      records: [flattened],
      errors: [],
    };
  },
};

export const importers: AnyImporterDefinition[] = [knowledgeBaseImporter];
