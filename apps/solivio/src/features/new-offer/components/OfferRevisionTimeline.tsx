"use client";

import { Clock, RotateCcw, User } from "lucide-react";

import type { OfferRevision } from "@solivio/domain";
import { Skeleton } from "@/components/ui/skeleton";

type OfferRevisionTimelineProps = {
  revisions: OfferRevision[];
  loading: boolean;
  onSelect: (revision: OfferRevision) => void;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString("pl-PL");
}

export function OfferRevisionTimeline({
  revisions,
  loading,
  onSelect,
}: OfferRevisionTimelineProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <RotateCcw size={20} aria-hidden="true" />
        <p>No saved revisions yet.</p>
        <p className="text-xs">Click &ldquo;Save revision&rdquo; to checkpoint the current state.</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-1 p-2">
      {revisions.map((revision, index) => (
        <li key={revision.id}>
          <button
            type="button"
            className="w-full rounded-md border bg-card p-3 text-left text-sm hover:bg-accent transition-colors"
            onClick={() => onSelect(revision)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                Revision {revision.revisionNumber}
                {index === 0 ? (
                  <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                    Latest
                  </span>
                ) : null}
                {revision.acceptedAt ? (
                  <span className="ml-2 rounded bg-green-500/10 px-1.5 py-0.5 text-xs text-green-600 dark:text-green-400">
                    Accepted
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock size={11} aria-hidden="true" />
                {relativeTime(revision.createdAt)}
              </span>
            </div>
            {revision.createdBy && (
              <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <User size={11} aria-hidden="true" />
                {revision.createdBy.name}
              </span>
            )}
          </button>
        </li>
      ))}
    </ol>
  );
}
