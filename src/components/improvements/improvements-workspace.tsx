"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  CheckCircle2,
  LockKeyhole,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SystemState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import type {
  CommitmentTier,
  EvolveProgram,
  ImprovementArea,
  ImprovementSnapshot,
  PredefinedImprovementArea,
} from "@/types/improvement";

type ImprovementsWorkspaceProps = {
  snapshot: ImprovementSnapshot;
};

const tierLabels: Record<CommitmentTier, string> = {
  core: "Core",
  priority: "Priority",
  flexible: "Flexible",
};

const tierOrder: CommitmentTier[] = ["core", "priority", "flexible"];

export function ImprovementsWorkspace({
  snapshot,
}: ImprovementsWorkspaceProps) {
  const [areas, setAreas] = useState(snapshot.areas);
  const [removingAreaId, setRemovingAreaId] = useState<string | null>(null);
  const [programMessage, setProgramMessage] = useState<string | null>(null);
  const keepButtonRef = useRef<HTMLButtonElement>(null);
  const removeButtonRef = useRef<HTMLButtonElement>(null);
  const removingArea = areas.find((area) => area.id === removingAreaId);
  const activeAreas = areas.filter((area) => area.status === "active");
  const completedAreas = areas.filter((area) => area.status === "completed");
  const activeCount = activeAreas.length;
  const availableSlots = Math.max(snapshot.commitmentCapacity - activeCount, 0);

  useEffect(() => {
    if (removingArea) {
      keepButtonRef.current?.focus();
    }
  }, [removingArea]);

  function removeFlexibleArea() {
    if (!removingArea || removingArea.tier !== "flexible") {
      return;
    }

    setAreas((currentAreas) =>
      currentAreas.map((area) =>
        area.id === removingArea.id
          ? {
              ...area,
              status: "inactive",
              measurementLabel: "Removed from active commitments",
            }
          : area,
      ),
    );
    setRemovingAreaId(null);
  }

  function handleProgramActivation(program: EvolveProgram) {
    const existingCount = countExistingProgramAreas(program, activeAreas);
    const newSlotsNeeded = Math.max(program.requiredSlots - existingCount, 0);

    if (newSlotsNeeded > availableSlots) {
      setProgramMessage(
        `${program.title} needs ${newSlotsNeeded} open slots. You have ${availableSlots}.`,
      );
      return;
    }

    setAreas((currentAreas) => [
      ...currentAreas,
      ...program.areas
        .filter((programArea) => !hasCompatibleArea(programArea, currentAreas))
        .map((programArea, index): ImprovementArea => ({
          id: `${program.id}-${index}`,
          title: programArea.title,
          activityKey: programArea.activityKey,
          tier: "priority",
          status: "active",
          startedAt: "2026-08-27",
          source: "program",
          programId: program.id,
          progressBehavior: "cumulative",
          measurementLabel: "Contributes to Daily Quests",
        })),
    ]);
    setProgramMessage(`${program.title} activated without duplicate areas.`);
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      setRemovingAreaId(null);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    if (event.shiftKey && document.activeElement === keepButtonRef.current) {
      event.preventDefault();
      removeButtonRef.current?.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === removeButtonRef.current) {
      event.preventDefault();
      keepButtonRef.current?.focus();
    }
  }

  return (
    <div className="space-y-6">
      <CapacityOverview
        activeCount={activeCount}
        capacity={snapshot.commitmentCapacity}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
        <Card className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Active commitments
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
              Long-term areas Evolve should expect from you.
            </p>
          </div>

          {tierOrder.map((tier) => (
            <ImprovementTierSection
              key={tier}
              areas={areas.filter(
                (area) => area.tier === tier && area.status !== "completed",
              )}
              inactiveLimitDays={snapshot.inactiveLimitDays}
              tier={tier}
              onRemoveArea={setRemovingAreaId}
            />
          ))}
        </Card>

        <div className="space-y-6">
          <ProgramsPanel
            activeAreas={activeAreas}
            availableSlots={availableSlots}
            programs={snapshot.programs}
            onActivateProgram={handleProgramActivation}
            programMessage={programMessage}
          />
          <CataloguePanel predefinedAreas={snapshot.predefinedAreas} />
        </div>
      </div>

      <CompletedImprovements areas={completedAreas} />

      {removingArea ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 px-4 py-6"
          role="presentation"
        >
          <section
            aria-describedby="remove-area-description"
            aria-labelledby="remove-area-title"
            aria-modal="true"
            className="motion-panel w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--background)] p-5 shadow-[var(--shadow-soft)]"
            onKeyDown={handleDialogKeyDown}
            role="dialog"
          >
            <div className="flex items-start gap-3">
              <Trash2
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-[var(--foreground)]"
                focusable="false"
                strokeWidth={1.9}
              />
              <div>
                <h2
                  id="remove-area-title"
                  className="text-base font-semibold text-[var(--foreground)]"
                >
                  Remove {removingArea.title}?
                </h2>
                <p
                  id="remove-area-description"
                  className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]"
                >
                  Historical activity and progress remain in your Evolve history.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                ref={keepButtonRef}
                variant="secondary"
                onClick={() => setRemovingAreaId(null)}
              >
                Keep
              </Button>
              <Button
                ref={removeButtonRef}
                variant="ghost"
                onClick={removeFlexibleArea}
              >
                Remove
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function CapacityOverview({
  activeCount,
  capacity,
}: {
  activeCount: number;
  capacity: number;
}) {
  const availableSlots = Math.max(capacity - activeCount, 0);

  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Commitment capacity
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Active improvement areas are intentionally limited.
          </p>
        </div>
        <Badge tone={availableSlots > 0 ? "neutral" : "warning"}>
          {availableSlots > 0 ? `${availableSlots} slot open` : "Capacity reached"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <CapacityMetric label="Active" value={`${activeCount} / ${capacity}`} />
        <CapacityMetric
          label="Available"
          value={availableSlots > 0 ? String(availableSlots) : "0"}
        />
      </div>
    </Card>
  );
}

function ImprovementTierSection({
  tier,
  areas,
  inactiveLimitDays,
  onRemoveArea,
}: {
  tier: CommitmentTier;
  areas: ImprovementArea[];
  inactiveLimitDays: number;
  onRemoveArea: (areaId: string) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase text-[var(--foreground)]">
          {tierLabels[tier]}
        </h2>
        {tier !== "flexible" ? (
          <span className="text-xs font-semibold text-[var(--foreground-muted)]">
            Commitment locked
          </span>
        ) : null}
      </div>
      {areas.length > 0 ? (
        <ul className="space-y-3">
          {areas.map((area) => (
            <ImprovementAreaCard
              key={area.id}
              area={area}
              inactiveLimitDays={inactiveLimitDays}
              onRemoveArea={onRemoveArea}
            />
          ))}
        </ul>
      ) : (
        <SystemState
          title={`No ${tierLabels[tier].toLowerCase()} commitments.`}
          description={
            tier === "flexible"
              ? "Flexible areas can be added when capacity is available."
              : "Serious commitments will appear here after activation."
          }
          compact
        />
      )}
    </section>
  );
}

function ImprovementAreaCard({
  area,
  inactiveLimitDays,
  onRemoveArea,
}: {
  area: ImprovementArea;
  inactiveLimitDays: number;
  onRemoveArea: (areaId: string) => void;
}) {
  const isLocked = area.tier === "core" || area.tier === "priority";
  const isInactive = area.status === "inactive";

  return (
    <li
      className={cn(
        "rounded-md border border-[var(--border)] bg-[var(--background)] p-4",
        area.tier === "core" && "bg-[var(--improvement-core-subtle)]",
        isInactive && "opacity-75",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={area.tier === "core" ? "warning" : "neutral"}>
              {tierLabels[area.tier]}
            </Badge>
            <span className="rounded-md bg-[var(--surface-elevated)] px-2 py-1 text-xs font-semibold text-[var(--foreground-muted)]">
              {area.status}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">
            {area.title}
          </h3>
          {area.description ? (
            <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
              {area.description}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
            {area.measurementLabel ?? "Measurement definition pending"}
          </p>
          {isInactive ? (
            <p className="mt-1 text-sm text-[var(--foreground-muted)]">
              Paused for up to {inactiveLimitDays} intended days. History preserved.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isLocked ? (
            <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm font-semibold text-[var(--foreground-muted)]">
              <LockKeyhole
                aria-hidden="true"
                className="size-4"
                focusable="false"
                strokeWidth={1.9}
              />
              Locked
            </span>
          ) : area.status === "active" ? (
            <Button variant="ghost" onClick={() => onRemoveArea(area.id)}>
              Remove
            </Button>
          ) : (
            <span className="text-sm font-semibold text-[var(--foreground-muted)]">
              Preserved
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function ProgramsPanel({
  programs,
  activeAreas,
  availableSlots,
  programMessage,
  onActivateProgram,
}: {
  programs: EvolveProgram[];
  activeAreas: ImprovementArea[];
  availableSlots: number;
  programMessage: string | null;
  onActivateProgram: (program: EvolveProgram) => void;
}) {
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Programs
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
          Structured plans made of separate areas.
        </p>
      </div>

      {programMessage ? (
        <p className="rounded-md bg-[var(--warning-subtle)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
          {programMessage}
        </p>
      ) : null}

      <ul className="space-y-3">
        {programs.length > 0 ? (
          programs.map((program) => {
          const existingCount = countExistingProgramAreas(program, activeAreas);
          const newSlotsNeeded = Math.max(program.requiredSlots - existingCount, 0);
          const blocked = newSlotsNeeded > availableSlots;

          return (
            <li
              key={program.id}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">
                    {program.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                    {program.description}
                  </p>
                </div>
                <SlidersHorizontal
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
                  focusable="false"
                  strokeWidth={1.9}
                />
              </div>

              <div className="mt-4 grid gap-2">
                {program.areas.map((area) => {
                  const exists = hasCompatibleArea(area, activeAreas);

                  return (
                    <div
                      key={`${program.id}-${area.title}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="font-semibold text-[var(--foreground)]">
                        {area.title}
                      </span>
                      <span className="text-[var(--foreground-muted)]">
                        {exists ? "Already active" : "New area"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--foreground-muted)]">
                  Requires {program.requiredSlots} slots. Needs {newSlotsNeeded} open.
                </p>
                <Button
                  variant={blocked ? "secondary" : "primary"}
                  disabled={blocked}
                  onClick={() => onActivateProgram(program)}
                >
                  {blocked ? "Insufficient capacity" : "Activate Program"}
                </Button>
              </div>
            </li>
          );
          })
        ) : (
          <SystemState
            title="No programs available."
            description="Structured programs will appear here when they are configured."
            compact
          />
        )}
      </ul>
    </Card>
  );
}

function CataloguePanel({
  predefinedAreas,
}: {
  predefinedAreas: PredefinedImprovementArea[];
}) {
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Area catalogue
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
          Predefined areas for future activation.
        </p>
      </div>
      {predefinedAreas.length > 0 ? (
        <ul className="grid gap-2">
          {predefinedAreas.slice(0, 6).map((area) => (
            <li
              key={area.id}
              className="flex items-start gap-3 rounded-md bg-[var(--background)] px-3 py-2"
            >
              <Plus
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
                focusable="false"
                strokeWidth={1.9}
              />
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {area.title}
                </p>
                <p className="text-sm leading-6 text-[var(--foreground-muted)]">
                  {area.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <SystemState
          title="No catalogue areas."
          description="Predefined Improvement Areas are not available yet."
          compact
        />
      )}
    </Card>
  );
}

function CompletedImprovements({ areas }: { areas: ImprovementArea[] }) {
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Completed improvements
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
          Historical commitments remain preserved.
        </p>
      </div>

      {areas.length > 0 ? (
        <ul className="divide-y divide-[var(--border)]">
          {areas.map((area) => (
            <li
              key={area.id}
              className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-[var(--accent-pro)]"
                  focusable="false"
                  strokeWidth={1.9}
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {area.title}
                  </p>
                  <p className="text-sm leading-6 text-[var(--foreground-muted)]">
                    {area.description}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-[var(--foreground-muted)]">
                Completed {area.completedAt}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <SystemState title="No completed improvement areas yet." compact />
      )}
    </Card>
  );
}

function CapacityMetric({ label, value }: { label: string; value: string }) {
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

function hasCompatibleArea(
  programArea: EvolveProgram["areas"][number],
  areas: ImprovementArea[],
) {
  return areas.some((area) => {
    if (area.status !== "active") {
      return false;
    }

    if (programArea.activityKey && area.activityKey === programArea.activityKey) {
      return true;
    }

    return area.title.toLowerCase() === programArea.title.toLowerCase();
  });
}

function countExistingProgramAreas(
  program: EvolveProgram,
  activeAreas: ImprovementArea[],
) {
  return program.areas.filter((area) => hasCompatibleArea(area, activeAreas)).length;
}
