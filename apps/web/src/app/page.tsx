import { ApiStatus } from "../components/ApiStatus";
import { RequestWorkbench } from "../components/RequestWorkbench";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Open-source sales workflow</p>
          <h1>Solivio</h1>
        </div>
        <ApiStatus />
      </header>
      <RequestWorkbench />
    </main>
  );
}
