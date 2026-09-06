# Phase 5 Real-Data Audit

## Current Boundary

Authenticated state is loaded from the Supabase state repository. Unauthenticated or unconfigured requests receive an empty state, never seeded progression data. The service-role client is server-only and client components receive server action responses and public view models.

| Surface | Current source | Status |
| --- | --- | --- |
| Auth and protected shell | Supabase Auth and proxy | REAL_BACKEND |
| Dashboard and Today | Supabase state plus domain selectors | REAL_BACKEND |
| Daily Quests | Scheduled requirements and evidence | REAL_BACKEND |
| Activity logging | Authoritative server command | REAL_BACKEND |
| Boss decisions | Authoritative server commands | REAL_BACKEND |
| Profile identity | `profiles` plus factual records | REAL_BACKEND |
| Profile edits and title selection | Server commands | REAL_BACKEND |
| Commitments and settings | Real commitment state with static activity catalogue defaults; activation, deactivation, and configuration save use server commands | PARTIAL_BACKEND |
| Reports | Live selectors; official snapshot preference pending | PARTIAL_BACKEND |
| Achievements and Journey | Persisted awards/events; Journey renders persisted domain events plus a live current-level indicator | PARTIAL_BACKEND |
| Programs | Existing presentation state | PARTIAL_BACKEND |
| PDF export | Browser print | DEFERRED |
| Onboarding | Auth bootstrap only | DEFERRED |
| Behavior and restraint UI | Domain persistence, no dedicated production surface | DEFERRED |

## Mutation Refresh Map

- Activity logging refreshes Dashboard, Activities, and Reports.
- Boss accept/reject refreshes Bosses and the shared shell projections.
- Profile edits refresh Character/Profile.
- Title selection refreshes Character, Achievements, and Dashboard.
- Commitment activation/deactivation refreshes Settings and Activities.
- Commitment configuration saves refresh Settings and Activities; flexible removal is rejected by the server when history locks it.

## Security Notes

- Progression, XP, achievements, snapshots, and capacity are not client-writable through the application commands.
- Historical profile and activity queries are scoped by the authenticated user on the server repository.
- `.env.example` contains placeholders only. Secrets belong in ignored local environment files.

## Deferred Work

The remaining Phase 5 work is to persist settings preferences and Weekly Reminder CRUD, wire onboarding and program commands, make reports select official snapshots for closed periods, add real PDF generation, and add integration/RLS tests against a disposable Supabase database. These are intentionally not represented as complete by this audit.

The local verification suite passes. Next's Turbopack build is currently blocked in this environment by worker-process port binding; the webpack fallback is blocked by unavailable Google Fonts network access. Neither failure is a TypeScript or application compilation error.
