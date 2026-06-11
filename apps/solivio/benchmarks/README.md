# Agent Benchmarks

Measurable, repeatable benchmarks for Solivio agents. They answer questions
like "swapping model X for Y drops accuracy from 98% to 95%" and back every
headline number with committable per-case evidence.

This is **not** a CI test. It is a baseline for iterating on agent
correctness and comparing models/implementations over time.

## Latest results

<!-- benchmark-latest:start -->
Latest run: **2026-06-11 11:29** — full data: [`results/offer-generation/2026-06-11-11-29-51__openai-gpt-5.5.json`](results/offer-generation/2026-06-11-11-29-51__openai-gpt-5.5.json)

| | |
|---|---|
| **Overall score** | **81.5%** (macro mean over 12 cases) |
| Model | `openai/gpt-5.5` |
| Embedding model | `text-embedding-3-large` |
| Runs per case | 1 |
| Git commit | `f21f09d` |
| Case set | `d5b0c5b49792` (scores only comparable within the same case set) |

### Scores by difficulty

| Tier | Score | Cases |
|---|---|---|
| basic | 100.0% | 2 |
| realistic | 100.0% | 2 |
| hard | 90.7% | 6 |
| expert | 16.7% | 2 |

### Per-case scores

| Case | Tier | Score (mean) | Stddev | Notes |
|---|---|---|---|---|
| [01-simple-explicit](suites/offer-generation/cases/01-simple-explicit.json) | basic | 100.0% | ±0.0% | Simple explicit list with quantities |
| [02-sku-mix](suites/offer-generation/cases/02-sku-mix.json) | basic | 100.0% | ±0.0% | SKU codes mixed with natural-language descriptions |
| [03-inflected-synonyms](suites/offer-generation/cases/03-inflected-synonyms.json) | realistic | 100.0% | ±0.0% | Inflected Polish, synonyms, and one item missing from catalog |
| [04-repeat-order-history](suites/offer-generation/cases/04-repeat-order-history.json) | expert | 33.3% | ±0.0% | Repeat order referencing customer history |
| [05-sections-merge](suites/offer-generation/cases/05-sections-merge.json) | realistic | 100.0% | ±0.0% | Quantities spread across sections requiring merge |
| [06-messy-site-email](suites/offer-generation/cases/06-messy-site-email.json) | hard | 100.0% | ±0.0% | Long messy site email: slang, typos, abbreviations, scattered merge |
| [07-variant-minefield](suites/offer-generation/cases/07-variant-minefield.json) | hard | 100.0% | ±0.0% | Near-variant disambiguation in dense product families |
| [08-unit-conversion](suites/offer-generation/cases/08-unit-conversion.json) | hard | 50.0% | ±0.0% | Quantities in meters vs catalog packaging units |
| [09-implied-specs](suites/offer-generation/cases/09-implied-specs.json) | hard | 100.0% | ±0.0% | Specs implied by installation location, not stated |
| [10-customer-standard](suites/offer-generation/cases/10-customer-standard.json) | expert | 0.0% | ±0.0% | Order in the customer's house standard (context not in the request) |
| [11-bulk-rfq](suites/offer-generation/cases/11-bulk-rfq.json) | hard | 100.0% | ±0.0% | Bulk RFQ: 51 description-only positions across all families |
| [12-prose-amendments](suites/offer-generation/cases/12-prose-amendments.json) | hard | 94.4% | ±0.0% | Flowing prose with amendments, cancellations and cross-references |

For a detailed per-run markdown report (verdict tables for every case), run `yarn benchmark:report --file results/offer-generation/2026-06-11-11-29-51__openai-gpt-5.5.json`.
<!-- benchmark-latest:end -->

## Structure

Each benchmarked agent gets a **suite** under `suites/<name>/` that owns
everything specific to it — case format, fixtures, invocation, scoring,
report rendering — exposed through a small surface in `suite.ts`. The
harness (`run.ts` + `src/`: DB bootstrap, run loop, history, comparison) is
shared. Agents differ, so suites are expected to have their own structure;
don't force a common case schema. To add a suite: copy the
`offer-generation` pattern and register it in the `SUITES` map in `run.ts`.

Currently benchmarked: **`offer-generation`** (`offerGenerationAgent.ts`) —
the core of the request → offer pipeline. Results land in
`results/<suite>/`, including the per-suite `history.jsonl`.

## Running

```bash
yarn benchmark                            # all cases, 1 run each
yarn benchmark --runs 3                   # 3 runs per case → mean ± stddev
yarn benchmark --case 03-inflected-synonyms,04-repeat-order-history
yarn benchmark --difficulty hard,expert   # only the difficult tiers
yarn benchmark --model openai/gpt-5.4-mini   # compare a different model
yarn benchmark --concurrency 8
yarn benchmark --suite offer-generation   # explicit suite (the default)

yarn benchmark:report                     # render MD from the latest .json result
yarn benchmark:report --file benchmarks/results/offer-generation/<run>.json
yarn benchmark:readme                     # refresh "Latest results" above from the latest .json
```

