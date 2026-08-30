import { CirclePause, Target } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { ImprovementArea } from "@/types/improvement";

type ImprovementsPreviewProps = {
  areas: ImprovementArea[];
  capacity: number;
};

export function ImprovementsPreview({ areas, capacity }: ImprovementsPreviewProps) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Active improvements
          </p>
          <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
            {areas.length} / {capacity} commitments
          </p>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--improvement-core-subtle)] text-[var(--foreground)]">
          <Target
            aria-hidden="true"
            className="size-5"
            focusable="false"
            strokeWidth={1.9}
          />
        </div>
      </div>

      <ul className="flex flex-wrap gap-2">
        {areas.slice(0, 4).map((area) => (
          <li
            key={area.id}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground-muted)]"
          >
            {area.status === "inactive" ? (
              <CirclePause
                aria-hidden="true"
                className="size-3"
                focusable="false"
                strokeWidth={1.9}
              />
            ) : null}
            {area.title}
          </li>
        ))}
      </ul>

      <Link
        href="/settings"
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]"
      >
        Manage Commitments
      </Link>
    </Card>
  );
}
