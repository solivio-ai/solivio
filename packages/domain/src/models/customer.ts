export type CustomerSource = "manual" | "import" | (string & {});

export type Customer = {
  id: string;
  name: string;
  source: CustomerSource;
};
