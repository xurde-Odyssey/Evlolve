import Link from "next/link";
import { ArrowUpRight, Award, Flame, Plus, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CoreStone } from "@/components/profile/core-stone";
import { getCoreStoneStage } from "@/components/profile/core-stone-stage";

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

const numberFormatter = new Intl.NumberFormat("en-US");

export function DashboardIdentity({ character }: DashboardIdentityProps) {
  const boundedCurrentXp = Math.max(character.currentXp, 0);
  const stage = getCoreStoneStage(character.level);

  return (
    <Card className="overflow-hidden p-0">
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_5%,transparent)]">
              <CoreStone level={character.level} highestLevel={character.highestLevel} size="sm" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[var(--foreground)] sm:text-lg">Good afternoon, {character.name}</p>
              <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]">Continue evolving · {stage.key}</p>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[var(--accent-pro)]/30 bg-[var(--accent-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-pro)] sm:flex">
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            {character.levelStateLabel ?? "Stable"}
          </div>
        </div>

        <div className="my-6 border-t border-[var(--border)]" />

        <div className="grid gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">Overall level</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="numeric font-mono text-6xl font-semibold leading-none tracking-tight text-[var(--foreground)] sm:text-7xl">{character.level}</p>
              <div className="pb-1">
                <p className="text-sm font-semibold text-[var(--foreground-muted)]">Current Level</p>
                <p className="numeric mt-1 font-mono text-xs text-[var(--foreground-muted)]">Highest {character.highestLevel}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-[var(--foreground-muted)] sm:hidden"><ArrowUpRight aria-hidden="true" className="size-3.5 text-[var(--accent-pro)]" />Current direction: <span className="font-semibold text-[var(--foreground)]">{character.levelStateLabel ?? "Stable"}</span></p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InsightTile label="Current title" value={character.title ?? "Evolving"} />
            <InsightTile icon={Flame} label="Streak context" value={`${character.streakDays ?? 0} day streak`} detail={`Best ${character.bestStreakDays ?? 0} days`} />
          </div>
        </div>

        <div className="my-6 border-t border-[var(--border)]" />

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">XP progress</p>
            <p className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">{numberFormatter.format(boundedCurrentXp)} XP</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-elevated)]" role="progressbar" aria-label="Lifetime XP progress" aria-valuenow={Math.min(boundedCurrentXp, 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[var(--accent-pro)] transition-[width] [transition-duration:var(--motion-duration-panel)]" style={{ width: `${Math.min(boundedCurrentXp, 100)}%` }} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)] pt-4">
          <FooterMetric icon={Zap} label="Lifetime XP" value={`${numberFormatter.format(boundedCurrentXp)} XP`} />
          <FooterMetric icon={Flame} label="Total streak" value={`${character.streakDays ?? 0} day`} />
          <FooterMetric icon={Award} label="Highest level" value={`LV. ${character.highestLevel}`} />
        </div>

        <Link href="/activities" className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--accent-pro)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_color-mix(in_srgb,var(--accent-pro)_22%,transparent)] transition hover:brightness-95 focus-visible:outline-offset-2 sm:hidden">
          <Plus aria-hidden="true" className="size-4" />
          Log activity
        </Link>
      </div>
    </Card>
  );
}

function InsightTile({ icon: Icon, label, value, detail }: { icon?: typeof Award; label: string; value: string; detail?: string }) {
  return <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3.5"><div className="flex items-center gap-2 text-[var(--foreground-muted)]">{Icon ? <Icon aria-hidden="true" className="size-4 text-[var(--accent-pro)]" strokeWidth={1.8} /> : null}<span className="text-xs font-semibold uppercase tracking-[0.07em]">{label}</span></div><p className="mt-3 truncate text-base font-semibold text-[var(--foreground)]">{value}</p>{detail ? <p className="mt-1 text-xs text-[var(--foreground-muted)]">{detail}</p> : null}</div>;
}

function FooterMetric({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return <div className="min-w-0 px-2 text-center first:pl-0 last:pr-0"><div className="flex items-center justify-center gap-1.5 text-[var(--foreground-muted)]"><Icon aria-hidden="true" className="size-3.5 text-[var(--accent-pro)]" strokeWidth={1.8} /><span className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.06em] sm:text-xs">{label}</span></div><p className="numeric mt-1.5 truncate font-mono text-sm font-semibold text-[var(--foreground)]">{value}</p></div>;
}
