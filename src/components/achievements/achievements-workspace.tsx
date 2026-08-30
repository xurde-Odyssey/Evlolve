"use client";

import { useMemo, useState } from "react";
import {
  Award,
  Crown,
  LockKeyhole,
  ShieldCheck,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SystemState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import type {
  Achievement,
  AchievementCategory,
  AchievementSnapshot,
  AchievementStatus,
  UserTitle,
} from "@/types/achievement";

type AchievementsWorkspaceProps = {
  snapshot: AchievementSnapshot;
};

type CategoryFilter = "all" | AchievementCategory;

const categoryFilters: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "milestone", label: "Milestone" },
  { key: "mastery", label: "Mastery" },
  { key: "discipline", label: "Discipline" },
  { key: "boss", label: "Boss" },
  { key: "lifetime", label: "Lifetime" },
];

const categoryLabels: Record<AchievementCategory, string> = {
  milestone: "Milestone",
  mastery: "Mastery",
  discipline: "Discipline",
  boss: "Boss",
  lifetime: "Lifetime",
};

const statusLabels: Record<AchievementStatus, string> = {
  earned: "Earned",
  in_progress: "In Progress",
  locked: "Locked",
};

const categoryIcons: Record<AchievementCategory, LucideIcon> = {
  milestone: Trophy,
  mastery: Target,
  discipline: ShieldCheck,
  boss: Award,
  lifetime: Crown,
};

export function AchievementsWorkspace({ snapshot }: AchievementsWorkspaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");
  const [titles, setTitles] = useState(snapshot.titles);
  const visibleAchievements = useMemo(
    () =>
      selectedCategory === "all"
        ? snapshot.achievements
        : snapshot.achievements.filter(
            (achievement) => achievement.category === selectedCategory,
          ),
    [selectedCategory, snapshot.achievements],
  );
  const selectedTitle =
    titles.find((title) => title.selected) ??
    titles.find((title) => title.eligibility === "active");
  const earnedCount = snapshot.achievements.filter(
    (achievement) => achievement.status === "earned",
  ).length;
  const inProgressCount = snapshot.achievements.filter(
    (achievement) => achievement.status === "in_progress",
  ).length;
  const majorCount = snapshot.achievements.filter(
    (achievement) => achievement.major,
  ).length;

  function selectTitle(titleId: string) {
    setTitles((currentTitles) =>
      currentTitles.map((title) => ({
        ...title,
        selected: title.id === titleId && title.eligibility === "active",
      })),
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <AchievementSummary
          earnedCount={earnedCount}
          inProgressCount={inProgressCount}
          majorCount={majorCount}
        />
        <TitlePanel
          selectedTitle={selectedTitle}
          titles={titles}
          onSelectTitle={selectTitle}
        />
      </div>

      <Card className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Achievement library
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
              Permanent records of demonstrated growth.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 sm:flex"
            aria-label="Achievement category"
            role="tablist"
          >
            {categoryFilters.map((filter) => (
              <button
                key={filter.key}
                className={cn(
                  "min-h-10 rounded-md px-3 py-2 text-sm font-semibold text-[var(--foreground-muted)] transition",
                  selectedCategory === filter.key &&
                    "bg-[var(--background)] text-[var(--foreground)] shadow-[var(--shadow-soft)]",
                )}
                onClick={() => setSelectedCategory(filter.key)}
                role="tab"
                type="button"
                aria-selected={selectedCategory === filter.key}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {visibleAchievements.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
              />
            ))}
          </div>
        ) : (
          <SystemState
            title="No achievements earned yet."
            description="Your first meaningful achievements will appear as progress becomes measurable."
            icon={Trophy}
          />
        )}
      </Card>
    </div>
  );
}

function AchievementSummary({
  earnedCount,
  inProgressCount,
  majorCount,
}: {
  earnedCount: number;
  inProgressCount: number;
  majorCount: number;
}) {
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Overview
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
          Fewer, harder, more meaningful.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        <SummaryMetric label="Earned" value={earnedCount} />
        <SummaryMetric label="In progress" value={inProgressCount} />
        <SummaryMetric label="Major" value={majorCount} />
      </div>
    </Card>
  );
}

