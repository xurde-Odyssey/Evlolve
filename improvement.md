# Evolve Improvement Backlog

This document records known product, architecture, data-integrity, UX, testing, and performance improvements. Items are intentionally tracked separately so they can be implemented and verified one at a time.

## Highest Priority

- [ ] **Persist Behavior & Boundaries**
  - Add authoritative commands and repositories for social outings, lifestyle context, and restraint contracts.
  - Persist entries through Supabase.
  - Restore entries after refresh and login.
  - Keep social context separate from quit/reduction boundaries.

- [ ] **Remove hardcoded Settings state**
  - Load inactive-mode availability from persisted state.
  - Persist notification preferences.
  - Load reading recovery settings from the backend.
  - Remove plausible fallback values from authenticated production flows.

- [ ] **Complete Custom Activity persistence**
  - Create custom activities through the authoritative commitment command.
  - Persist custom activity name, measurement, schedule, tier, and notes.
  - Replace demo-oriented "prepared" behavior in production.

- [ ] **Connect Phase 6 intelligence to real user history**
  - Feed behavior, restraint, recovery, stagnation, trajectory, and frontier data into application selectors and closeouts.
  - Ensure adaptive analysis uses real persisted snapshots and evidence.

- [ ] **Make Reports snapshot-authoritative**
  - Use official weekly/monthly snapshots for closed periods.
  - Keep incomplete periods explicitly provisional.
  - Prevent historical reports from changing under current policy.

- [ ] **Complete Programs**
  - Add authoritative program creation and activation.
  - Validate capacity before activation.
  - Handle duplicate commitments and overlapping targets.
  - Prevent silent partial activation.

## Data Integrity

- [ ] Verify multiple activity records on one calendar day count as one streak day.
- [ ] Add tests for multiple records, partials, late work, and weekly quotas.
- [ ] Verify late activity remains factual without repairing a closed missed requirement.
- [ ] Preserve historical target versions on every activity and report.
- [ ] Audit all activity-history displays for current-target leakage.
- [ ] Test duplicate submissions using the same idempotency key.
- [ ] Test concurrent activity submissions from multiple tabs.
- [ ] Test concurrent weekly and monthly closeouts.

## Security And Authority

- [ ] Run a full client/server authority audit.
- [ ] Verify the client cannot mutate XP, Current Level, Highest Level, capacity, achievements, Boss completion, or official snapshots.
- [ ] Test two-user RLS isolation against a real Supabase database.
- [ ] Verify direct client-role inserts and updates are denied for server-controlled tables.
- [ ] Verify service-role credentials never reach the browser.
- [ ] Add typed handling for database and application errors.

## Application Architecture

- [ ] Complete application command/query boundaries for behavior and restraint.
- [ ] Complete application command/query boundaries for Programs.
- [ ] Complete profile preference persistence.
- [ ] Complete official weekly and monthly closeout orchestration.
- [ ] Add reliable scheduler deployment and retry handling.
- [ ] Add failed-period recovery and chronological catch-up processing.
- [ ] Add reconciliation commands for ledger, projections, snapshots, requirements, and target versions.
- [ ] Keep domain logic independent from Supabase SDK details.
- [ ] Ensure every production domain object has a repository interface and adapter.

## Settings And UX

- [ ] Reduce Settings page density with clearer grouping or collapsible sections.
- [ ] Remove demo/development copy from normal authenticated production screens.
- [ ] Standardize status labels across database, domain, DTO, and UI.
- [ ] Standardize Active, Inactive, Pending, Completed, Partial, Missed, Excluded, and Baseline states.
- [ ] Improve Behavior & Boundaries wording and explain context versus personal limits.
- [ ] Replace repetitive explanatory text with concise visual summaries where appropriate.
- [ ] Audit mobile layout and form usability across Settings and Activity Logging.
- [ ] Preserve accessible labels, focus states, keyboard navigation, and contrast.

## Reports And Profile

- [ ] Complete official weekly report queries.
- [ ] Complete official monthly report queries.
- [ ] Add real week-over-week and month-over-month snapshot comparisons.
- [ ] Ensure PDF exports use the same snapshot as the on-screen report.
- [ ] Add report/export tests for historical policy versions.
- [ ] Connect Profile statistics entirely to real projections and snapshots.
- [ ] Show latest Monthly Analysis from authoritative stored analysis.

## Adaptive Intelligence

- [ ] Connect real behavior events and restraint evaluations to adaptive analysis.
- [ ] Connect stagnation and breakthrough detection to weekly/monthly closeouts.
- [ ] Connect Development Frontier to target recommendations and Boss personalization.
- [ ] Improve commitment difficulty classification with longitudinal evidence.
- [ ] Add schedule-density and opportunity-cost analysis.
- [ ] Add recommendation effectiveness memory.
- [ ] Ensure RecommendationEngine limits active high-priority recommendations.
- [ ] Ensure Boss generation supports `NO_BOSS_RECOMMENDED`.
- [ ] Preserve low-confidence and unknown states instead of inventing conclusions.
- [ ] Keep behavior explanations non-causal and evidence-based.
- [ ] Ensure adaptive intelligence never creates a second Level system or uncontrolled XP source.

## Testing

- [ ] Add integration tests against a disposable Supabase database.
- [ ] Add repository adapter tests for all major repositories.
- [ ] Add authoritative activity-flow tests.
- [ ] Add late-activity and closed-requirement tests.
- [ ] Add target-version history tests.
- [ ] Add capacity enforcement and bypass tests.
- [ ] Add Boss and Recommendation concurrency tests.
- [ ] Add closeout idempotency and retry tests.
- [ ] Add Settings persistence tests.
- [ ] Add authentication reload and session-restoration tests.
- [ ] Add mobile UI tests for critical actions.
- [ ] Add cache invalidation and stale-tab conflict tests.
- [ ] Keep all Phase 3 and Phase 4 tests passing.

## Performance And Operations

- [ ] Audit Dashboard and Profile for full-history replay.
- [ ] Use current projections and snapshots for primary page loads.
- [ ] Add pagination for Activity History, Journey, Achievements, and Reports.
- [ ] Measure N+1 queries and over-fetching of snapshot JSON.
- [ ] Validate indexes against real query plans.
- [ ] Benchmark one-year, two-year, and five-year histories.
- [ ] Add operational monitoring for failed commands and closeouts.
- [ ] Add safe development reconciliation and diagnostics.

## Product Direction

- [ ] Finish migration from generic wellness terminology to development domains.
- [ ] Preserve legacy activity aliases without rewriting historical meaning.
- [ ] Treat Hydration as a supporting health signal for new users.
- [ ] Treat Sleep primarily as Recovery context.
- [ ] Keep Meditation Practice under Mental Training.
- [ ] Keep social life neutral unless evidence shows meaningful interference.
- [ ] Represent an intentional observe/no-intervention state in the UI.
- [ ] Keep Core Stone strictly driven by Current Level.

## Readiness Gate

Phase 6 and production hardening should not be considered complete until:

- behavior and restraint data persist correctly;
- Settings and Custom Activities use real backend state;
- Programs enforce capacity authoritatively;
- official reports use immutable snapshots;
- closeouts are idempotent, retryable, and schedulable;
- RLS and server authority are tested against a real database;
- adaptive intelligence uses real personal history;
- no production route silently falls back to mock progression data.
