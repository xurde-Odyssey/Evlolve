# Evolve Engine Integration Map

Phase 3.8 integrates the local product surface with the Phase 3 domain engine while preserving local/mock persistence. Supabase, auth, RLS, schedulers, and production notification transport remain deferred.

## Source of Truth

- Growth Commitments are the source for scheduled requirements.
- Scheduled requirements project Daily Quests for a date; Daily Quests are not stored as permanent facts.
- ActivityRecords are factual work logs and preserve `occurredAt`.
- ActivityExecutionEvidence is the interpreted execution result used by progression systems.
- Weekly and monthly snapshots preserve period interpretation and policy version for historical reports.
- Current Level comes from progression state, not Lifetime XP.
- Lifetime XP comes from the XP ledger.
- Weekly Reminders are reminder state only and never feed progression.

## Domain Modules

- `execution`: classifies factual activity against requirement state, target, and deadline.
- `aggregation`: builds Sunday-Saturday weekly and monthly evidence summaries.
- `development`: builds activity development state from evidence.
- `capability`, `baseline`, `consistency`, `reliability`, `gap`: derive activity-level development signals.
- `pillars`, `behavior`, `analysis`: derive careful cross-domain and interpretive signals.
- `progression`: calculates Progression Rating and Current Level state.
- `xp`: owns ledger idempotency and XP summaries.
- `achievements`, `titles`, `journey`: derive permanent milestones and eligible identity state.
- `boss`, `recommendation`, `target`, `capacity`: derive challenges, recommendations, target versions, and commitment capacity.
- `orchestration/closeout`: performs weekly and monthly closeout output.

## Application Layer

`src/application/evolve` coordinates UI commands, local repositories, engine calls, and view models.

- `commands.ts`: activity logging, Weekly Reminder completion, Boss accept/reject, serious commitment creation, target recommendation acceptance, recommendation rejection, weekly closeout, and monthly closeout.
- `scheduling.ts`: active commitment to scheduled requirement projection.
- `time-policy.ts`: user timezone, 5 PM attention threshold, 10 PM progression deadline, midnight calendar boundary, Sunday-Saturday week keys, and display labels.
- `repositories.ts`: repository interfaces and memory implementation.
- `selectors.ts`: stable UI view models for Dashboard, Today, Daily Quests, Improvements, Bosses, Achievements, Journey, Reports, and Profile.
- `demo-state.ts`: explicit local demo fixture state routed through the same application contracts.

## Repository Boundaries

Current memory repositories:

- ActivityRepository
- EvidenceRepository
- CommitmentRepository
- WeeklyReminderRepository
- BookRepository
- BossRepository
- RecommendationRepository
- XpRepository
- AchievementRepository
- TitleRepository
- JourneyRepository
- SnapshotRepository

Phase 4 can replace these with database adapters while preserving command and selector contracts.

## Command Flow

### Log Activity

1. Validate duplicate factual ActivityRecord ID.
2. Resolve activity definition and current scheduled requirement by user timezone date.
3. Create factual ActivityRecord.
4. Classify execution through the domain engine.
5. If activity occurred after the 10 PM deadline, create a derived missed requirement where needed and preserve the late work as factual no-requirement evidence.
6. Append idempotent XP transactions through the XP ledger service.
7. Persist next local state.
8. UI refreshes via selectors.

### Accept Boss Challenge

1. Accept the domain Boss candidate.
2. Persist the accepted Boss contract in active Boss state.
3. Do not award XP or mutate Current Level from the button.

### Reject Boss Challenge

1. Reject the domain Boss candidate or active contract.
2. Remove active Boss contract if present.
3. Persist rejection history.
4. Do not award XP or mutate Current Level from the button.

### Accept Target Recommendation

1. Verify the recommendation is an increase for an existing commitment.
2. Append a target history version.
3. Update the future commitment target.
4. Start target adaptation.
5. Record recommendation acceptance history.
6. Do not rewrite historical ActivityRecords or evidence.

### Weekly Closeout

1. Build closeout input from local repositories.
2. Run domain weekly closeout.
3. Append idempotent XP transactions.
4. Store weekly snapshot once per idempotency key.
5. Update capacity projection.

### Monthly Closeout

1. Build or reuse monthly evaluation for the period.
2. Run domain monthly closeout.
3. Append idempotent XP transactions.
4. Store monthly snapshot once per idempotency key.
5. Merge achievements and Journey events by stable keys.
6. Update capacity projection.

## UI Consumers

- Dashboard uses `getDashboardViewModel`.
- Today uses `getTodayViewModel`.
- Daily Quests use `getDailyQuestViewModel`.
- Activity History reads factual ActivityRecords from the dashboard view model.
- Bosses use `getBossViewModel`.
- Achievements and Titles use `getAchievementSnapshot`.
- Improvement Areas use `getCommitmentViewModel`.
- Journey uses `getJourneyViewModel`.
- Reports use `getReportsViewModel`.
- Profile uses `getProfileViewModel`.

React components render supplied view models and should not own progression formulas.

## Time Semantics

- User timezone is explicit on local state.
- Progression deadline is 10:00 PM local time.
- Calendar boundary is 12:00 AM local time.
- Attention escalation starts at 5:00 PM local time.
- Week boundaries are Sunday through Saturday.
- Scheduled requirements preserve `scheduledDate`, `timezone`, and `deadlineAt`.
- Activity evidence preserves `occurredAt`.

## Factual vs Derived State

Persisted/local facts:

- commitments
- target history
- activity records
- evidence
- XP transactions
- weekly reminders
- books
- active Boss contracts
- Boss history
- recommendation decisions
- achievements
- titles
- Journey events
- snapshots

Recomputed/projected state:

- Daily Quests
- Today hierarchy
- consistency/reliability/capability summaries
- Progression Rating projection
- Dashboard Current Level view
- Boss offers
- recommendation candidates
- Reports/Profile view models

## Legacy Audit

- KEEP: explicit local demo fixture state until Supabase starts.
- KEEP: placeholder routes for later phases.
- KEEP: presentational chart math that uses supplied view-model values.
- REPLACE: Daily Quest hardcoded fixture dependency with commitment-derived projection.
- REPLACE: activity logging local mutation with `logActivity`.
- REPLACE: Boss accept/reject local-only UI mutation with command-layer state changes.
- REPLACE: target recommendation acceptance with target history and adaptation state.
- REPLACE: reports reading metrics with books plus reading evidence.
- REPLACE: dashboard XP-to-Level progress display with ledger XP plus progression Level state.
- REPLACE: fixed selector freeze/streak demo values with evidence-derived or neutral state.
- REMOVE: unused temporary demo quest matching helper.
- DEFER: production inactive abuse UI, correction/void admin UI, production notification transport, auth, Supabase adapters, RLS, scheduler, and full server replay.

## Known Deferred Items

- Local state is still recreated from demo fixtures per page load.
- Manual closeout commands exist, but no backend scheduler runs them yet.
- Correction semantics are represented architecturally by immutable evidence behavior, but no correction UI is built.
- Settings still contains local/demo controls for configuration surfaces that will need command wiring in later persistence phases.
- Historical reports can consume stored snapshots, but the current local demo has limited snapshot history.
- Phase 4 should add database indexes for evidence by user/activity/period and snapshots by period/policy version.

## Phase 4 Update

Phase 4 adds Supabase Auth helpers, a migration-backed persistence schema, RLS,
server-authoritative command entry points, and a Supabase state repository. See
`docs/evolve-phase-4-supabase.md` for the backend integration map.