function TitlePanel({
  selectedTitle,
  titles,
  onSelectTitle,
}: {
  selectedTitle?: UserTitle;
  titles: UserTitle[];
  onSelectTitle: (titleId: string) => void;
}) {
  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Display title
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
            {selectedTitle?.name ?? "No title selected"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
            Selected from currently active titles.
          </p>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--achievement-subtle)] text-[var(--achievement)]">
          <Crown
            aria-hidden="true"
            className="size-5"
            focusable="false"
            strokeWidth={1.9}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Title history
        </legend>
        {titles.length > 0 ? (
          titles.map((title) => (
          <label
            key={title.id}
            className={cn(
              "flex min-w-0 items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-3",
              title.eligibility === "inactive" && "opacity-70",
            )}
          >
            <input
              className="mt-1"
              type="radio"
              name="display-title"
              checked={title.selected}
              disabled={title.eligibility === "inactive"}
              onChange={() => onSelectTitle(title.id)}
              aria-label={`Select ${title.name} as display title`}
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {title.name}
                </span>
                <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--foreground-muted)]">
                  {title.eligibility}
                </span>
              </span>
              <span className="mt-1 block text-sm leading-6 text-[var(--foreground-muted)]">
                Earned {title.earnedAt}
              </span>
            </span>
          </label>
          ))
        ) : (
          <SystemState
            title="No title earned yet."
            description="Status titles appear after eligible accomplishments are earned."
            icon={Crown}
            compact
          />
        )}
      </fieldset>
    </Card>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const isHidden = achievement.hiddenUntilEarned && achievement.status !== "earned";
  const Icon = isHidden ? LockKeyhole : categoryIcons[achievement.category];
  const title = isHidden ? "???" : achievement.title;
  const description = isHidden
    ? "Continue progressing to discover this achievement."
    : achievement.description;

  return (
    <article
      className={cn(
        "min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] p-4",
        achievement.major && "bg-[var(--achievement-subtle)]",
      )}
      aria-label={`${title}, ${statusLabels[achievement.status]}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)]">
          <Icon
            aria-hidden="true"
            className="size-5"
            focusable="false"
            strokeWidth={1.9}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getStatusTone(achievement.status)}>
              {statusLabels[achievement.status]}
            </Badge>
            <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-1 text-xs font-semibold text-[var(--foreground-muted)]">
              {isHidden ? "Hidden" : categoryLabels[achievement.category]}
            </span>
            {achievement.major ? (
              <span className="rounded-md bg-[var(--background)] px-2 py-1 text-xs font-semibold text-[var(--foreground)]">
                Major
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-base font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
            {description}
          </p>

          {!isHidden && achievement.tierLabel ? (
            <p className="mt-3 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Tier {achievement.tierLabel}
            </p>
          ) : null}

          {!isHidden && achievement.progress ? (
            <div className="mt-4">
              <Progress
                value={(achievement.progress.current / achievement.progress.target) * 100}
                ariaLabel={`${achievement.title} progress`}
                ariaValueText={`${formatProgress(achievement)} complete`}
                label={formatProgress(achievement)}
              />
              {achievement.status !== "earned" ? (
                <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                  {formatRemaining(achievement)}
                </p>
              ) : null}
            </div>
          ) : null}

          {achievement.earnedAt ? (
            <p className="mt-4 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Earned {achievement.earnedAt}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="numeric mt-2 font-mono text-3xl font-semibold leading-none text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function getStatusTone(status: AchievementStatus) {
  if (status === "earned") {
    return "success";
  }

  if (status === "in_progress") {
    return "warning";
  }

  return "neutral";
}

function formatProgress(achievement: Achievement) {
  if (!achievement.progress) {
    return "";
  }

  const unit = achievement.progress.unit ? ` ${achievement.progress.unit}` : "";

  return `${achievement.progress.current} / ${achievement.progress.target}${unit}`;
}

function formatRemaining(achievement: Achievement) {
  if (!achievement.progress) {
    return "";
  }

  const remaining = Math.max(
    achievement.progress.target - achievement.progress.current,
    0,
  );
  const unit = achievement.progress.unit ? ` ${achievement.progress.unit}` : "";

  return `${remaining}${unit} remaining`;
}
