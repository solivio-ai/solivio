export type RequestSource = "manual" | "chat" | "email" | (string & {});

export type CustomerRequest = {
  id: string;
  customerId: string | null;
  rawText: string;
  source: RequestSource;
};
