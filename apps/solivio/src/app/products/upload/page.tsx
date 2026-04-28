import { ProductImport } from "../../../features/product-import";

export const metadata = { title: "Import products — Solivio" };

export default function ProductUploadPage() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Products</p>
          <h1>Import products</h1>
        </div>
      </header>
      <ProductImport />
    </main>
  );
}
