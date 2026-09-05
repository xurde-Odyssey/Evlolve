import { Card } from "@/components/ui/card";

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
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Current Level
          </p>
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
          <p className="mt-1 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Highest Level
          </p>
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
        </div>
        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
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
