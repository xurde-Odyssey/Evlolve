"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Flag,
  ShieldAlert,
  Target,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SystemState } from "@/components/ui/system-state";
import {
  createEvolveApplication,
  getBossViewModel,
  getEngineProjection,
  type EvolveLocalState,
} from "@/application/evolve";
import { cn } from "@/lib/utils/cn";
import type { BossChallenge, BossChallengeStatus } from "@/types/boss";
import type { ServerCommandResponse } from "@/application/evolve/server/commands";
import type { EvolveServerActionResult } from "@/application/evolve/server/errors";

type BossChallengeWorkspaceProps = {
  initialChallenges: BossChallenge[];
  initialState?: EvolveLocalState;
  acceptBossAction?: (
    bossId: string,
  ) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
  rejectBossAction?: (
    bossId: string,
  ) => Promise<EvolveServerActionResult<ServerCommandResponse>>;
};

const statusLabels: Record<BossChallengeStatus, string> = {
  offered: "New Boss Available",
  accepted: "Active Boss",
  in_progress: "In Progress",
  completed: "Boss Defeated",
  failed: "Boss Failed",
  rejected: "Rejected",
  expired: "Expired",
};

const statusIcons: Record<BossChallengeStatus, LucideIcon> = {
  offered: Target,
  accepted: Flag,
  in_progress: Flag,
  completed: CheckCircle2,
  failed: XCircle,
  rejected: CircleSlash,
  expired: XCircle,
};

