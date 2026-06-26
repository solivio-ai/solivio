import { z } from "zod";

export const expectedItemSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().positive(),
  // Functional equivalents that also count as a correct match.
  altSkus: z.array(z.string()).optional(),
});

export const difficultySchema = z.enum(["basic", "realistic", "hard", "expert"]);

export const benchmarkCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  // basic: explicit requests, regression canary (~100% expected).
  // realistic: inflection/synonyms/merging — what customers actually send.
  // hard: near-variant disambiguation, unit conversion, noise — iteration target.
  // expert: needs context beyond the request text (history, customer standards,
  //         engineering sizing) — expected to fail until those land; roadmap metrics.
  difficulty: difficultySchema,
  notes: z.string(),
  customer: z.object({
    name: z.string(),
    profile: z.string(),
  }),
  request: z.string(),
  expected: z.object({
    items: z.array(expectedItemSchema),
    unmatched: z.array(z.string()),
    // Knowledge-base citation expectations (recall-based, no precision penalty).
    // Each string is a distinctive keyphrase from an article title the agent
    // SHOULD cite (matched when all its significant tokens appear in a cited
    // title). Defining this (or forbiddenKbArticles) opts the case into citation
    // scoring; extra relevant citations are not penalized.
    kbArticles: z.array(z.string()).optional(),
    // Article-title keyphrases the agent must NOT cite — e.g. distractor-space
    // articles that share vocabulary with the request but are irrelevant.
    // Citing any one zeroes the citation dimension for that run.
    forbiddenKbArticles: z.array(z.string()).optional(),
  }),
});

export type BenchmarkCase = z.infer<typeof benchmarkCaseSchema>;
export type ExpectedItem = z.infer<typeof expectedItemSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;

export const DIFFICULTY_ORDER: Difficulty[] = ["basic", "realistic", "hard", "expert"];
