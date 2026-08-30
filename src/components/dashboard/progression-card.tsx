import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export type OverallProgression = {
  level: number;
  currentXp: number;
  nextLevelXp: number;
};

type ProgressionCardProps = {
  progression: OverallProgression;
};

const numberFormatter = new Intl.NumberFormat("en-US");

export function ProgressionCard({ progression }: ProgressionCardProps) {
  const currentXp = Math.max(progression.currentXp, 0);
  const targetXp = Math.max(progression.nextLevelXp, 0);
  const progressPercent =
    targetXp > 0 ? Math.min(Math.round((currentXp / targetXp) * 100), 100) : 0;
  const remainingXp = Math.max(targetXp - currentXp, 0);
  const nextLevel = progression.level + 1;
  const currentXpText = `${numberFormatter.format(currentXp)} XP`;
  const targetXpText = `${numberFormatter.format(targetXp)} XP`;
  const remainingText = `${numberFormatter.format(
    remainingXp,
  )} XP until Level ${nextLevel}`;

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Level progress
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="numeric font-mono text-4xl font-semibold leading-none text-[var(--foreground)]">
              {progression.level}
            </span>
            <span className="text-sm font-semibold text-[var(--foreground-muted)]">
              toward Level {nextLevel}
            </span>
          </div>
        </div>

        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-right">
          <p className="numeric font-mono text-3xl font-semibold leading-none text-[var(--foreground)]">
            {progressPercent}%
          </p>
          <p className="mt-1 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            complete
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Progress
          value={progressPercent}
          ariaLabel={`Progress toward Level ${nextLevel}`}
          ariaValueText={`${currentXpText} of ${targetXpText}`}
        />
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="numeric font-mono font-semibold text-[var(--foreground)]">
            {currentXpText}
          </span>
          <span className="numeric font-mono font-semibold text-[var(--foreground)] sm:text-right">
            {targetXpText}
          </span>
        </div>
      </div>

      <div className="rounded-md bg-[var(--accent-subtle)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {remainingText}
        </p>
      </div>
    </Card>
  );
}