export function BossChallengeWorkspace({
  initialChallenges,
  initialState,
  acceptBossAction,
  rejectBossAction,
}: BossChallengeWorkspaceProps) {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [appState, setAppState] = useState(initialState);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);
  const rejectButtonRef = useRef<HTMLButtonElement>(null);
  const rejectingChallenge = challenges.find(
    (challenge) => challenge.id === rejectingId,
  );

  useEffect(() => {
    if (rejectingChallenge) {
      keepButtonRef.current?.focus();
    }
  }, [rejectingChallenge]);

  const primaryChallenge = useMemo(
    () =>
      challenges.find((challenge) => challenge.status === "offered") ??
      challenges.find((challenge) => challenge.status === "accepted") ??
      challenges[0],
    [challenges],
  );

  function updateChallengeStatus(
    challengeId: string,
    nextStatus: BossChallengeStatus,
  ) {
    setChallenges((currentChallenges) =>
      currentChallenges.map((challenge) =>
        challenge.id === challengeId
          ? { ...challenge, status: nextStatus }
          : challenge,
      ),
    );
  }

  async function acceptChallenge(challengeId: string) {
    if (acceptBossAction) {
      const result = await acceptBossAction(challengeId);
      if (!result.ok) return;
      updateChallengeStatus(challengeId, "accepted");
      return;
    }

    if (appState) {
      const candidate = getEngineProjection(appState).bossEligibility.candidates.find(
        (item) => item.id === challengeId,
      );

      if (candidate) {
        const app = createEvolveApplication(appState);
        app.acceptBossChallenge(candidate, appState.now);
        setAppState(app.repositories.getState());
      }
    }

    updateChallengeStatus(challengeId, "accepted");
  }

  async function rejectChallenge() {
    if (!rejectingChallenge) {
      return;
    }

    if (rejectBossAction) {
      const result = await rejectBossAction(rejectingChallenge.id);
      if (!result.ok) return;
    } else if (appState) {
      const candidate = getEngineProjection(appState).bossEligibility.candidates.find(
        (item) => item.id === rejectingChallenge.id,
      );

      if (candidate) {
        const app = createEvolveApplication(appState);
        app.rejectBossChallenge(candidate, appState.now);
        const nextState = app.repositories.getState();
        setAppState(nextState);
        setChallenges(getBossViewModel(nextState));
      }
    }

    updateChallengeStatus(rejectingChallenge.id, "rejected");
    setRejectingId(null);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      setRejectingId(null);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    if (event.shiftKey && document.activeElement === keepButtonRef.current) {
      event.preventDefault();
      rejectButtonRef.current?.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === rejectButtonRef.current) {
      event.preventDefault();
      keepButtonRef.current?.focus();
    }
  }

  return (
    <div className="space-y-6">
      {primaryChallenge ? (
        <BossChallengeHero
          challenge={primaryChallenge}
          onAccept={() => acceptChallenge(primaryChallenge.id)}
          onReject={() => setRejectingId(primaryChallenge.id)}
        />
      ) : (
        <Card>
          <SystemState
            title="No Boss available yet."
            description="Evolve needs more performance history before it can challenge your current limits."
            icon={ShieldAlert}
          />
        </Card>
      )}

      <Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Boss states
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Demo challenge outcomes.
          </p>
        </div>

        {challenges.length > 0 ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {challenges.map((challenge) => (
              <BossStateRow key={challenge.id} challenge={challenge} />
            ))}
          </ul>
        ) : (
          <SystemState
            title="No Boss history."
            description="Boss offers, active challenges, completions, and failures will appear here once enough evidence exists."
            icon={ShieldAlert}
            compact
          />
        )}
      </Card>

      {rejectingChallenge ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4 py-6"
          role="presentation"
        >
          <section
            aria-describedby="reject-boss-description"
            aria-labelledby="reject-boss-title"
            aria-modal="true"
            className="motion-panel w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--background)] p-5 shadow-[var(--shadow-soft)]"
            onKeyDown={handleDialogKeyDown}
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-[var(--foreground)]"
                focusable="false"
                strokeWidth={1.9}
              />
              <div>
                <h2
                  id="reject-boss-title"
                  className="text-base font-semibold text-[var(--foreground)]"
                >
                  Reject Boss Challenge?
                </h2>
                <p
                  id="reject-boss-description"
                  className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]"
                >
                  This challenge was generated from your recent performance.
                  Rejection is recorded as Boss history. XP and Current Level
                  are not changed by this button.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                ref={keepButtonRef}
                variant="secondary"
                onClick={() => setRejectingId(null)}
              >
                Keep Challenge
              </Button>
              <Button ref={rejectButtonRef} variant="ghost" onClick={rejectChallenge}>
                Reject Challenge
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function BossChallengeHero({
  challenge,
  onAccept,
  onReject,
}: {
  challenge: BossChallenge;
  onAccept: () => void;
  onReject: () => void;
}) {
  const progressPercent = getBossProgressPercent(challenge);

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)]">
        <div className="space-y-6 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge tone={getBossBadgeTone(challenge.status)}>
                {statusLabels[challenge.status]}
              </Badge>
              <h2 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-3xl">
                {challenge.title}
              </h2>
              {challenge.description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--foreground-muted)]">
                  {challenge.description}
                </p>
              ) : null}
            </div>
            <div className="grid size-12 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--boss-subtle)] text-[var(--boss)]">
              <ShieldAlert
                aria-hidden="true"
                className="size-6"
                focusable="false"
                strokeWidth={1.9}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <BossMetric
              label="Activity"
              value={challenge.activityLabel}
              numeric={false}
            />
            <BossMetric
              label="Target"
              value={formatBossValue(
                challenge.measurement.target,
                challenge.measurement.unit,
              )}
            />
            <BossMetric
              label={getProgressLabel(challenge)}
              value={formatBossValue(
                getDisplayProgress(challenge),
                challenge.measurement.unit,
              )}
            />
          </div>

          {challenge.status === "accepted" || challenge.status === "failed" ? (
            <Progress
              value={progressPercent}
              ariaLabel={`${challenge.title} progress`}
              ariaValueText={`${formatBossValue(
                getDisplayProgress(challenge),
                challenge.measurement.unit,
              )} of ${formatBossValue(
                challenge.measurement.target,
                challenge.measurement.unit,
              )}`}
              label="Best qualifying attempt"
            />
          ) : null}

          {challenge.status === "offered" ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={onAccept}>Accept Challenge</Button>
              <Button variant="ghost" onClick={onReject}>
                Reject
              </Button>
            </div>
          ) : null}

          <BossStatusNote challenge={challenge} />
        </div>

        <aside className="space-y-5 border-t border-[var(--border)] bg-[var(--surface-elevated)] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Why this challenge?
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
              {challenge.generatedReason ??
                "Based on recent performance signals."}
            </p>
          </div>

          {challenge.evidence && challenge.evidence.length > 0 ? (
            <dl className="grid gap-3">
              {challenge.evidence.map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                >
                  <dt className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {challenge.deadlineLabel ? (
            <div className="rounded-md bg-[var(--background)] px-3 py-2">
              <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                Deadline
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {challenge.deadlineLabel}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </Card>
  );
}

function BossStateRow({ challenge }: { challenge: BossChallenge }) {
  const Icon = statusIcons[challenge.status];

  return (
    <li className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex min-w-0 items-start gap-3">
        <Icon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {challenge.title}
            </p>
            <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--foreground-muted)]">
              {statusLabels[challenge.status]}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
            {formatBossValue(challenge.measurement.target, challenge.measurement.unit)}
            {" target"}
            {challenge.actualResult
              ? ` - Actual ${formatBossValue(
                  challenge.actualResult,
                  challenge.measurement.unit,
                )}`
              : ""}
          </p>
        </div>
      </div>
    </li>
  );
}

function BossMetric({
  label,
  value,
  numeric = true,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-lg font-semibold text-[var(--foreground)]",
          numeric && "numeric font-mono",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function BossStatusNote({ challenge }: { challenge: BossChallenge }) {
  if (challenge.status === "completed") {
    return (
      <div className="rounded-md bg-[var(--success-subtle)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Completed {challenge.completedAt}
        </p>
      </div>
    );
  }

  if (challenge.status === "failed") {
    return (
      <div className="rounded-md bg-[var(--warning-subtle)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Best attempt preserved. Consequences are not calculated yet.
        </p>
      </div>
    );
  }

  if (challenge.status === "rejected") {
    return (
      <div className="rounded-md bg-[var(--warning-subtle)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Rejected by user decision.
        </p>
      </div>
    );
  }

  if (challenge.status === "accepted") {
    return (
      <div className="rounded-md bg-[var(--accent-subtle)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Progress comes from Activity Records.
        </p>
      </div>
    );
  }

  return null;
}

function getBossProgressPercent(challenge: BossChallenge) {
  const progress = Math.max(getDisplayProgress(challenge), 0);
  const target = Math.max(challenge.measurement.target, 1);

  return Math.min(Math.round((progress / target) * 100), 100);
}

function getDisplayProgress(challenge: BossChallenge) {
  return challenge.actualResult ?? challenge.currentProgress ?? 0;
}

function getProgressLabel(challenge: BossChallenge) {
  if (challenge.status === "completed") {
    return "Actual";
  }

  if (challenge.status === "failed") {
    return "Best attempt";
  }

  return "Current";
}

function formatBossValue(value: number, unit: string) {
  return `${value.toLocaleString("en-US")} ${unit}`;
}

function getBossBadgeTone(status: BossChallengeStatus) {
  if (status === "completed") {
    return "success";
  }

  if (status === "offered" || status === "accepted") {
    return "warning";
  }

  return "neutral";
}
