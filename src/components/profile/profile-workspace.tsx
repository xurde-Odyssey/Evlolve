"use client";

import { useState, type FormEvent } from "react";
import {
  Award,
  BookOpen,
  Crown,
  History,
  LineChart,
  PenLine,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SystemState } from "@/components/ui/system-state";
import { cn } from "@/lib/utils/cn";
import type { Achievement, UserTitle } from "@/types/achievement";
import type {
  AnalysisInsight,
  LifetimeStatistic,
  PersonalProfile,
  PersonalRecord,
  ProfileDevelopmentArea,
  ProfileEvidenceMetric,
  ProfileSnapshot,
} from "@/types/profile";

type ProfileWorkspaceProps = {
  profile: ProfileSnapshot;
};

const numberFormatter = new Intl.NumberFormat("en-US");

export function ProfileWorkspace({ profile }: ProfileWorkspaceProps) {
  const [personal, setPersonal] = useState(profile.personal);
  const [draft, setDraft] = useState(profile.personal);
  const [titles, setTitles] = useState(profile.titles);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedTitle =
    titles.find((title) => title.selected) ??
    titles.find((title) => title.eligibility === "active");

  function selectTitle(titleId: string) {
    setTitles((currentTitles) =>
      currentTitles.map((title) => ({
        ...title,
        selected: title.id === titleId && title.eligibility === "active",
      })),
    );
  }

  function startEditing() {
    setDraft(personal);
    setError(null);
    setIsEditing(true);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validatePersonalProfile(draft);

    if (validationError) {
      setError(validationError);
      return;
    }

    setPersonal({
      ...draft,
      name: draft.name.trim(),
      goals: draft.goals?.map((goal) => goal.trim()).filter(Boolean),
    });
    setError(null);
    setIsEditing(false);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <ProfileHero
        avatar={profile.avatar}
        level={profile.level}
        onEdit={startEditing}
        personal={personal}
        selectedTitle={selectedTitle}
        titles={titles}
        onSelectTitle={selectTitle}
      />

      {isEditing ? (
        <ProfileEditForm
          draft={draft}
          error={error}
          onCancel={() => setIsEditing(false)}
          onChange={setDraft}
          onSubmit={saveProfile}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <DisciplineConsistency profile={profile} />
        <MonthlyAnalysisCard profile={profile} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <RecentPerformance metrics={profile.recentPerformance} />
        <CurrentDevelopment areas={profile.currentDevelopment} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <PersonalRecords records={profile.records} />
        <LifetimeStatistics stats={profile.lifetime} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <MajorAchievements achievements={profile.majorAchievements} />
        <ProgressionHistory items={profile.progressionHistory} />
      </div>
    </div>
  );
}

function ProfileHero({
  avatar,
  personal,
  level,
  selectedTitle,
  titles,
  onEdit,
  onSelectTitle,
}: {
  avatar: ProfileSnapshot["avatar"];
  personal: PersonalProfile;
  level: ProfileSnapshot["level"];
  selectedTitle?: UserTitle;
  titles: UserTitle[];
  onEdit: () => void;
  onSelectTitle: (titleId: string) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-0 xl:grid-cols-[minmax(17rem,0.82fr)_minmax(0,1.18fr)]">
        <section className="bg-[var(--surface-elevated)] p-4 sm:p-6">
          <div
            className="grid min-h-48 place-items-center rounded-lg border border-[var(--border)] bg-[var(--background)] bg-contain bg-center bg-no-repeat transition-[border-color,background-color] [transition-duration:var(--motion-duration-base)] [transition-timing-function:var(--motion-ease)] hover:border-[var(--primary)] sm:min-h-64"
            role="img"
            aria-label={avatar.label ?? `${personal.name} avatar`}
            style={
              avatar.asset ? { backgroundImage: `url(${avatar.asset})` } : undefined
            }
          >
            {!avatar.asset ? (
              <UserRound
                aria-hidden="true"
                className="size-20 text-[var(--foreground-muted)]"
                focusable="false"
                strokeWidth={1.6}
              />
            ) : null}
          </div>
          <p className="mt-3 text-sm text-[var(--foreground-muted)]">
            Evolve profile mark
          </p>
        </section>

        <section className="space-y-5 p-4 sm:space-y-6 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                Profile / Character
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-4xl">
                {personal.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="neutral">Level {level.currentLevel}</Badge>
                {selectedTitle ? (
                  <Badge tone="accent">{selectedTitle.name}</Badge>
                ) : (
                  <Badge tone="neutral">No status title</Badge>
                )}
                {level.highestLevel > level.currentLevel ? (
                  <Badge tone="warning">Highest {level.highestLevel}</Badge>
                ) : null}
              </div>
            </div>
            <Button className="gap-2" variant="secondary" onClick={onEdit}>
              <PenLine
                aria-hidden="true"
                className="size-4"
                focusable="false"
                strokeWidth={1.9}
              />
              Edit Profile
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ProfileMetric label="Current" value={`Level ${level.currentLevel}`} />
            <ProfileMetric label="Highest" value={`Level ${level.highestLevel}`} />
            <ProfileMetric
              label="Total XP"
              value={numberFormatter.format(level.totalXp)}
            />
            <ProfileMetric label="Evolving since" value={level.evolvingSince} />
            <ProfileMetric label="Active days" value={String(level.activeDays)} />
            <ProfileMetric
              label="Personal details"
              value={formatPersonalDetails(personal)}
              numeric={false}
            />
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                  Change title
                </p>
                <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                  Active titles only.
                </p>
              </div>
              <Link
                className="text-sm font-semibold text-[var(--foreground)] underline-offset-4 hover:underline"
                href="/achievements"
              >
                View title history
              </Link>
            </div>

            {titles.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {titles.map((title) => (
                  <button
                    key={title.id}
                    className={cn(
                      "min-h-11 rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                      title.selected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]",
                      title.eligibility === "inactive" && "opacity-60",
                    )}
                    disabled={title.eligibility === "inactive"}
                    type="button"
                    aria-pressed={title.selected}
                    onClick={() => onSelectTitle(title.id)}
                  >
                    <span>{title.name}</span>
                    <span className="mt-1 block text-xs font-semibold opacity-75">
                      {title.eligibility === "active" ? "Active" : "Inactive"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4">
                <SystemState title="No title earned yet." compact />
              </div>
            )}
          </div>
        </section>
      </div>
    </Card>
  );
}

function ProfileEditForm({
  draft,
  error,
  onCancel,
  onChange,
  onSubmit,
}: {
  draft: PersonalProfile;
  error: string | null;
  onCancel: () => void;
  onChange: (profile: PersonalProfile) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const goals = draft.goals ?? [];

  function updateGoal(index: number, value: string) {
    onChange({
      ...draft,
      goals: goals.map((goal, goalIndex) => (goalIndex === index ? value : goal)),
    });
  }

  return (
    <Card className="motion-panel space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
          Editable information
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
          Personal details only. Earned data stays system-owned.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ProfileInput
            label="Name"
            value={draft.name}
            onChange={(value) => onChange({ ...draft, name: value })}
          />
          <ProfileInput
            label="Age"
            inputMode="numeric"
            value={String(draft.age ?? "")}
            onChange={(value) =>
              onChange({ ...draft, age: value ? Number(value) : undefined })
            }
          />
          <ProfileInput
            label="Height (cm)"
            inputMode="decimal"
            value={String(draft.heightCm ?? "")}
            onChange={(value) =>
              onChange({ ...draft, heightCm: value ? Number(value) : undefined })
            }
          />
          <ProfileInput
            label="Weight (kg)"
            inputMode="decimal"
            value={String(draft.weightKg ?? "")}
            onChange={(value) =>
              onChange({ ...draft, weightKg: value ? Number(value) : undefined })
            }
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-[var(--foreground)]">
            Personal goals
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <input
                key={index}
                className="min-h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
                value={goals[index] ?? ""}
                onChange={(event) => updateGoal(index, event.target.value)}
                aria-label={`Personal goal ${index + 1}`}
              />
            ))}
          </div>
        </fieldset>

        {error ? (
          <p className="text-sm font-semibold text-[var(--destructive)]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save Profile</Button>
        </div>
      </form>
    </Card>
  );
}

function DisciplineConsistency({ profile }: { profile: ProfileSnapshot }) {
  const consistency = profile.consistency;
  const hasConsistencyData =
    consistency.currentConsistencyPercent > 0 ||
    consistency.currentOverallStreak > 0 ||
    consistency.bestOverallStreak > 0 ||
    consistency.activityConsistency.length > 0;

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Discipline & Consistency
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {consistency.disciplineLabel}
          </h2>
        </div>
      </div>

      {hasConsistencyData ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <ProfileMetric
              label="Current consistency"
              value={`${consistency.currentConsistencyPercent}%`}
            />
            <ProfileMetric
              label="Overall streak"
              value={`${consistency.currentOverallStreak} days`}
            />
            <ProfileMetric
              label="Best streak"
              value={
                consistency.bestOverallStreak > 0
                  ? `${consistency.bestOverallStreak} days`
                  : "-"
              }
            />
          </div>

          {consistency.activityConsistency.length > 0 ? (
            <ul className="divide-y divide-[var(--border)]">
              {consistency.activityConsistency.map((item) => (
                <li key={item.activityKey} className="py-3 first:pt-0 last:pb-0">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {item.activityLabel}
                    </p>
                    <p className="numeric font-mono text-sm font-semibold text-[var(--foreground)]">
                      {item.consistencyPercent}%
                    </p>
                  </div>
                  <Progress
                    value={item.consistencyPercent}
                    ariaLabel={`${item.activityLabel} profile consistency`}
                    ariaValueText={`${item.consistencyPercent}%`}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <SystemState
          title="Building your record."
          description="More qualifying activity is needed before discipline and consistency can be evaluated."
          icon={ShieldCheck}
          compact
        />
      )}
    </Card>
  );
}

function MonthlyAnalysisCard({ profile }: { profile: ProfileSnapshot }) {
  const analysis = profile.monthlyAnalysis;
  const hasInsights =
    analysis.strongestAreas.length > 0 || analysis.weakAreas.length > 0;

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <LineChart
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Monthly Analysis
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            {analysis.periodLabel}
          </h2>
        </div>
      </div>

      {hasInsights ? (
        <>
          {analysis.summary ? (
            <p className="text-sm leading-6 text-[var(--foreground-muted)]">
              {analysis.summary}
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <InsightGroup title="Strongest area" insights={analysis.strongestAreas} />
            <InsightGroup title="Needs attention" insights={analysis.weakAreas} />
          </div>
        </>
      ) : (
        <SystemState
          title="Building your baseline."
          description="More performance data is required before Evolve can identify meaningful strengths and weak spots."
          icon={LineChart}
          compact
        />
      )}
    </Card>
  );
}

function InsightGroup({
  title,
  insights,
}: {
  title: string;
  insights: AnalysisInsight[];
}) {
  return (
    <section className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--background)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {title}
      </p>
      {insights.map((insight) => (
        <article key={insight.id}>
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            {insight.title}
          </h3>
          <ul className="mt-2 space-y-1">
            {insight.evidence.map((item) => (
              <li
                key={item}
                className="text-sm leading-6 text-[var(--foreground-muted)]"
              >
                {item}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

function RecentPerformance({ metrics }: { metrics: ProfileEvidenceMetric[] }) {
  return (
    <MetricCard
      Icon={Target}
      title="Recent Performance"
      subtitle="Time-contextual evidence."
      metrics={metrics}
    />
  );
}

function CurrentDevelopment({ areas }: { areas: ProfileDevelopmentArea[] }) {
  const coreAreas = areas.filter((area) => area.tier === "core");
  const priorityAreas = areas.filter((area) => area.tier === "priority");

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <Trophy
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            Current Development
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            Core and Priority commitments.
          </p>
        </div>
      </div>

      {coreAreas.length > 0 || priorityAreas.length > 0 ? (
        <>
          <DevelopmentTier title="Core" areas={coreAreas} />
          <DevelopmentTier title="Priority" areas={priorityAreas} />
        </>
      ) : (
        <SystemState
          title="No Core or Priority commitments."
          description="Current development appears after serious Improvement Areas are active."
          icon={Trophy}
          compact
        />
      )}
    </Card>
  );
}

function PersonalRecords({ records }: { records: PersonalRecord[] }) {
  return (
    <SimpleListCard
      Icon={Award}
      title="Personal Records"
      items={records}
    />
  );
}

function LifetimeStatistics({ stats }: { stats: LifetimeStatistic[] }) {
  return (
    <SimpleListCard
      Icon={BookOpen}
      title="Lifetime Statistics"
      items={stats}
    />
  );
}

function MajorAchievements({ achievements }: { achievements: Achievement[] }) {
  return (
    <Card className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Crown
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-[var(--achievement)]"
            focusable="false"
            strokeWidth={1.9}
          />
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
              Major Achievements
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
              Selected permanent evidence.
            </p>
          </div>
        </div>
        <Link
          className="text-sm font-semibold text-[var(--foreground)] underline-offset-4 hover:underline"
          href="/achievements"
        >
          View all achievements
        </Link>
      </div>

      {achievements.length > 0 ? (
        <ul className="divide-y divide-[var(--border)]">
          {achievements.slice(0, 4).map((achievement) => (
            <li
              key={achievement.id}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {achievement.title}
                </p>
                <p className="text-sm text-[var(--foreground-muted)]">
                  {achievement.description}
                </p>
              </div>
              <Badge tone="success">{achievement.earnedAt ?? "Earned"}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <SystemState
          title="No major achievements yet."
          description="Major achievements will appear here after they are earned."
          icon={Crown}
          compact
        />
      )}
    </Card>
  );
}

function ProgressionHistory({ items }: { items: ProfileEvidenceMetric[] }) {
  return (
    <MetricCard
      Icon={History}
      title="Progression History"
      subtitle="Current identity plus accumulated milestones."
      metrics={items}
    />
  );
}

function MetricCard({
  Icon,
  title,
  subtitle,
  metrics,
}: {
  Icon: typeof Target;
  title: string;
  subtitle: string;
  metrics: ProfileEvidenceMetric[];
}) {
  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            {title}
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">
            {subtitle}
          </p>
        </div>
      </div>

      {metrics.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric) => (
            <li
              key={metric.id}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4"
            >
              <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
                {metric.label}
              </p>
              <p className="numeric mt-2 font-mono text-xl font-semibold text-[var(--foreground)]">
                {metric.value}
              </p>
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                {metric.context}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <SystemState
          title={`${title} not established yet.`}
          description="This section will fill in as your record develops."
          icon={Icon}
          compact
        />
      )}
    </Card>
  );
}

function SimpleListCard({
  Icon,
  title,
  items,
}: {
  Icon: typeof Award;
  title: string;
  items: { id: string; label: string; value: string }[];
}) {
  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--foreground-muted)]"
          focusable="false"
          strokeWidth={1.9}
        />
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
            {title}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {item.label}
              </p>
              <p className="numeric text-right font-mono text-sm font-semibold text-[var(--foreground)]">
                {item.value}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <SystemState
          title={
            title === "Personal Records"
              ? "No records established yet."
              : "No lifetime history yet."
          }
          icon={Icon}
          compact
        />
      )}
    </Card>
  );
}

function DevelopmentTier({
  title,
  areas,
}: {
  title: string;
  areas: ProfileDevelopmentArea[];
}) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">
        {title}
      </p>
      {areas.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {areas.map((area) => (
            <li key={area.id}>
              <Badge tone={area.tier === "core" ? "warning" : "neutral"}>
                {area.title}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">None active.</p>
      )}
    </section>
  );
}

function ProfileInput({
  label,
  value,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  inputMode?: "numeric" | "decimal";
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-semibold text-[var(--foreground)]">
      <span>{label}</span>
      <input
        className="min-h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ProfileMetric({
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

function formatPersonalDetails(personal: PersonalProfile) {
  const details = [
    typeof personal.age === "number" ? `${personal.age} years` : null,
    typeof personal.heightCm === "number" ? `${personal.heightCm} cm` : null,
    typeof personal.weightKg === "number" ? `${personal.weightKg} kg` : null,
  ].filter(Boolean);

  return details.length > 0 ? details.join(" · ") : "Not set";
}

function validatePersonalProfile(profile: PersonalProfile) {
  if (profile.name.trim().length < 2 || profile.name.trim().length > 40) {
    return "Name must be between 2 and 40 characters.";
  }

  if (
    typeof profile.age === "number" &&
    (!Number.isInteger(profile.age) || profile.age <= 0)
  ) {
    return "Age must be a positive whole number.";
  }

  if (
    typeof profile.heightCm === "number" &&
    (!Number.isFinite(profile.heightCm) || profile.heightCm <= 0)
  ) {
    return "Height must be a positive number.";
  }

  if (
    typeof profile.weightKg === "number" &&
    (!Number.isFinite(profile.weightKg) || profile.weightKg <= 0)
  ) {
    return "Weight must be a positive number.";
  }

  return null;
}
