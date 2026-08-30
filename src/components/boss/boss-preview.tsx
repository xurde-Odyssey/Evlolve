import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { BossChallenge } from "@/types/boss";

type BossPreviewProps = {
  challenge?: BossChallenge;
};

export function BossPreview({ challenge }: BossPreviewProps) {
  if (!challenge) {
    return null;
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge tone="warning">
            {challenge.status === "offered" ? "Boss Challenge" : "Active Boss"}
          </Badge>
          <h2 className="mt-3 text-lg font-semibold text-[var(--foreground)]">
            {challenge.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
            {formatBossValue(challenge.measurement.target, challenge.measurement.unit)}
          </p>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--boss-subtle)] text-[var(--boss)]">
          <ShieldAlert
            aria-hidden="true"
            className="size-5"
            focusable="false"
            strokeWidth={1.9}
          />
        </div>
      </div>

      <Link
        href="/goals"
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]"
      >
        View Challenge
      </Link>
    </Card>
  );
}

function formatBossValue(value: number, unit: string) {
  return `${value.toLocaleString("en-US")} ${unit}`;
}
