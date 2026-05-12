import type { ApiContract, ApiResponseContract } from "./common";
import { errorResponseSchema, healthResponseSchema, plainErrorResponseSchema, unauthorizedResponseSchema } from "./common";
import {
  customerRequestResponseSchema,
  createCustomerRequestRequestSchema,
} from "./customer-request";
import {
  createOfferRequestSchema,
  addOfferProductRequestSchema,
  createdOfferResponseSchema,
  offerResponseSchema,
  quickOfferRequestSchema,
  updateOfferLineItemRequestSchema,
  updateOfferRequestSchema,
} from "./offer";
import {
  chatRequestSchema,
  createOfferChatThreadRequestSchema,
  offerChatMessagesResponseSchema,
  offerChatThreadResponseSchema,
  offerChatThreadsResponseSchema,
} from "./offer-chat";
import { offerPdfRequestSchema } from "./offer-pdf";
import {
  offerRevisionResponseSchema,
  offerRevisionsResponseSchema,
  restoreOfferRevisionResponseSchema,
} from "./offer-revision";
import {
  authPathParamsSchema,
  offerChatMessagesPathParamsSchema,
  offerPathParamsSchema,
  offerPdfQuerySchema,
  offerProductPathParamsSchema,
  offerRevisionPathParamsSchema,
} from "./path-params";
import {
  embeddingModelsResponseSchema,
  productImportRequestSchema,
  productImportResponseSchema,
  productSearchRequestSchema,
  productSearchResponseSchema,
  productTextSearchRequestSchema,
  productTextSearchResponseSchema,
  productsResponseSchema,
} from "./product";

const authenticatedResponses = <T extends Record<number, ApiResponseContract>>(responses: T) => ({
  ...responses,
  401: {
    description: "No valid Better Auth session was present.",
    schema: unauthorizedResponseSchema,
  },
});

const pdfResponse = (description: string): ApiResponseContract => ({
  description,
  content: {
    "application/pdf": {},
  },
});

const sseResponse = (description: string): ApiResponseContract => ({
  description,
  content: {
    "text/event-stream": {},
  },
});

