import { ApiStatus, RequestWorkbench, UserMenu } from "../features/request-workbench";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1440px] p-6 max-sm:p-4">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h1 className="text-4xl leading-none font-semibold tracking-tight sm:text-5xl lg:text-[58px]">Solivio</h1>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <ApiStatus />
        </div>
      </header>
      <RequestWorkbench />
    </main>
  );
}
