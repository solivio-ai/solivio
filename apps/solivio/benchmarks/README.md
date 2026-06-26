# Agent Benchmarks

Measurable, repeatable benchmarks for Solivio agents. They answer questions
like "swapping model X for Y drops accuracy from 98% to 95%" and back every
headline number with committable per-case evidence.

This is **not** a CI test. It is a baseline for iterating on agent
correctness and comparing models/implementations over time.

## Latest results

<!-- benchmark-latest:start -->
Latest run: **2026-06-26 14:04** — full data: [`results/offer-generation/2026-06-26-14-04-54__openai-gpt-5.4-mini.json`](results/offer-generation/2026-06-26-14-04-54__openai-gpt-5.4-mini.json)

| | |
|---|---|
| **Overall score** | **77.8%** (macro mean over 16 cases) |
| Model | `openai/gpt-5.4-mini` |
| Embedding model | `text-embedding-3-large` |
| Runs per case | 1 |
| Git commit | `daa63b9` |
| Case set | `6507b1d16146` (scores only comparable within the same case set) |

### Scores by difficulty

| Tier | Score | Cases |
|---|---|---|
| basic | 100.0% | 2 |
| realistic | 100.0% | 2 |
| hard | 90.2% | 6 |
| expert | 50.5% | 6 |

### Per-case scores

| Case | Tier | Score (mean) | Stddev | Notes |
|---|---|---|---|---|
| [01-simple-explicit](suites/offer-generation/cases/01-simple-explicit.json) | basic | 100.0% | ±0.0% | Simple explicit list with quantities |
| [02-sku-mix](suites/offer-generation/cases/02-sku-mix.json) | basic | 100.0% | ±0.0% | SKU codes mixed with natural-language descriptions |
| [03-inflected-synonyms](suites/offer-generation/cases/03-inflected-synonyms.json) | realistic | 100.0% | ±0.0% | Inflected Polish, synonyms, and one item missing from catalog |
| [04-repeat-order-history](suites/offer-generation/cases/04-repeat-order-history.json) | expert | 100.0% | ±0.0% | Repeat order referencing customer history |
| [05-sections-merge](suites/offer-generation/cases/05-sections-merge.json) | realistic | 100.0% | ±0.0% | Quantities spread across sections requiring merge |
| [06-messy-site-email](suites/offer-generation/cases/06-messy-site-email.json) | hard | 93.3% | ±0.0% | Long messy site email: slang, typos, abbreviations, scattered merge |
| [07-variant-minefield](suites/offer-generation/cases/07-variant-minefield.json) | hard | 100.0% | ±0.0% | Near-variant disambiguation in dense product families |
| [08-unit-conversion](suites/offer-generation/cases/08-unit-conversion.json) | hard | 50.0% | ±0.0% | Quantities in meters vs catalog packaging units |
| [09-implied-specs](suites/offer-generation/cases/09-implied-specs.json) | hard | 100.0% | ±0.0% | Specs implied by installation location, not stated |
| [10-customer-standard](suites/offer-generation/cases/10-customer-standard.json) | expert | 0.0% | ±0.0% | Order in the customer's house standard (context not in the request) |
| [11-bulk-rfq](suites/offer-generation/cases/11-bulk-rfq.json) | hard | 98.0% | ±0.0% | Bulk RFQ: 51 description-only positions across all families |
| [12-prose-amendments](suites/offer-generation/cases/12-prose-amendments.json) | hard | 100.0% | ±0.0% | Flowing prose with amendments, cancellations and cross-references |
| [13-kb-board-protection](suites/offer-generation/cases/13-kb-board-protection.json) | expert | 77.8% | ±0.0% | Knowledge base: distribution board requires RCD protection |
| [14-kb-cable-moq](suites/offer-generation/cases/14-kb-cable-moq.json) | expert | 25.0% | ±0.0% | Knowledge base: cable reel minimum order quantity |
| [15-kb-gauge-by-regulation](suites/offer-generation/cases/15-kb-gauge-by-regulation.json) | expert | 0.0% | ±0.0% | Knowledge base: conductor gauge dictated by regulation |
| [16-kb-distractor-suppression](suites/offer-generation/cases/16-kb-distractor-suppression.json) | expert | 100.0% | ±0.0% | Knowledge base: irrelevant space must not surface |

For a detailed per-run markdown report (verdict tables for every case), run `yarn benchmark:report --file results/offer-generation/2026-06-26-14-04-54__openai-gpt-5.4-mini.json`.
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
yarn benchmark --model openai/gpt-5.5     # quality ceiling (the app's prod model)
yarn benchmark --concurrency 8
yarn benchmark --suite offer-generation   # explicit suite (the default)

