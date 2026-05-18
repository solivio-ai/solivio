export type WorkflowStatus = "planned" | "mocked" | "ready";

export type WorkflowStep = {
  id: string;
  title: string;
  owner: "customer" | "system" | "sales";
  status: WorkflowStatus;
  description: string;
};

export const workflowSteps: WorkflowStep[] = [
  {
    id: "request-intake",
    title: "Customer request",
    owner: "customer",
    status: "mocked",
    description: "Raw request text is captured in the system.",
  },
  {
    id: "requirement-extraction",
    title: "Requirement extraction",
    owner: "system",
    status: "mocked",
    description: "The request is reduced to needs, constraints, and missing details.",
  },
  {
    id: "product-matching",
    title: "Product matching",
    owner: "system",
    status: "planned",
    description: "Products are ranked by fit, availability, and replacement options.",
  },
  {
    id: "offer-generation",
    title: "Draft offer",
    owner: "system",
    status: "mocked",
    description: "A draft offer is generated from the matched products.",
  },
  {
    id: "sales-review",
    title: "Sales review",
    owner: "sales",
    status: "planned",
    description: "A salesperson edits, validates, and accepts the final offer.",
  },
];
