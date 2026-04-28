import { ProductImport } from "../../../features/product-import";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Import products" };

export default function ProductUploadPage() {
  return (
    <main className="mx-auto grid max-w-[1180px] gap-5 p-6 max-sm:p-4">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-4">
          <BrandLockup tagline="Solivio uses context from your business: product data." />
          <div className="grid gap-2">
            <Badge className="w-fit" variant="secondary">
              Products
            </Badge>
            <h1 className="text-3xl leading-tight font-semibold text-foreground">Import products</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Upload a CSV catalog, preview the parsed rows, then save embeddings behind the server API boundary.
            </p>
          </div>
        </div>
      </header>
      <ProductImport />
    </main>
  );
}
