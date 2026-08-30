import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" &&
          "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)]",
        tone === "accent" &&
          "border-[var(--border)] bg-[var(--accent-subtle)] text-[var(--accent)]",
        tone === "success" &&
          "border-[var(--border)] bg-[var(--success-subtle)] text-[var(--success)]",
        tone === "warning" &&
          "border-[var(--border)] bg-[var(--warning-subtle)] text-[var(--warning)]",
      )}
    >
      {children}
    </span>
  );
}
