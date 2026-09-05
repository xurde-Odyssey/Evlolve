# Evolve Phase 4 Supabase Backend

Phase 4 moves Evolve from local/mock state toward persistent, authenticated,
server-authoritative state without rewriting the Phase 3 domain engine.

## Architecture

UI components render application view models. They do not call Supabase tables
directly.

Flow:

1. React page or client component invokes an application query/command.
2. Server query/action authenticates through Supabase Auth.
3. `SupabaseEvolveStateRepository` loads user-owned facts and projections.
4. The existing Phase 3 application command runs the domain engine.
5. The repository persists factual records, derived projections, snapshots,
   events, and policy provenance.

The domain engine has no Supabase dependency.

## Supabase Helpers

- `src/lib/supabase/env.ts`: central environment detection.
- `src/lib/supabase/server.ts`: cookie-aware server client and service-role
  authority client.
- `src/lib/supabase/client.ts`: browser client for future safe client flows.
- `src/lib/supabase/proxy.ts` and `src/proxy.ts`: Next 16 route protection and
  session refresh.

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed to browser
bundles.

## Database Shape

The migration separates raw facts, official requirement lifecycle, derived
state, historical snapshots, and event/ledger tables. Complex engine objects are
persisted in `domain_payload` JSONB while ownership, status, time, idempotency,
and reporting fields remain queryable.

## RLS

All user-owned tables have RLS enabled. Authenticated users may read their own
rows. Consequential tables intentionally do not expose client insert/update
policies:

- XP ledger
- progression state/history
- official snapshots
- achievements/titles
- Bosses/recommendations
- capacity state
- closeout records

Those writes are performed by trusted server code with the service-role client.

## Auth

`/auth` supports email/password sign in, signup, logout, session restoration,
and password reset request. Signup stores profile bootstrap metadata and the
database trigger creates the profile row. Server queries also ensure a profile
exists before loading Evolve state.

## Authoritative Commands

Implemented server command entry points:

- `logActivityAuthoritatively`
- `createCommitmentAuthoritatively`
- `completeWeeklyReminderAuthoritatively`
- `acceptBossAuthoritatively`
- `rejectBossAuthoritatively`
- `acceptTargetRecommendationAuthoritatively`
- `rejectRecommendationAuthoritatively`
- `runWeeklyCloseoutAuthoritatively`
- `runMonthlyCloseoutAuthoritatively`

Activity logging accepts factual input only. The trusted server resolves the
authenticated user, loads state, classifies execution through the domain engine,
issues ledger XP, persists evidence, and returns a safe dashboard view model.

## Requirements And Deadlines

Daily Quest UI remains derived from Growth Commitments and scheduled
requirements. The database includes `scheduled_requirements` for official
lifecycle state when requirements need to be materialized or closed.

The Phase 3 centralized time policy remains the source for user timezone,
Sunday to Saturday weeks, 5 PM escalation, 10 PM progression deadline, and the
midnight calendar boundary.

Requirement generation should be lazy/materialized near the active period,
rather than pre-generating years of rows.

## Closeouts

`/api/evolve/closeouts` provides a development/manual server execution path for
weekly and monthly closeouts. It uses `engine_closeouts` plus unique snapshot and
XP constraints for idempotency.

Production scheduling should call this server boundary or an equivalent trusted
worker. The scheduler should periodically identify due users by persisted
timezone, process missed weekly/monthly periods chronologically, and close
unresolved requirements after each user's 10 PM deadline.

## Policy Provenance

Consequential rows include `policy_version`, currently sourced from the Phase
3.9 policy registry. Clients may not supply policy versions for official
calculations.

## Deferred

- Live Supabase CLI/database execution of migrations.
- Live two-user RLS denial tests.
- Production scheduler/Edge Function deployment.
- Full admin reconciliation UI.
- Offline queueing and realtime synchronization.

These are infrastructure deployment tasks; the repository and server-command
boundaries are now in place for them.
