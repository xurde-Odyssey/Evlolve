import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Award } from "lucide-react";

export type OverallProgression = {
  level: number;
  highestLevel: number;
  currentXp: number;
  levelStateLabel?: string;
};

type ProgressionCardProps = {
  progression: OverallProgression;
};

const numberFormatter = new Intl.NumberFormat("en-US");

export function ProgressionCard({ progression }: ProgressionCardProps) {
  const currentXp = Math.max(progression.currentXp, 0);
  const currentXpText = `${numberFormatter.format(currentXp)} XP`;

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
            <Badge tone="success">Current Level</Badge>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="numeric font-mono text-4xl font-semibold leading-none text-[var(--foreground)]">
              {progression.level}
            </span>
            <span className="text-sm font-semibold text-[var(--foreground-muted)]">
              Current Level
            </span>
          </div>
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-right">
          <p className="numeric font-mono text-3xl font-semibold leading-none text-[var(--foreground)]">
            {progression.highestLevel}
          </p>
          <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            <Award aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
            Highest Level
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Lifetime XP
          </p>
          <p className="numeric mt-1 font-mono text-base font-semibold text-[var(--foreground)]">
            {currentXpText}
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--surface-elevated)]" aria-hidden="true">
            <div
              className="h-full rounded-full bg-[var(--accent-pro)]"
              style={{ width: `${Math.min(currentXp, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            <ArrowUpRight aria-hidden="true" className="size-3.5 text-[var(--success)]" strokeWidth={1.9} />
            Progression state
          </p>
          <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
            {progression.levelStateLabel ?? "Stable"}
          </p>
        </div>
      </div>
    </Card>
  );
}
