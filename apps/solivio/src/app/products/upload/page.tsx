import { ProductImport } from "../../../features/product-import";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Import products" };

export default function ProductUploadPage() {
  return (
    <main className="mx-auto grid max-w-[1180px] gap-4 p-4">
      <header className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <Badge className="w-fit" variant="secondary">
            Products
          </Badge>
          <h1 className="text-2xl leading-tight font-semibold text-foreground">Import products</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Upload a CSV catalog, preview parsed rows, then save embeddings behind the server API.
          </p>
        </div>
      </header>
      <ProductImport />
    </main>
  );
}
