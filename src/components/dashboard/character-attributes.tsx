import {
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Dumbbell,
  HeartPulse,
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";

export type CharacterAttributeKey =
  | "strength"
  | "intelligence"
  | "knowledge"
  | "health"
  | "discipline"
  | "career"
  | "social";

export type CharacterAttribute = {
  key: CharacterAttributeKey;
  label: string;
  level: number;
};

type CharacterAttributesProps = {
  attributes: CharacterAttribute[];
};

const attributeIcons: Record<CharacterAttributeKey, LucideIcon> = {
  strength: Dumbbell,
  intelligence: Brain,
  knowledge: BookOpen,
  health: HeartPulse,
  discipline: Target,
  career: BriefcaseBusiness,
  social: UsersRound,
};

// Temporary visualization scale only. This is not the attribute progression model.
const DISPLAY_MAX_ATTRIBUTE_LEVEL = 30;

export function CharacterAttributes({ attributes }: CharacterAttributesProps) {
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Character attributes
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">
          Current development profile across Evolve&apos;s core domains.
        </p>
      </div>

      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
        {attributes.map((attribute) => {
          const Icon = attributeIcons[attribute.key];
          const displayPercent = Math.min(
            (Math.max(attribute.level, 0) / DISPLAY_MAX_ATTRIBUTE_LEVEL) * 100,
            100,
          );

          return (
            <div key={attribute.key} className="min-w-0 space-y-2">
              <div className="flex min-w-0 items-center gap-3">
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-[var(--foreground-muted)]"
                  focusable="false"
                  strokeWidth={1.9}
                />
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {attribute.label}
                  </p>
                  <p className="numeric shrink-0 font-mono text-sm font-semibold text-[var(--foreground)]">
                    {attribute.level}
                  </p>
                </div>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-elevated)]"
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
