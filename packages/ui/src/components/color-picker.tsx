"use client";

import { Ban, Check } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils";

export const COLOR_PALETTE = [
  "#F6C215",
  "#F59E0B",
  "#F97316",
  "#EF4444",
  "#DC2626",
  "#EC4899",
  "#D946EF",
  "#A855F7",
  "#8B5CF6",
  "#6366F1",
  "#3B82F6",
  "#0EA5E9",
  "#06B6D4",
  "#14B8A6",
  "#10B981",
  "#22C55E",
  "#84CC16",
  "#A3A3A3",
  "#78716C",
  "#0F172A",
  "#1E40AF",
] as const;

type Props = {
  value: string | null;
  onChange: (color: string | null) => void;
  className?: string;
};

function ColorPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn("flex flex-wrap gap-1.5 rounded-md border border-border p-2", className)}>
      {/* None option */}
      <button
        type="button"
        onClick={() => onChange(null)}
        title="None"
        className={cn(
          "relative size-6 rounded-full border border-border bg-muted transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          value === null && "ring-2 ring-ring ring-offset-2",
        )}
      >
        <Ban size={12} className="absolute inset-0 m-auto text-muted-foreground" />
      </button>

      {COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          title={color}
          className={cn(
            "relative size-6 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            value === color && "ring-2 ring-ring ring-offset-2",
          )}
          style={{ backgroundColor: color }}
        >
          {value === color && (
            <Check
              size={11}
              strokeWidth={3}
              className="absolute inset-0 m-auto text-white drop-shadow-sm"
            />
          )}
        </button>
      ))}
    </div>
  );
}

export { ColorPicker };
