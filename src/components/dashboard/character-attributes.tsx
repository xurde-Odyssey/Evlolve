import {
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck2,
  Dumbbell,
  Footprints,
  HeartPulse,
  MessageCircle,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { getLocalDateKey } from "@/application/evolve/time-policy";

export type CharacterAttributeKey =
  | "training"
  | "reading"
  | "running"
  | "health"
  | "discipline"
  | "career"
  | "social";

export type CharacterAttribute = {
  key: CharacterAttributeKey;
  label: string;
  value: string;
  context: string;
  progress: number;
};

type CharacterAttributesProps = {
  attributes: CharacterAttribute[];
  now: string;
  timezone: string;
};

const dailyPrinciples = [
  "Control the next action, not the entire outcome.",
  "A standard is built by repeated ordinary decisions.",
  "Make the important thing easy to begin.",
  "Keep the promise small enough to keep.",
  "Measure the work. Adjust the method.",
  "Do not trade a durable standard for a temporary feeling.",
  "What is repeated becomes structure.",
  "Finish the essential before adding the impressive.",
  "Let evidence refine the plan.",
  "A calm system outlasts a dramatic effort.",
  "Protect the work that keeps other work possible.",
  "Consistency is a decision made again today.",
];

const attributeIcons: Record<CharacterAttributeKey, LucideIcon> = {
  training: Dumbbell,
  reading: BookOpen,
  running: Footprints,
  health: HeartPulse,
  discipline: CalendarCheck2,
  career: BriefcaseBusiness,
  social: UsersRound,
};

export function CharacterAttributes({ attributes, now, timezone }: CharacterAttributesProps) {
  const dateKey = getLocalDateKey(now, timezone);
  const dayNumber = Number(dateKey.replaceAll("-", ""));
  const principle = dailyPrinciples[dayNumber % dailyPrinciples.length];

  return (
    <Card className="flex h-full flex-col space-y-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Progress snapshot
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            Current activity record
          </h2>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--accent-pro)] text-white shadow-[0_6px_16px_color-mix(in_srgb,var(--accent-pro)_20%,transparent)]">
          <MessageCircle
            aria-hidden="true"
            className="size-4"
            focusable="false"
            strokeWidth={1.9}
          />
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {attributes.map((attribute) => {
          const Icon = attributeIcons[attribute.key];
          const displayPercent = Math.min(Math.max(attribute.progress, 0), 100);

          return (
            <div key={attribute.key} className="min-w-0 border-b border-[var(--border)] py-3 first:pt-0 last:border-b-0 last:pb-0">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {attribute.label}
                  </p>
                  <p className="numeric mt-2 font-mono text-xl font-semibold text-[var(--foreground)]">
                    {attribute.value}
                  </p>
                  <p className="mt-1 truncate text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                    {attribute.context}
                  </p>
                </div>
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-subtle)] text-[var(--accent-pro)]">
                  <Icon
                    aria-hidden="true"
                    className="size-4"
                    focusable="false"
                    strokeWidth={1.9}
                  />
                </span>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-elevated)]"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-[var(--xp)]"
                  style={{ width: `${displayPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="daily-principle-paper mt-5 flex min-h-36 flex-1 flex-col justify-center px-5 py-5">
        <div className="flex items-center gap-2 text-[var(--accent-pro)]">
          <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.9} />
          <p className="text-xs font-semibold uppercase tracking-[0.08em]">
            Daily principle
          </p>
        </div>
        <blockquote className="mt-3 max-w-sm border-l-2 border-[var(--accent-pro)]/50 pl-4 font-mono text-xl font-semibold leading-8 text-[var(--foreground)] sm:text-2xl sm:leading-9">
          {principle}
        </blockquote>
      </div>
    </Card>
  );
}