export const apiContracts = [
  {
    method: "get",
    path: "/api/auth/{authPath}",
    operationId: "handleBetterAuthGet",
    summary: "Handle Better Auth GET route",
    description:
      "Catch-all route delegated to Better Auth for session reads, provider callbacks, and other auth GET flows.",
    tags: ["Auth"],
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
    tags: ["Auth"],
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
  {
    method: "get",
    path: "/api/health",
    operationId: "getHealth",
    summary: "Check service health",
    tags: ["System"],
    responses: {
      200: {
        description: "The app is reachable and reports database readiness.",
        schema: healthResponseSchema,
      },
    },
  },
  {
    method: "get",
    path: "/api/embedding-models",
    operationId: "listEmbeddingModels",
    summary: "List embedding models",
    tags: ["Products"],
    responses: {
      200: {
        description: "Embedding models available for product import.",
        schema: embeddingModelsResponseSchema,
      },
    },
  },
  {
    method: "get",
    path: "/api/products",
    operationId: "listProducts",
    summary: "List product candidates",
    tags: ["Products"],
    requiresAuth: true,
    responses: authenticatedResponses({
      200: {
        description: "Mocked product candidates available for request matching.",
        schema: productsResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/products/search",
    operationId: "searchProducts",
    summary: "Search products from a prompt",
    tags: ["Products"],
    requiresAuth: true,
    requestBody: {
      description: "Prompt used for semantic product matching against embedded products.",
      required: true,
      schema: productSearchRequestSchema,
    },
    responses: authenticatedResponses({
      200: {
        description: "Semantic matches from the products table with an AI summary.",
        schema: productSearchResponseSchema,
      },
      400: {
        description: "The request body could not be parsed or validated.",
        schema: errorResponseSchema,
      },
      500: {
        description: "The server could not complete the semantic product search.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/products/text-search",
    operationId: "searchProductsByText",
    summary: "Search products by keyword",
    tags: ["Products"],
    requiresAuth: true,
    requestBody: {
      description: "Keyword search query, pagination, and optional searchable fields.",
      required: true,
      schema: productTextSearchRequestSchema,
    },
    responses: authenticatedResponses({
      200: {
        description: "Matching products and total result count.",
        schema: productTextSearchResponseSchema,
      },
      400: {
        description: "The request body did not include a valid query.",
        schema: errorResponseSchema,
      },
      500: {
        description: "The server could not complete the text search.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/products/import",
    operationId: "importProducts",
    summary: "Import products with embeddings",
    tags: ["Products"],
    requestBody: {
      description: "Catalog rows to upsert and embed.",
      required: true,
      schema: productImportRequestSchema,
    },
    responses: {
      200: {
        description: "Number of products imported.",
        schema: productImportResponseSchema,
      },
      400: {
        description: "The import body was invalid.",
        schema: plainErrorResponseSchema,
      },
      500: {
        description: "The import failed while embedding or writing products.",
        schema: plainErrorResponseSchema,
      },
    },
  },
  {
    method: "get",
    path: "/api/requests",
    operationId: "getDemoRequest",
    summary: "Get the demo customer request",
    tags: ["Requests"],
    requiresAuth: true,
    responses: authenticatedResponses({
      200: {
        description: "The current mocked request and extracted requirements.",
        schema: customerRequestResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/requests",
    operationId: "createCustomerRequest",
    summary: "Create a draft customer request",
    tags: ["Requests"],
    requiresAuth: true,
    requestBody: {
      description: "Raw customer request text for mocked requirement extraction.",
      required: false,
      schema: createCustomerRequestRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "A mocked request object with extracted requirements.",
        schema: customerRequestResponseSchema,
      },
      400: {
        description: "The request body could not be parsed or validated.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers",
    operationId: "getDemoOffer",
    summary: "Get the demo draft offer",
    tags: ["Offers"],
    requiresAuth: true,
    responses: authenticatedResponses({
      200: {
        description: "The current mocked draft offer.",
        schema: offerResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers",
    operationId: "generateOffer",
    summary: "Generate a draft offer",
    description: "AI-assisted offer generation backed by the products table.",
    tags: ["Offers"],
    requiresAuth: true,
    requestBody: {
      description: "Customer name and request text for the new offer.",
      required: false,
      schema: createOfferRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "A newly persisted draft offer.",
        schema: createdOfferResponseSchema,
      },
      400: {
        description: "The request body could not be parsed or validated.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}",
    operationId: "getOffer",
    summary: "Get an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "The requested offer.",
        schema: offerResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "patch",
    path: "/api/offers/{offerId}",
    operationId: "updateOffer",
    summary: "Update an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestBody: {
      description: "Review edits to apply to the offer.",
      required: true,
      schema: updateOfferRequestSchema,
    },
    responses: authenticatedResponses({
      200: {
        description: "The updated offer.",
        schema: offerResponseSchema,
      },
      400: {
        description: "The request body did not match the offer update contract.",
        schema: errorResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "delete",
    path: "/api/offers/{offerId}",
    operationId: "deleteOffer",
    summary: "Delete an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      204: {
        description: "The offer was deleted.",
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/revisions",
    operationId: "listOfferRevisions",
    summary: "List offer revisions",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "Revision history for the offer.",
        schema: offerRevisionsResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/{offerId}/revisions",
    operationId: "saveOfferRevision",
    summary: "Save an offer revision",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      201: {
        description: "The saved offer revision.",
        schema: offerRevisionResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/revisions/{revisionId}",
    operationId: "getOfferRevision",
    summary: "Get an offer revision",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerRevisionPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "The requested offer revision.",
        schema: offerRevisionResponseSchema,
      },
      404: {
        description: "The revision was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/{offerId}/revisions/{revisionId}/restore",
    operationId: "restoreOfferRevision",
    summary: "Restore an offer revision",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerRevisionPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "The restored offer and the revision created by the restore action.",
        schema: restoreOfferRevisionResponseSchema,
      },
      404: {
        description: "The revision was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/quick",
    operationId: "createQuickOffer",
    summary: "Create a quick offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestBody: {
      description: "Manual product selections to turn into a draft offer.",
      required: true,
      schema: quickOfferRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "A newly persisted manual offer.",
        schema: createdOfferResponseSchema,
      },
      400: {
        description: "No product selections were provided.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/{offerId}/products",
    operationId: "addOfferProduct",
    summary: "Add a product to an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestBody: {
      description: "Product and quantity to add as an offer line.",
      required: true,
      schema: addOfferProductRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "The offer after adding the line item.",
        schema: offerResponseSchema,
      },
      400: {
        description: "The request body was invalid.",
        schema: errorResponseSchema,
      },
      404: {
        description: "The offer or product was not found.",
        schema: errorResponseSchema,
      },
      409: {
        description: "The product is already in the offer.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "patch",
    path: "/api/offers/{offerId}/products/{offerProductId}",
    operationId: "updateOfferProduct",
    summary: "Update an offer line item",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerProductPathParamsSchema,
    requestBody: {
      description: "New quantity for the offer line item.",
      required: true,
      schema: updateOfferLineItemRequestSchema,
    },
    responses: authenticatedResponses({
      200: {
        description: "The offer after updating the line item.",
        schema: offerResponseSchema,
      },
      400: {
        description: "The request body was invalid.",
        schema: errorResponseSchema,
      },
      404: {
        description: "The offer or line item was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "delete",
    path: "/api/offers/{offerId}/products/{offerProductId}",
    operationId: "deleteOfferProduct",
    summary: "Remove an offer line item",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerProductPathParamsSchema,
    responses: authenticatedResponses({
      204: {
        description: "The line item was removed.",
      },
      404: {
        description: "The offer or line item was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/chat",
    operationId: "streamChat",
    summary: "Stream assistant chat",
    tags: ["Chat"],
    requiresAuth: true,
    requestBody: {
      description: "AI SDK messages plus optional persistent offer chat identifiers.",
      required: true,
      schema: chatRequestSchema,
    },
    responses: authenticatedResponses({
      200: sseResponse("Server-sent event stream of AI SDK UI message chunks."),
      400: {
        description: "Only one of offerId or threadId was provided.",
        schema: errorResponseSchema,
      },
      404: {
        description: "The persistent chat thread was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/chat/threads",
    operationId: "listOfferChatThreads",
    summary: "List offer chat threads",
    tags: ["Chat"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "Chat threads attached to the offer.",
        schema: offerChatThreadsResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "post",
    path: "/api/offers/{offerId}/chat/threads",
    operationId: "createOfferChatThread",
    summary: "Create an offer chat thread",
    tags: ["Chat"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestBody: {
      description: "Optional chat thread title.",
      required: false,
      schema: createOfferChatThreadRequestSchema,
    },
    responses: authenticatedResponses({
      201: {
        description: "The created chat thread.",
        schema: offerChatThreadResponseSchema,
      },
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/chat/threads/{threadId}/messages",
    operationId: "listOfferChatMessages",
    summary: "List offer chat messages",
    tags: ["Chat"],
    requiresAuth: true,
    requestParams: offerChatMessagesPathParamsSchema,
    responses: authenticatedResponses({
      200: {
        description: "Messages in the offer chat thread.",
        schema: offerChatMessagesResponseSchema,
      },
      404: {
        description: "The chat thread was not found for the offer.",
        schema: errorResponseSchema,
      },
    }),
  },
  {
    method: "get",
    path: "/api/offers/pdf",
    operationId: "getSampleOfferPdf",
    summary: "Render sample offer PDF",
    tags: ["Documents"],
    responses: {
      200: pdfResponse("A sample offer PDF."),
    },
  },
  {
    method: "post",
    path: "/api/offers/pdf",
    operationId: "renderOfferPdf",
    summary: "Render offer PDF from payload",
    tags: ["Documents"],
    requestBody: {
      description: "Offer document payload to render.",
      required: true,
      schema: offerPdfRequestSchema,
    },
    responses: {
      200: pdfResponse("The rendered offer PDF."),
      400: {
        description: "The PDF payload was invalid.",
        schema: errorResponseSchema,
      },
    },
  },
  {
    method: "get",
    path: "/api/offers/{offerId}/pdf",
    operationId: "getOfferPdf",
    summary: "Render persisted offer PDF",
    tags: ["Documents"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestQuery: offerPdfQuerySchema,
    responses: authenticatedResponses({
      200: pdfResponse("The rendered PDF for the persisted offer."),
      404: {
        description: "The offer was not found.",
        schema: errorResponseSchema,
      },
    }),
  },
] as const satisfies readonly ApiContract[];
