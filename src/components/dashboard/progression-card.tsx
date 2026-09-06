import { Card } from "@/components/ui/card";
import { ArrowUpRight, Award, Gauge, Zap } from "lucide-react";

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
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
            Progression
          </p>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Your current development position
          </p>
        </div>
        <Gauge aria-hidden="true" className="size-5 text-[var(--accent-pro)]" strokeWidth={1.8} />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <ProgressionMetric
          icon={Gauge}
          label="Current Level"
          value={String(progression.level)}
          emphasis
        />
        <ProgressionMetric
          icon={Award}
          label="Highest Level"
          value={String(progression.highestLevel)}
        />
        <ProgressionMetric
          icon={Zap}
          label="Lifetime XP"
          value={currentXpText}
          progress={Math.min(currentXp, 100)}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
          <ArrowUpRight aria-hidden="true" className="size-3.5 text-[var(--accent-pro)]" strokeWidth={1.9} />
          Current direction
        </span>
        <span className="text-sm font-semibold text-[var(--foreground)]">
          {progression.levelStateLabel ?? "Stable"}
        </span>
      </div>
    </Card>
  );
}

function ProgressionMetric({
  icon: Icon,
  label,
  value,
  progress,
  emphasis = false,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  progress?: number;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-3">
      <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent-pro)]">
          <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.9} />
        </span>
        <span className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.06em]">{label}</span>
      </div>
      <p className={`numeric mt-3 truncate font-mono font-semibold text-[var(--foreground)] ${emphasis ? "text-3xl" : "text-xl"}`}>
        {value}
      </p>
      {typeof progress === "number" ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--surface-elevated)]" aria-hidden="true">
          <div className="h-full rounded-full bg-[var(--accent-pro)]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}
