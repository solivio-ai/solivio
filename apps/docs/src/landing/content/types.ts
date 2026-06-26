export const landingLocales = ["en", "pl"] as const;
export type LandingLocale = (typeof landingLocales)[number];

export const defaultLandingLocale: LandingLocale = "en";

type Link = {
  href: string;
  label: string;
  external?: boolean;
};

type SectionItem = {
  title: string;
  body: string;
};

type WorkflowStep = {
  title: string;
  body: string;
};

type LandingSeo = {
  ogLocale: string;
  alternateOgLocale: string;
  ogImageAlt: string;
};

type LandingLabels = {
  skipToContent: string;
  home: string;
  primaryNavigation: string;
  primaryActions: string;
  projectFacts: string;
  productPreview: string;
  nextSteps: string;
  announcement: string;
  quickStart: string;
  copy: string;
  copied: string;
  rawInquiry: string;
  extractedSummary: string;
  productMatches: string;
  confidence: string;
  generated: string;
  inReview: string;
  accepted: string;
  sourceTrail: string;
  architectureCaption: string;
  moduleStatus: string;
  operatorLink: string;
  footerTop: string;
  footerBy: string;
  githubRepository: string;
  apiReference: string;
};

type LandingSectionLabels = {
  workflow: string;
  foundation: string;
  process: string;
  architecture: string;
  modules: string;
  operator: string;
  why: string;
};

type LandingHeroPreview = {
  productSignals: { label: string; value: string }[];
  rail: SectionItem[];
  inquiryTitle: string;
  inquiryStatus: string;
  rawInquiryBody: string;
  extractedSummaryItems: string[];
};

type LandingWorkflowPreview = {
  title: string;
  items: SectionItem[];
  stepsCountLabel: string;
};

type LandingArchitectureDiagram = {
  sourceSystems: string[];
  solivioPipeline: string[];
  salesTeam: SectionItem & {
    actions: string[];
  };
};

type LandingModuleTable = {
  moduleHeader: string;
  contributionHeader: string;
  coreStatus: string;
  extensionStatus: string;
};

type LandingWhyNode = SectionItem & {
  items: string[];
};

export type LandingContent = {
  locale: LandingLocale;
  lang: string;
  path: string;
  alternateLocale: LandingLocale;
  alternatePath: string;
  alternateLabel: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  seo: LandingSeo;
  labels: LandingLabels;
  sectionLabels: LandingSectionLabels;
  nav: {
    product: string;
    architecture: string;
    docs: string;
  };
  hero: {
    h1: string;
    h1Highlight: string;
    body: string;
    facts: string[];
    primary: Link;
    secondary: Link;
    quickStart: string;
    offerNav: string[];
    offerTitle: string;
    offerMeta: string;
    offerStatus: string;
    offerTableHeaders: string[];
    offerRows: string[][];
    offerActions: string[];
  };
  heroPreview: LandingHeroPreview;
  stack: {
    title: string;
    items: string[];
  };
  metrics: {
    items: { value: string; label: string }[];
  };
  what: {
    title: string;
    body: string;
    items: SectionItem[];
  };
  capabilities: {
    title: string;
    body: string;
    items: SectionItem[];
    link: Link;
  };
  workflow: {
    title: string;
    body: string;
    steps: WorkflowStep[];
  };
  workflowPreview: LandingWorkflowPreview;
  architecture: {
    title: string;
    body: string;
    link: Link;
    blocks: SectionItem[];
    note: string;
  };
  architectureDiagram: LandingArchitectureDiagram;
  modules: {
    title: string;
    body: string;
    link: Link;
    items: SectionItem[];
  };
  moduleTable: LandingModuleTable;
  operator: {
    title: string;
    body: string;
    items: SectionItem[];
  };
  why: {
    title: string;
    body: string;
    flow: {
      inbound: string;
      engine: string;
      outbound: string;
    };
    inquiry: LandingWhyNode;
    knowledge: LandingWhyNode;
    outcome: LandingWhyNode;
  };
  finalCta: {
    developerTitle: string;
    developerBody: string;
    developerPrimary: Link;
    developerSecondary: Link;
    businessTitle: string;
    businessBody: string;
    businessPrimary: Link;
  };
  footer: {
    tagline: string;
    product: string;
    resources: string;
    community: string;
  };
};
