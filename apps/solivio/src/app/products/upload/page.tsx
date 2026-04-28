import { ProductImport } from "../../../features/product-import";

export const metadata = { title: "Import products — Solivio" };

export default function ProductUploadPage() {
  return (
    <main className="mx-auto max-w-[1440px] p-6 max-sm:p-4">
      <header className="mb-6">
        <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-primary">
          Products
        </p>
        <h1 className="text-4xl font-semibold leading-none tracking-tight sm:text-5xl">
          Import products
        </h1>
      </header>
      <ProductImport />
    </main>
  );
}