Requires `.env.local` with `DATABASE_URL` and `OPENAI_API_KEY` (same as
`yarn dev`) and the local Postgres container running (`yarn db:up`).

For any number you publish or any model comparison, use `--runs 3` or more —
single runs carry LLM nondeterminism noise.

## How it works

1. Creates a dedicated `solivio_benchmark` database on the same Postgres
   container (committed Drizzle migrations + pgvector). The dev database is
   never touched, and benchmark search results never depend on dev data.
2. Syncs the products table to exactly mirror `cases/catalog.json`
   (deletes strays, embeds new/changed rows with the production format).
3. Calls the real `generateOfferWithAgent` — full tool loop and vector
   search — once per case per run, in parallel.
4. Scores deterministically and writes a `.json` result (single source of
   truth) to `results/<suite>/`. Markdown is rendered from it on demand via
   `yarn benchmark:report`; `yarn benchmark:readme` refreshes the **Latest
   results** section of this README. Commit results you want to reference.
5. Appends one line per run to `results/history.jsonl` (timestamp, commit,
   model, case-set hash, overall + per-case scores) and prints a comparison
   against the previous run. The case-set hash covers the catalog and the
   cases actually run — runs are only compared within the same hash, so a
   changed case set starts a new baseline instead of producing a misleading
   delta. `history.jsonl` is committed and is the dataset for trend
   analysis/visuals.

## Scoring

Per expected line item: **1.0** for right SKU and right quantity, **0.5**
for right SKU wrong quantity, **0** if missing (`altSkus` in a case file
count as the right SKU). From the credit total:

- recall = credit / expected items, precision = credit / generated items
  (so hallucinated extra items lower the score)
- **item F1** = harmonic mean of the two
- products the catalog genuinely lacks must be reported in `unmatched`;
  their recall is averaged into the case score, weighted by count
- **case score** = weighted mix of item F1 and unmatched recall;
  **overall score** = mean of case scores (macro average)

The scorer is intentionally deterministic — no LLM-as-judge — so all noise
in the numbers comes from the agent under test, never from the measurement.

## Cases

Each case in `suites/offer-generation/cases/` is a full scenario: customer profile, catalog
(shared `catalog.json`), request text, and the expected offer. Data the agent should fetch from the
database itself (e.g. order history, once an orders table exists) belongs
in DB seeding, not in case parameters.

Every case declares a `difficulty` tier, and reports aggregate per tier:

- **basic** — explicit requests; regression canary, ~100% expected.
- **realistic** — inflection, synonyms, merging; what customers actually send.
- **hard** — near-variant disambiguation, unit conversion, noise, long messy
  inputs; the iteration target, NOT expected to be 100%.
- **expert** — needs context beyond the request text (order history, customer
  standards, engineering sizing); expected to fail until those capabilities
  land. Roadmap metrics, not regressions.

| Case | Tier | Exercises |
|---|---|---|
| `01-simple-explicit` | basic | clean list, easy baseline |
| `02-sku-mix` | basic | SKU fragments vs description fragments |
| `03-inflected-synonyms` | realistic | Polish inflection, synonyms, correct `unmatched` |
| `05-sections-merge` | realistic | per-floor quantities merged into single line items |
| `06-messy-site-email` | hard | 15 items in prose: slang, typos, abbreviations, scattered merge, superlative pick |
| `07-variant-minefield` | hard | five picks among 48 breakers / 18 RCDs / 8 RCBOs differing by one parameter |
| `08-unit-conversion` | hard | meters ordered vs packaging units sold (100m coils, 25m rolls, 2m sections) |
| `09-implied-specs` | hard | IP rating implied by location (bathroom/garage/outdoors), never stated |
| `11-bulk-rfq` | hard | 51 description-only tender positions across all families; long-context scale test |
| `12-prose-amendments` | hard | flowing prose where later sentences override earlier ones: corrections, cancellations, cross-references, per-unit math |
| `04-repeat-order-history` | expert | "same as last time" needs order history from the DB |
| `10-customer-standard` | expert | "our house standard" resolves only via customer context |

To add a case: copy an existing JSON, keep `id` = filename, set
`difficulty`. If a case needs a product the catalog lacks, add it to
`catalog.json` following the existing SKU/naming conventions (keep SKUs
unique; do not add coax cable — case 03 expects RG6 unmatched).
**Versioning rule:** when the case set or catalog changes, scores are a new
baseline — never compare numbers across different case sets.
