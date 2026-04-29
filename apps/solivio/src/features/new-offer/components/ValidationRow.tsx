import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function ValidationRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-foreground/15 bg-background/60 p-3 text-sm">
      {ok ? (
        <CheckCircle2 size={16} aria-hidden="true" className="shrink-0 text-primary" />
      ) : (
        <AlertTriangle size={16} aria-hidden="true" className="shrink-0 text-destructive" />
      )}
      <span className="min-w-0">{text}</span>
    </div>
  );
}
