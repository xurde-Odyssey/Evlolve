import {
  Award,
  CheckCircle2,
  Circle,
  Crown,
  Flag,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import type {
  JourneyMilestone,
  JourneyMilestoneStatus,
  JourneyMilestoneType,
  JourneySnapshot,
} from "@/types/journey";

type JourneyTimelineProps = {
  journey: JourneySnapshot;
};

const milestoneTypeLabels: Record<JourneyMilestoneType, string> = {
  level: "Level",
  achievement: "Achievement",
  boss: "Boss",
  title: "Title",
  unlock: "Unlock",
  phase: "Phase",
  goal: "Goal",
};

const milestoneIcons: Record<JourneyMilestoneType, LucideIcon> = {
  level: Trophy,
  achievement: Award,
  boss: ShieldCheck,
  title: Crown,
  unlock: Lock,
  phase: Flag,
  goal: Target,
};

export function JourneyTimeline({ journey }: JourneyTimelineProps) {
  const hasMilestones = journey.milestones.length > 0;

  return (
    <div className="space-y-6">
      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Journey position
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">
            Lifetime progression history and near-term path. Highest reached
            stays preserved even if current level changes later.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <JourneyMetric label="Current level" value={journey.currentLevel} />
          <JourneyMetric label="Highest level" value={journey.highestLevel} />
          <JourneyMetric
            label="Completed"
            value={journey.completedMilestoneCount}
            suffix="milestones"
          />
        </div>

        <div className="rounded-md bg-[var(--accent-subtle)] px-4 py-3">
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Current milestone
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {journey.currentMilestoneLabel}
          </p>
        </div>
      </Card>

      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Long-term path
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">
            A single linear record of levels, achievements, goals, bosses,
            titles, phases, and feature previews.
          </p>
        </div>

        {hasMilestones ? (
          <ol className="relative space-y-0" aria-label="Journey milestones">
            {journey.milestones.map((milestone, index) => (
              <JourneyMilestoneItem
                key={milestone.id}
                milestone={milestone}
                isLast={index === journey.milestones.length - 1}
              />
            ))}
          </ol>
        ) : (
          <SystemState
            title={`Level ${journey.currentLevel}`}
            description="Your progression begins here. Meaningful commitments and major milestones will appear along your Journey."
            icon={Flag}
          />
        )}
      </Card>
    </div>
  );
}

function JourneyMetric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="numeric mt-2 font-mono text-3xl font-semibold leading-none text-[var(--foreground)]">
        {value}
      </p>
      {suffix ? (
        <p className="mt-1 text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          {suffix}
        </p>
      ) : null}
    </div>
  );
}

function JourneyMilestoneItem({
  milestone,
  isLast,
}: {
  milestone: JourneyMilestone;
  isLast: boolean;
}) {
  const Icon = milestoneIcons[milestone.type];
  const isCurrent = milestone.status === "current";

  return (
    <li className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
      {!isLast ? (
        <span
          aria-hidden="true"
          className="absolute left-[0.9375rem] top-8 h-[calc(100%-2rem)] w-px bg-[var(--border)]"
        />
      ) : null}

      <span
        className={cn(
          "relative z-10 grid size-8 place-items-center rounded-full border bg-[var(--surface)]",
          milestone.status === "completed" &&
            "border-[var(--border)] text-[var(--foreground-muted)]",
          milestone.status === "current" &&
            "border-[var(--primary)] bg-[var(--foreground)] text-[var(--primary-foreground)]",
          milestone.status === "upcoming" &&
            "border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)]",
        )}
      >
        <MilestoneStateIcon status={milestone.status} />
      </span>

      <article
        className={cn(
          "min-w-0 rounded-md border bg-[var(--background)] p-4",
          milestone.status === "completed" &&
            "border-[var(--border)] text-[var(--foreground-muted)]",
          milestone.status === "current" &&
            "border-[var(--primary)] shadow-[var(--shadow-soft)]",
          milestone.status === "upcoming" &&
            "border-[var(--border)] bg-[var(--surface-elevated)]",
        )}
        aria-current={isCurrent ? "step" : undefined}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={getBadgeTone(milestone.status)}>
                {milestone.status === "current"
                  ? "Current"
                  : milestoneTypeLabels[milestone.type]}
              </Badge>
              {milestone.level ? (
                <span className="numeric font-mono text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                  Level {milestone.level}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex min-w-0 items-start gap-3">
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  isCurrent
                    ? "text-[var(--foreground)]"
                    : "text-[var(--foreground-muted)]",
                )}
                focusable="false"
                strokeWidth={1.9}
              />
              <div className="min-w-0">
                <h2
                  className={cn(
                    "text-base font-semibold text-[var(--foreground)]",
                    milestone.status === "upcoming" &&
                      "text-[var(--foreground)]",
                  )}
                >
                  {milestone.title}
                </h2>
                {milestone.description ? (
                  <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                    {milestone.description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <MilestoneMeta milestone={milestone} />
        </div>

        {milestone.reward ? (
          <div className="mt-4 rounded-md bg-[var(--surface)] px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles
                aria-hidden="true"
                className="size-4 shrink-0 text-[var(--foreground-muted)]"
                focusable="false"
                strokeWidth={1.9}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                  {milestone.reward.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  {milestone.reward.detail}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </article>
    </li>
  );
}

function MilestoneStateIcon({ status }: { status: JourneyMilestoneStatus }) {
  if (status === "completed") {
    return (
      <CheckCircle2
        aria-hidden="true"
        className="size-4"
        focusable="false"
        strokeWidth={1.9}
      />
    );
  }

  if (status === "current") {
    return (
      <Circle
        aria-hidden="true"
        className="size-3 fill-current"
        focusable="false"
        strokeWidth={1.9}
      />
    );
  }

  return (
    <Circle
      aria-hidden="true"
      className="size-4"
      focusable="false"
      strokeWidth={1.9}
    />
  );
}

function MilestoneMeta({ milestone }: { milestone: JourneyMilestone }) {
  if (milestone.completedAt) {
    return (
      <p className="shrink-0 text-left text-xs font-semibold uppercase text-[var(--foreground-muted)] sm:text-right">
        Reached {milestone.completedAt}
      </p>
    );
  }

  if (milestone.status === "upcoming") {
    return (
      <p className="shrink-0 text-left text-xs font-semibold uppercase text-[var(--foreground-muted)] sm:text-right">
        Upcoming
      </p>
    );
  }

  return null;
}

function getBadgeTone(status: JourneyMilestoneStatus) {
  if (status === "current") {
    return "warning";
  }

  if (status === "completed") {
    return "success";
  }

  return "neutral";
}
