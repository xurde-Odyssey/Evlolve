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
};

const attributeIcons: Record<CharacterAttributeKey, LucideIcon> = {
  training: Dumbbell,
  reading: BookOpen,
  running: Footprints,
  health: HeartPulse,
  discipline: CalendarCheck2,
  career: BriefcaseBusiness,
  social: UsersRound,
};

export function CharacterAttributes({ attributes }: CharacterAttributesProps) {
  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Progress snapshot
          </p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            Current activity record
          </h2>
        </div>
        <MessageCircle
          aria-hidden="true"
          className="size-5 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {attributes.map((attribute) => {
          const Icon = attributeIcons[attribute.key];
          const displayPercent = Math.min(Math.max(attribute.progress, 0), 100);

          return (
            <div
              key={attribute.key}
              className="min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] p-3"
            >
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
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--surface-elevated)] text-[var(--foreground)]">
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
    </Card>
  );
}
