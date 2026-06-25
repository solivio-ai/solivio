import { deraveReferralUrl, githubUrl } from "../links";
import type { LandingContent } from "../types";

export const enLandingContent = {
  locale: "en",
  lang: "en",
  path: "/",
  alternateLocale: "pl",
  alternatePath: "/pl/",
  alternateLabel: "PL",
  title: "Solivio - Open-source AI quoting system for B2B sales",
  description:
    "Solivio is an open-source, self-hosted AI quoting system that turns raw B2B requests, catalogs, and customer data into draft offers.",
  ogTitle: "Solivio - Open-source inquiry-to-draft-quote system",
  ogDescription:
    "Run Solivio locally or on-prem. Connect CRM, ERP, ecommerce, catalogs, and documents into one sales review flow.",
  seo: {
    ogLocale: "en_US",
    alternateOgLocale: "pl_PL",
    ogImageAlt: "Solivio inquiry-to-draft-quote workflow preview",
  },
  labels: {
    skipToContent: "Skip to content",
    home: "Solivio home",
    primaryNavigation: "Primary navigation",
    primaryActions: "Primary actions",
    projectFacts: "Project facts",
    productPreview: "Solivio product preview",
    nextSteps: "Next steps",
    announcement: "Run locally, inspect the architecture, and review the inquiry-to-quote workflow",
    quickStart: "Quick start",
    copy: "Copy",
    copied: "Copied",
    rawInquiry: "Raw inquiry",
    extractedSummary: "Extracted summary",
    productMatches: "Catalog matches",
    confidence: "Confidence",
    generated: "Generated",
    inReview: "In review",
    accepted: "PDF",
    sourceTrail: "Decision trail",
    architectureCaption: "Existing systems → Solivio → sales team",
    moduleStatus: "Surface",
    operatorLink: "Open deployment guide",
    footerTop: "Back to top",
    footerBy: "by",
    githubRepository: "GitHub repository",
    apiReference: "API",
  },
  sectionLabels: {
    workflow: "Workflow",
    foundation: "Foundation",
    process: "Process",
    architecture: "Architecture",
    modules: "Modules",
    operator: "Operator",
    why: "Why",
  },
  nav: {
    product: "Product",
    architecture: "Architecture",
    docs: "Docs",
  },
  hero: {
    h1: "From raw B2B inquiry to",
    h1Highlight: "draft quote",
    body: "Solivio is an open-source, self-hosted quoting system for B2B teams. It turns requests, catalogs, CRM/ERP context, and documents into draft offers ready for sales review.",
    facts: [
      "MIT licensed - clone and run",
      "Run cloud AI or local models on-prem",
      "Extend with modules for your existing systems",
    ],
    primary: { href: "/guides/getting-started/", label: "Start setup" },
    secondary: { href: githubUrl, label: "View GitHub", external: true },
    quickStart: "git clone https://github.com/solivio-ai/solivio.git && cd solivio && yarn setup",
    offerNav: ["Inquiries", "Catalog", "Offers", "Customers", "Assistant"],
    offerTitle: "Draft offer 2026-0607-001",
    offerMeta: "ACME Automation - 18 items - Review",
    offerStatus: "Draft",
    offerTableHeaders: ["Item", "Qty", "Total"],
    offerRows: [
      ["Servo motor 750W", "4", "5,000.00"],
      ["Planetary gearbox 10:1", "4", "2,480.00"],
      ["Drive controller 3kW", "4", "4,320.00"],
      ["Brake resistor 200W", "4", "440.00"],
    ],
    offerActions: ["Edit", "Approve & generate PDF"],
  },
  heroPreview: {
    productSignals: [
      { label: "Draft lines", value: "4" },
      { label: "Stage", value: "Draft" },
      { label: "Output", value: "PDF" },
    ],
    rail: [
      {
        title: "Open source",
        body: "MIT, local setup, and inspectable source.",
      },
      {
        title: "Self-hosted",
        body: "Docker, Postgres, and no vendor lock-in.",
      },
      {
        title: "Built for complexity",
        body: "Multi-line inquiries and large catalogs.",
      },
      {
        title: "Developer first",
        body: "TypeScript, Next.js, Drizzle, and modules.",
      },
    ],
    inquiryTitle: "Inquiry",
    inquiryStatus: "New",
    rawInquiryBody:
      "We need a proposal for 3 production lines. Each line needs a motor, gearbox, drive controller, and accessories. Delivery target: Q3.",
    extractedSummaryItems: [
      "3 production lines",
      "Motor + gearbox + controller",
      "Delivery target: Q3",
    ],
  },
  stack: {
    title: "Built with a stack you already know",
    items: ["Next.js", "TypeScript", "Postgres", "Drizzle ORM", "Tailwind v4", "shadcn/ui"],
  },
  metrics: {
    items: [
      { value: "MIT", label: "Open-source license" },
      { value: "6", label: "Built-in modules" },
      { value: "On-prem", label: "Deployment option" },
      { value: "Any AI", label: "Provider strategy" },
    ],
  },
  what: {
    title: "From inquiry to draft quote",
    body: "Solivio helps companies turn complex, multi-line inquiries and scattered sales context into structured offers. The core workflow is narrow, inspectable, and extendable.",
    items: [
      {
        title: "Request intake",
        body: "Collect raw requests from email, pasted text, CSV, or implementation-specific importers.",
      },
      {
        title: "Extraction",
        body: "Extract requested lines, quantities, parameters, ambiguities, and source evidence.",
      },
      {
        title: "Product matching",
        body: "Search the catalog by SKU, text, rules, and semantic similarity when embeddings are enabled.",
      },
      {
        title: "Draft quote",
        body: "Create a draft with line items, notes, unmatched fragments, and PDF output.",
      },
      {
        title: "Human review",
        body: "Salespeople edit quantities, products, discounts, and acceptance state before anything leaves.",
      },
    ],
  },
  capabilities: {
    title: "A sales layer for your existing systems",
    body: "Solivio does not replace CRM, ERP, ecommerce, catalog, document, or reporting tools. It gathers sales context from those systems, prepares the draft, and returns accepted output through implementation modules.",
    items: [
      {
        title: "Source intake",
        body: "Start from email, pasted text, CSV, documents, or implementation-specific importers.",
      },
      {
        title: "Existing-system context",
        body: "Bring catalog, customer, pricing, stock, contract, CRM, ERP, ecommerce, and policy data into the sales workflow.",
      },
      {
        title: "AI provider choice",
        body: "Use the AI provider that fits your deployment, or connect local model endpoints for extraction and assistant features.",
      },
      {
        title: "Fully on-prem option",
        body: "Run Solivio with local AI models and self-hosted infrastructure when company policy requires no data to leave.",
      },
      {
        title: "Sales review",
        body: "Keep the salesperson in control of products, quantities, discounts, margins, and approvals.",
      },
      {
        title: "Extensible handoff",
        body: "Add modules for importers, agent tools, pages, APIs, jobs, events, UI slots, and downstream handoffs.",
      },
    ],
    link: { href: "/guides/features/", label: "See the feature walkthrough" },
  },
  workflow: {
    title: "How it works",
    body: "The core workflow is intentionally narrow: get from customer input to a structured quote draft with a salesperson in the loop.",
    steps: [
      {
        title: "Customer inquiry",
        body: "A message, spreadsheet, or document describes what the customer needs.",
      },
      {
        title: "Extraction",
        body: "Solivio extracts products, quantities, requirements, and constraints.",
      },
      {
        title: "Catalog matching",
        body: "The system finds candidate products and flags uncertain choices.",
      },
      {
        title: "Draft quote",
        body: "A quote draft is generated with pricing and notes where configured.",
      },
      {
        title: "Review & approval",
        body: "The salesperson edits, validates, accepts, or sends it back for another pass.",
      },
      {
        title: "Accepted output",
        body: "Accepted offers can become PDFs or move into ERP, CRM, ecommerce, and other implementation-specific destinations.",
      },
    ],
  },
  workflowPreview: {
    title: "Inquiry moves through explicit stages",
    items: [
      { title: "Raw inquiry", body: "email, CSV, document" },
      { title: "Catalog matches", body: "SKU, text, semantic" },
      { title: "Draft", body: "edit and accept" },
    ],
    stepsCountLabel: "steps",
  },
  architecture: {
    title: "Architecture for extension, not lock-in",
    body: "Solivio is a single-tenant modular monolith. The core stays focused on inquiry-to-quote work, while build-time modules connect the sources, rules, AI endpoints, and destinations that belong to your deployment.",
    link: { href: "/guides/modules/", label: "Explore modules" },
    blocks: [
      {
        title: "Existing systems",
        body: "CRM, ERP, ecommerce, inboxes, spreadsheets, PDFs, product catalogs, and internal APIs feed Solivio.",
      },
      {
        title: "Solivio app",
        body: "Intake, extraction, catalog matching, draft offers, review, acceptance, and PDF output live in one app.",
      },
      {
        title: "Extension modules",
        body: "Typed pages, API routes, services, events, importers, jobs, agent tools, and UI slots adapt Solivio to each company.",
      },
      {
        title: "Deployment boundary",
        body: "Choose managed AI providers, local model endpoints, or fully on-prem operation so data boundaries match company policy.",
      },
    ],
    note: "Single-tenant per deployment - AI provider agnostic - modules compiled at build time - no runtime module imports",
  },
  architectureDiagram: {
    sourceSystems: ["CRM", "ERP", "Ecommerce", "Email", "Excel", "PDF", "Internal APIs"],
    solivioPipeline: ["Intake", "Extraction", "Matching", "Draft", "Review"],
    salesTeam: {
      title: "Sales team",
      body: "Salespeople review, edit, and approve the offer before PDF output or handoff into existing tools.",
      actions: ["Review", "Edit", "Approve", "PDF", "CRM", "ERP"],
    },
  },
  modules: {
    title: "Module surfaces",
    body: "Modules are source packages that contribute typed pieces of the application without importing each other at runtime.",
    link: { href: "/guides/extending/", label: "Read the extending guide" },
    items: [
      { title: "Pages", body: "UI pages mounted into the generated app shell." },
      { title: "API routes", body: "HTTP endpoints under the generated app-router tree." },
      {
        title: "Services & events",
        body: "Business logic and typed cross-module observer events.",
      },
      { title: "Jobs", body: "Background jobs and optional cron schedules." },
      {
        title: "Importer capabilities",
        body: "Normalize raw source data before owning modules persist it.",
      },
      { title: "Agent tools", body: "Tools consumed by offer generation and assistant agents." },
      {
        title: "i18n, nav & slots",
        body: "Translations, sidebar entries, and UI injection points.",
      },
    ],
  },
  moduleTable: {
    moduleHeader: "Module",
    contributionHeader: "What it contributes",
    coreStatus: "Core",
    extensionStatus: "Extension",
  },
  operator: {
    title: "Operator path",
    body: "From laptop evaluation to a single-tenant deployment, the docs keep the path explicit.",
    items: [
      {
        title: "Run locally",
        body: "Use `yarn setup` to start Postgres, generate wiring, and run migrations.",
      },
      {
        title: "Source setup",
        body: "Clone, install with Yarn, copy `.env.example`, then run the Next.js app.",
      },
      {
        title: "Integration path",
        body: "The default evaluation path is local-first; CRM, ERP, ecommerce, and other integrations are added as deployment modules.",
      },
      {
        title: "AI boundary",
        body: "Use managed provider credentials or local model endpoints for extraction, matching, and assistant capabilities.",
      },
      {
        title: "Build & deploy",
        body: "Use the production image and deployment guide for a VPS-style install.",
      },
      {
        title: "Docs & API",
        body: "Setup, modules, extending, deployment, and generated OpenAPI reference are included.",
      },
    ],
  },
  why: {
    title: "Why it exists",
    body: "The hard part in many B2B teams is not the final quote template. It is the intake step: raw requests arrive before clean data reaches CRM, ERP, ecommerce, or the tools the team already uses. Solivio focuses on that stage.",
    items: [
      {
        title: "Technical distributors",
        body: "Best fit for teams with thousands of SKUs and multi-line requests.",
      },
      {
        title: "Fragmented data",
        body: "Catalogs, ERP, CRM, Excel, price lists, PDFs, and senior knowledge rarely act as one system.",
      },
      {
        title: "Review over autonomy",
        body: "Solivio prepares a draft; salespeople decide what is correct and what leaves the company.",
      },
    ],
  },
  finalCta: {
    developerTitle: "Developer / operator?",
    developerBody:
      "Run Solivio locally in minutes, read the module guides, and inspect every layer of the source before deciding whether it fits your team.",
    developerPrimary: { href: "/guides/getting-started/", label: "Run Solivio locally" },
    developerSecondary: { href: githubUrl, label: "View GitHub", external: true },
    businessTitle: "Business / implementation?",
    businessBody: "Use one real RFQ to check whether Solivio fits your current quoting process.",
    businessPrimary: {
      href: deraveReferralUrl("en", "final_business_cta"),
      label: "Visit Derave",
      external: true,
    },
  },
  footer: {
    tagline: "Open-source inquiry-to-draft-quote system for technical B2B teams.",
    product: "Product",
    resources: "Resources",
    community: "Community",
  },
} satisfies LandingContent;
