import { z } from "zod";

import { healthResponseSchema, routeGroup } from "./common";

export const authPathParamsSchema = z
  .object({
    authPath: z.string(),
  })
  .strict()
  .meta({
    id: "AuthPathParams",
    description: "Catch-all path segment delegated to Better Auth.",
  });

export const systemRoutes = [
  ...routeGroup({ tag: "Auth" }, [
    {
      method: "get",
      path: "/api/auth/{authPath}",
      operationId: "handleBetterAuthGet",
      summary: "Handle Better Auth GET route",
      description:
        "Catch-all route delegated to Better Auth for session reads, provider callbacks, and other auth GET flows.",
      requestParams: authPathParamsSchema,
      responses: {
        200: {
          description: "Better Auth handled the GET request.",
        },
        400: {
          description: "Better Auth rejected the request.",
        },
      },
    },
    {
      method: "post",
      path: "/api/auth/{authPath}",
      operationId: "handleBetterAuthPost",
      summary: "Handle Better Auth POST route",
      description:
        "Catch-all route delegated to Better Auth for sign-in, sign-up, sign-out, and other auth POST flows.",
      requestParams: authPathParamsSchema,
      responses: {
        200: {
          description: "Better Auth handled the POST request.",
        },
        400: {
          description: "Better Auth rejected the request.",
        },
      },
    },
  ]),
  ...routeGroup({ tag: "System" }, [
    {
      method: "get",
      path: "/api/health",
      operationId: "getHealth",
      summary: "Check service health",
      responses: {
        200: {
          description: "The app is reachable and reports database readiness.",
          schema: healthResponseSchema,
        },
      },
    },
  ]),
] as const satisfies readonly import("./common").ApiContract[];