yarn benchmark:report                     # render MD from the latest .json result
yarn benchmark:report --file benchmarks/results/offer-generation/<run>.json
yarn benchmark:readme                     # refresh "Latest results" above from the latest .json
```

Requires `DATABASE_URL` and `OPENAI_API_KEY` in `.env.local` or `.env`
(same layering as `yarn db:migrate`) and the local Postgres container
running (`yarn db:up`).

Benchmarks default to `openai/gpt-5.4-mini` to keep runs cheap (the app's
production default is `openai/gpt-5.5`). Override with `--model`. Scores are
only comparable within the same model, so the `.json` slug and history record
which model produced each run.

For any number you publish or any model comparison, use `--runs 3` or more —
single runs carry LLM nondeterminism noise.

## How it works

1. Creates a dedicated `solivio_benchmark` database on the same Postgres
   container (pgvector + every committed journal: core and each enabled
   module's migrations) and boots the module runtime — the same services,
   agent tools and db accessors the app wires in `instrumentation.ts`, minus
   the job engine. The dev database is never touched, and benchmark search
   results never depend on dev data.
2. Syncs the catalog to exactly mirror `fixtures/catalog.csv` (parsed through the
   same `csvProductImporter` the app and seeder use): deletes strays, imports
   new/changed rows through `getService("catalog").importProducts`, so
   embeddings come from the same code path as production imports.
3. Calls the real offer-generation agent through the offers service
   (`getService("offers").generateOffer`) — full tool loop and vector
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
- **knowledge-base citations** (opt-in via `expected.kbArticles`): recall over
  the article titles the agent should cite (token-subset match). Recall-based
  by design — extra, genuinely-relevant citations are **not** penalized. The
  only penalty is citing an article listed in `expected.forbiddenKbArticles`
  (a distractor-space article that must never surface), which zeroes the
  citation dimension for that run.
- **case score** = weighted mix of item F1, unmatched recall, and citation
  score (weighted by their respective expected counts);
  **overall score** = mean of case scores (macro average)

The scorer is intentionally deterministic — no LLM-as-judge — so all noise
in the numbers comes from the agent under test, never from the measurement.

## Cases

Each case in `suites/offer-generation/cases/` is a full scenario: customer profile,
request text, and the expected offer. Shared seed data lives separately in
`suites/offer-generation/fixtures/` — the catalog (`catalog.csv`), historical orders
(`orders.csv`), and knowledge base (`knowledge-base.json`). Data the agent should
fetch from the database itself (order history, KB) belongs in those fixtures, not in
case parameters. `prepare()` syncs the catalog, the historical orders, and the
knowledge base (chunked + embedded), and `runCase` resolves each case's customer
so agent tools like `recall_order_history` have customer scope.

The KB fixture includes a deliberate **distractor space** ("Sprawy biurowe i HR")
of office/HR content that shares vocabulary with electrical requests but is
irrelevant to offers. Cases forbid its articles via `expected.forbiddenKbArticles`
to verify the agent does not let irrelevant knowledge leak into the offer.

Every case declares a `difficulty` tier, and reports aggregate per tier:

- **basic** — explicit requests; regression canary, ~100% expected.
- **realistic** — inflection, synonyms, merging; what customers actually send.
- **hard** — near-variant disambiguation, unit conversion, noise, long messy
  inputs; the iteration target, NOT expected to be 100%.
- **expert** — needs context beyond the request text (order history, customer
  standards, engineering sizing, knowledge-base rules); expected to fail until
  those capabilities land. Roadmap metrics, not regressions.

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
| `13-kb-board-protection` | expert | KB rule adds a required RCD to a bare enclosure order (engineering knowledge) |
| `14-kb-cable-moq` | expert | KB commercial policy rounds a cable order up to the 5-reel minimum |
| `15-kb-gauge-by-regulation` | expert | KB regulation disambiguates conductor gauge (2.5 mm² sockets vs 1.5 mm²) |
| `16-kb-distractor-suppression` | expert | negative case: irrelevant HR/distractor space must not be cited |

To add a case: copy an existing JSON, keep `id` = filename, set
`difficulty`. If a case needs a product the catalog lacks, add a row to
`fixtures/catalog.csv` following the existing SKU/naming conventions (keep SKUs
unique; do not add coax cable — case 03 expects RG6 unmatched).
**Versioning rule:** when the case set or catalog changes, scores are a new
baseline — never compare numbers across different case sets.
