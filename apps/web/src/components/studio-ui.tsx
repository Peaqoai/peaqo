"use client";

// Shared bits for the Image / Video studio prototype UIs.
// ponytail: presentational only — no real generation backend behind these.
import * as React from "react";
import { cn } from "@repo/ui/lib/utils";

export function Placeholder({
  hue = 265,
  label,
  className,
}: {
  hue?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("relative grid size-full place-items-center overflow-hidden", className)}
      style={{
        background: `linear-gradient(140deg, hsl(${hue} 68% 56%), hsl(${(hue + 55) % 360} 64% 44%))`,
      }}
    >
      {label && (
        <span className="rounded-md bg-black/40 px-2 py-1 font-mono text-[11px] text-white">
          {label}
        </span>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-muted-foreground text-xs font-semibold">{label}</label>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground text-xs font-bold uppercase tracking-wide",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Seg<T extends string>({
  value,
  onChange,
  options,
  wrap,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; title?: string }[];
  wrap?: boolean;
}) {
  return (
    <div className={cn("bg-muted flex gap-1 rounded-[10px] p-[3px]", wrap && "flex-wrap")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          data-on={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "text-muted-foreground rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
            "data-[on=true]:bg-card data-[on=true]:text-foreground data-[on=true]:shadow-sm",
            wrap ? "flex-[1_1_45%]" : "flex-1"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
