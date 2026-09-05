import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";

export type CharacterIdentityData = {
  name: string;
  level: number;
  highestLevel: number;
  currentXp: number;
  levelStateLabel?: string;
  title?: string;
  streakDays?: number;
  bestStreakDays?: number;
  avatarUrl?: string;
};

type DashboardIdentityProps = {
  character: CharacterIdentityData;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const numberFormatter = new Intl.NumberFormat("en-US");

export function DashboardIdentity({ character }: DashboardIdentityProps) {
  const boundedCurrentXp = Math.max(character.currentXp, 0);
  const initials = getInitials(character.name) || "EV";

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8 lg:p-7">
        <div className="min-w-0 space-y-6">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] bg-cover bg-center text-sm font-semibold text-[var(--foreground)]"
              role={character.avatarUrl ? "img" : undefined}
              aria-label={character.avatarUrl ? `${character.name} avatar` : undefined}
              style={
                character.avatarUrl
                  ? { backgroundImage: `url(${character.avatarUrl})` }
                  : undefined
              }
            >
              {character.avatarUrl ? null : initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[var(--foreground)] sm:text-lg">
                Good afternoon, {character.name}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                Continue evolving.
              </p>
            </div>
          </div>

          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                  Overall level
                </p>
                <p className="numeric mt-1 font-mono text-5xl font-semibold leading-none text-[var(--foreground)] sm:text-6xl">
                  LV. {character.level}
                </p>
              </div>
              <p className="numeric font-mono text-sm font-semibold text-[var(--foreground)] sm:text-base">
                Highest Level {character.highestLevel}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                  Lifetime XP
                </p>
                <p className="numeric mt-1 font-mono text-lg font-semibold text-[var(--foreground)]">
                  {numberFormatter.format(boundedCurrentXp)}
                </p>
              </div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                  Current direction
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                  {character.levelStateLabel ?? "Stable"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="grid min-w-0 gap-3 sm:grid-cols-2 lg:w-52 lg:grid-cols-1 lg:content-start">
          {character.title ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                Title
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {character.title}
              </p>
            </div>
          ) : null}

          {typeof character.streakDays === "number" ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                Context
              </p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <Flame
                    aria-hidden="true"
                    className="size-4 text-[var(--accent-pro)]"
                    strokeWidth={1.9}
                  />
                  <span>{character.streakDays} day streak</span>
                </div>
                {typeof character.bestStreakDays === "number" ? (
                  <div className="flex items-baseline justify-between gap-3 rounded-md bg-[var(--surface-elevated)] px-3 py-2">
                    <span className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                      Best
                    </span>
                    <span className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
                      {character.bestStreakDays} days
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </Card>
  );
}
