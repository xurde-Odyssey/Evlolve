# Evolve Implementation Report

This file tracks completed implementation phases so future agents can understand the current product surface and what was intentionally deferred.
codex resume 01a03c77-95f4-7a82-afdd-b00d13c4abfb
## Phase 2.1 - Navigation and Responsive App Shell

- Refined the app shell with a fixed desktop sidebar, compact mobile header, and fixed bottom mobile navigation.
- Desktop navigation exposes Overview, Quests, Journey, Character, Analytics, with Achievements and Settings as secondary links.
- Activities remains routed at `/activities` but is presented as the distinct `Log Activity` action instead of a normal primary navigation item.
- Added route-aware active states, accessible nav semantics, and lucide iconography.
- Replaced the text `EV` brand mark with `public/evolve.svg` and wired it into favicon metadata.
- Deferred activity forms, auth, progression, XP, analytics, and database behavior.

## Phase 2.2 - Dashboard Identity / Character Header

- Added `DashboardIdentity` in `src/components/dashboard/dashboard-identity.tsx`.
- Established the typed `CharacterIdentityData` presentation contract.
- `/dashboard` now starts with a character identity header showing demo identity, overall level, XP position, title, and streak context.
- Demo character data is isolated in `src/app/(app)/dashboard/page.tsx`.
- Enhanced the `Progress` primitive with ARIA label/value text support.
- Deferred personalization, real time-aware greeting, XP algorithms, title logic, streak logic, and Supabase.

## Phase 2.3 - Primary Progression Card

- Added `ProgressionCard` in `src/components/dashboard/progression-card.tsx`.
- Established the typed `OverallProgression` presentation contract.
- Reused the same `demoCharacter` object from the dashboard page for identity and overall progression.
- The card shows current level, percentage complete, current XP, target XP, remaining XP, and next-level destination.
- Calculations are presentation-only: percentage, remaining XP, and `level + 1`.
- Deferred auto-leveling, XP curves, XP sources, reward animation, and progression-engine behavior.

## Phase 2.4 - Character Attributes

- Added `CharacterAttributes` in `src/components/dashboard/character-attributes.tsx`.
- Established typed attribute keys for strength, intelligence, knowledge, health, discipline, career, and social.
- Extended the existing `demoCharacter` with an `attributes` array.
- Rendered a single cohesive attribute section using numeric levels and presentation-only relative bars.
- Used a temporary display scale constant with an explicit comment that it is not the progression model.
- Deferred attribute XP, activity-to-attribute mapping, manual allocation, rankings, trends, caps, bonuses, and algorithms.

## Phase 2.5 - Daily Quests

- Added `DailyQuests` in `src/components/quests/daily-quests.tsx`.
- Established typed quest presentation data with `QuestSource`, `QuestStatus`, and `DailyQuest`.
- Added isolated `demoDailyQuests` presentation data in the dashboard page.
- Daily quests render below Identity, Overall Progression, and Character Attributes.
- Completion uses local UI state only: pressing `Complete` marks a pending quest completed and updates the daily quest count/progress indicator.
- Completed quests remain visible with a restrained completed treatment.
- Daily progress means completed quests divided by today's quests; it does not update character XP or attributes.
- Deferred persistence, Settings, quest creation, recurrence engine, XP engine, deductions, recovery, daily bonuses, weekly/monthly analysis, level bands, regression, integrations, notifications, and achievements.
- Phase 2.6 superseded the temporary direct-complete interaction by routing pending quests to Activity Logging and deriving demo completion from activity records.

## Phase 2.6 - Activity Logging

- Added shared activity models in `src/types/activity.ts` for `ActivityDefinition`, `ActivityRecord`, measurement types, and activity keys.
- Added shared quest models in `src/types/quest.ts`, keeping quests separate from activity records.
- Added `activityDefinitions` in `src/config/activity-definitions.ts` for Workout, Running, Reading, Coding / Learning, Meditation, Sleep, and Water.
- Moved demo character, daily quests, and activity records into `src/lib/demo/evolve-demo-data.ts` so dashboard demo state is shared.
- Added isolated temporary quest matching in `src/lib/demo/quest-matching.ts`; it only demonstrates activity-to-quest status and is not the final evaluation engine.
- Reworked `DailyQuests` so pending quests link to `/activities` and completion display can be derived from activity records instead of direct quest mutation.
- Added `ActivityLoggingWorkspace` and `ActivityHistory` under `src/components/activities/`.
- `/activities` now shows a focused activity logging form, current daily quests with demo matching, and recent activity history.
- Activity logging preserves actual measurement values such as `6.2 km`, `35 pages`, duration, volume, or completion.
- Form validation rejects empty, negative, zero, and non-numeric required measurements.
- Duplicate-submit protection is limited to a local submitting guard and same-session duplicate signature check; stronger persistence integrity is deferred.
- The UI communicates prompt logging and prepares for the future 24-hour discipline rule without implementing final enforcement.
- Deferred XP algorithms, attribute algorithms, quest evaluation engine, over/underperformance logic, XP recovery, penalties, level regression, analytics, achievements, Supabase persistence, external integrations, and AI analysis.

## Phase 2.7 - Streak & Consistency

- Added typed consistency contracts in `src/types/consistency.ts`.
- Kept overall streak separate from activity streaks through `OverallStreak` and `ConsistencySnapshot`.
- Added activity streak presentation state with separate `status` and `todayState` fields so active/inactive mode is distinct from completed, missed, scheduled rest, and streak freeze events.
- Added explicit demo consistency data in `src/lib/demo/evolve-demo-data.ts`; the UI receives `overall.qualifiedToday` instead of calculating daily qualification.
- Added `ConsistencyOverview` in `src/components/dashboard/consistency-overview.tsx`.
- Dashboard now renders Consistency after Daily Quests.
- Overall streak shows current, best, and today's explicit qualification result with stronger visual priority than activity streak rows.
- Activity streaks render compact current/best values and preserve historical best even when current is zero.
- Scheduled rest is represented as its own state and is not treated as completed, missed, or a streak failure.
- Inactive mode is represented as a paused state with the seven-day intended inactive session limit shown, without consequences after day seven.
- Streak freeze availability and freeze-used presentation are represented without implementing earning, expiration, eligibility, automatic/manual application, or storage limits.
- Deferred final consistency algorithms, overall-streak qualification thresholds, partial-completion consequences, Discipline evaluation, XP relationships, level regression, achievements, analytics, calendars, scheduling engines, and Supabase persistence.

## Phase 2.8 - Journey / Long-Term Progression

- Added typed Journey contracts in `src/types/journey.ts` for milestone type, status, reward preview, milestone records, and the full journey snapshot.
- Replaced the `/journey` placeholder with a primary Journey screen using `PageHeader`, `PageContainer`, and the new `JourneyTimeline`.
- Added explicit demo Journey data in `src/lib/demo/evolve-demo-data.ts`.
- Kept `currentLevel` and `highestLevel` separate so future regression does not require erasing historical milestones.
- Milestone status is supplied as presentation data through `completed`, `current`, and `upcoming`; the UI does not determine milestone completion.
- Supported level, achievement, boss, title, unlock, phase, and goal milestone presentation categories.
- Added optional completion dates and reward/unlock preview metadata as display-only milestone details.
- Rendered a single vertical timeline that works naturally on mobile and remains straightforward on desktop.
- Completed milestones remain visible and quieter, the current milestone receives stronger emphasis, and upcoming milestones use restrained future-state treatment.
- Boss, achievement, title, goal, phase, and unlock milestones are display-only; no engines or feature gates were introduced.
- Deferred real progression algorithms, level milestone algorithms, unlock logic, boss evaluation, achievement engines, title logic, regression logic, level-band rules, goal evaluation, database persistence, and Supabase integration.

## Phase 2.9 - Adaptive Boss Challenges

- Added typed Boss Challenge contracts in `src/types/boss.ts`.
- Kept Bosses architecturally separate from ordinary quests; no quest types or quest evaluation behavior were reused as Boss state.
- Added `BossChallengeStatus` with `offered`, `accepted`, `completed`, `failed`, and `rejected`.
- Added `BossEvaluationType` with `single_value`, `cumulative`, `frequency`, `consistency`, and `deadline` as presentation architecture only.
- Added explicit demo Boss data in `src/lib/demo/evolve-demo-data.ts` for running, reading, and practice examples across every required Boss status.
- Added `BossChallengeWorkspace` in `src/components/boss/boss-challenge-workspace.tsx` with local/demo accept and reject state transitions.
- Added reject confirmation that explains possible future progression consequences without calculating penalties.
- Added active Boss presentation with accessible progress derived from supplied mock progress fields, not from ActivityRecord evaluation.
- Added completed, failed, and rejected Boss presentation states while preserving actual overachievement values such as `8.4 km`.
- Replaced the `/goals` placeholder with a Goals / Boss Challenges screen focused on Boss presentation.
- Added a compact dashboard Boss preview in `src/components/boss/boss-preview.tsx`.
- Updated the `Button` primitive to forward refs so dialog focus can target the primary confirmation action.
- ActivityRecord remains the future source-of-truth boundary for Boss progress; no manual Boss progress controls were added.
- Journey integration remains a future progression-system output; the Boss UI does not mutate Journey milestones.
- Deferred Boss generation, baseline calculation, habit-zone logic, challenge difficulty, Boss evaluation, XP rewards, rejection penalties, failure penalties, level regression, Discipline impact, automatic Journey mutation, achievement unlocking, title unlocking, adaptive progression, analytics engines, Supabase persistence, and database work.

## Phase 2.10 - Reports & Analytics

- Added typed book contracts in `src/types/book.ts`.
- Added typed report contracts in `src/types/report.ts` for reporting periods, reading activity references, target-vs-actual metrics, activity reports, consistency reports, reading reports, period comparisons, progression summaries, baseline status, and the full `PeriodReport` output.
- Added descriptive calculation utilities in `src/lib/reports/calculations.ts` for totals, averages, variance, variance percent, percentage change, book completion days, and rounding.
- Added demo report data in `src/lib/demo/report-demo-data.ts` with realistic overperformance, underperformance, exact-target, missed-session, weekly comparison, monthly comparison, zero-previous-period, current-book, completed-book, baseline-building, and mock XP-reporting examples.
- Added the primary `/reports` page and routed the existing `/analytics` placeholder to `/reports`.
- Updated navigation so the Analytics slot now points to Reports.
- Added `ReportsWorkspace` in `src/components/reports/reports-workspace.tsx` with period selection, performance overview, target-vs-actual activity analytics, consistency reporting, reading analytics, current book progress, books read, period comparison, progression summary, baseline building, system analysis placeholder, and PDF export boundary.
- Used lightweight accessible bar charts instead of installing a chart dependency; exact values remain available as readable text and hover titles.
- Added print-friendly CSS and an `Export PDF` action that uses the browser print/PDF boundary rather than introducing a brittle PDF dependency.
- Reading now has a typed `Book` model and `ReadingActivityRecord` reference shape with `bookId`, `pagesRead`, and `occurredAt`.
- Current Book displays `184 / 320 pages`, `57.5%`, and `136 pages` remaining from demo reading records.
- Completed book reporting derives completion duration from start/finish dates as descriptive math only.
- Progression reporting distinguishes activity XP, Boss XP, bonus XP, XP lost, and net XP as supplied mock report values; no XP formula was introduced.
- Habit Zone / baseline reporting communicates approximate evidence collection without hardcoding a final confidence algorithm.
- Deferred XP calculation, XP penalties, asymmetric progression multipliers, Discipline calculation, level calculation, level regression, Boss generation, Boss difficulty, Habit Zone algorithms, baseline scoring, recommendation engines, AI System Analysis, achievement unlocking, adaptive targets, Supabase persistence, and database work.

## Phase 2.11 - Achievements & Titles

- Added typed achievement and title contracts in `src/types/achievement.ts`.
- Added `AchievementCategory` with `milestone`, `mastery`, `discipline`, `boss`, and `lifetime`.
- Added `AchievementStatus` with `locked`, `in_progress`, and `earned`.
- Added explicit tier metadata with `tier` and `tierLabel` instead of parsing names or calculating thresholds.
- Added hidden achievement support through `hiddenUntilEarned`; hidden locked achievements do not expose criteria or progress.
- Added `major` achievement support for future Journey integration boundaries.
- Added `UserTitle` with source metadata, permanent `earnedAt`, active/inactive eligibility, and selected display state.
- Added demo achievement/title data in `src/lib/demo/evolve-demo-data.ts` covering earned milestone, earned discipline, in-progress mastery, Boss achievement, lifetime achievement, hidden achievement, tier progression, active title, inactive title, and selected title.
- Replaced the `/achievements` placeholder with an Achievements & Titles screen.
- Added `AchievementsWorkspace` with category filtering, achievement summary, achievement cards, title history, and local/demo title selection.
- Inactive titles remain visible and historically earned but cannot be selected.
- Added a compact latest-achievement dashboard preview without redesigning the dashboard identity/profile area.
- Boss achievements are represented as permanent achievement records with preserved overachievement progress.
- Journey integration remains a future engine boundary; major achievement metadata exists but no Journey mutation was implemented.
- Deferred achievement qualification, title eligibility, title loss/reactivation logic, Achievement XP, Discipline calculations, XP calculations, level calculations, Boss generation, adaptive difficulty, Journey mutation engines, Supabase persistence, and AI recommendations.

## Phase 2.12 - Improvement Areas & Programs

- Added typed Improvement Area and Program contracts in `src/types/improvement.ts`.
- Added `CommitmentTier` with `core`, `priority`, and `flexible`.
- Added `ImprovementAreaStatus` with `active`, `inactive`, and `completed`.
- Added `ImprovementAreaSource` with `predefined`, `custom`, and `program`.
- Added optional `ProgressBehavior` with `cumulative` and `state` to preserve room for both cumulative progress and state-based progress such as savings balance.
- Added configuration-driven predefined areas and programs in `src/config/improvement-areas.ts`.
- Added demo improvement data in `src/lib/demo/evolve-demo-data.ts` covering Core active, Priority active, Flexible active, inactive commitments, completed commitments, 4/5 capacity, 5/5 capacity demo, program availability, program capacity blocking, existing area overlap, and a broad custom area with measurement pending.
- Replaced the `/settings` placeholder with the Improvement Areas configuration screen.
- Added `ImprovementsWorkspace` in `src/components/improvements/improvements-workspace.tsx`.
- Added capacity presentation from a user/demo value `commitmentCapacity` rather than a globally hardcoded maximum.
- Core and Priority areas show locked commitment treatment and do not expose normal delete/downgrade actions.
- Flexible active areas expose a restrained Remove action with confirmation; removal changes active commitment state while communicating historical preservation.
- Inactive areas show planned pause state and the seven-day intended pause limit without consequence logic.
- Completed areas are preserved in a simple historical section.
- Programs are shown as structured combinations of separate Improvement Areas, not as one activity.
- Program activation checks available slots and compatible existing active areas in local demo state; it does not silently activate partial programs or duplicate overlapping areas.
- Added a compact dashboard preview for active improvements.
- Quest integration remains a boundary: active areas are marked as contributing to Daily Quests, but no quest generation was implemented.
- Reports, Achievements, Bosses, and adaptive targets remain future consumers of Improvement Area state; no automatic integration was added.
- Deferred adaptive targets, completion algorithms, commitment failure algorithms, capacity reduction/recovery, tier reclassification, XP effects, level effects, Discipline effects, Boss generation, automatic program recommendations, AI goal decomposition, Supabase persistence, and database work.

## Phase 2.13 - Settings & Activity Configuration

- Added typed Settings contracts in `src/types/settings.ts`.
- Added `ActivityScheduleType` with `daily`, `times_per_week`, and `selected_days`.
- Added explicit weekday support from Sunday through Saturday and preserved the fixed reporting week as Sunday - Saturday.
- Added typed activity configuration state that references existing `ActivityKey`, `MeasurementType`, and `CommitmentTier` contracts instead of duplicating activity or measurement definitions.
- Added demo Settings data in `src/lib/demo/settings-demo-data.ts` covering daily schedules, 4-times-per-week schedules, selected days, Core/Flexible commitments, adaptive target display, inactive-mode availability, used inactive-mode state, automatic freeze eligibility, current book configuration, reading recovery, and notification preferences.
- Reworked `/settings` into a broader Settings screen while preserving the Phase 2.12 Improvement Areas and Programs section below it.
- Added `SettingsWorkspace` in `src/components/settings/settings-workspace.tsx` with local/demo configuration for activities, schedules, measurements, custom activities, inactive mode, streak protection, reading, notifications, and system-controlled progression fields.
- Commitment capacity is reused from Improvement Areas and represented as a user/demo value; activation is blocked locally when capacity is full.
- Core and Priority commitments are shown as locked in Settings and do not expose unrestricted downgrade/delete controls.
- Custom activity configuration supports name, measurement type, unit, schedule, commitment tier, and notes; it does not expose XP, difficulty, penalty, or level contribution controls.
- The fixed daily progression deadline is displayed as `10:00 PM` and the calendar boundary as `12:00 AM`; late activity is represented as historical-only pending future qualification logic.
- Inactive Mode shows one session per calendar month and the seven-day maximum intended duration without server-side enforcement or consequence logic.
- Streak Freeze is represented as automatic protection with available freezes and mock eligibility state, separate from Inactive Mode.
- Reading configuration supports current book title, total pages, and constrained 2- or 3-day recovery preference while keeping full book history in Reports.
- Notification settings cover activity reminders, daily deadline warnings, Boss Challenge deadlines, Inactive Mode expiry, reading reminders, and quest updates without implementing delivery timing.
- System-managed values such as adaptive targets, XP reward, difficulty, consistency formula, and inactive monthly allowance are display-only.
- Added accessible labels, fieldsets, real buttons, checkbox labels, textual capacity/error states, and mobile-safe stacked layouts.
- Validation covers activity schedules, positive times per week, selected-day presence, custom activity name/unit, positive book page count, 2- or 3-day recovery, and activation capacity.
- Deferred XP algorithms, XP penalties, level calculations, late-completion evaluation, adaptive targets, Boss difficulty, consistency scoring, freeze eligibility, inactive consequences, monthly inactive reset backend, notification delivery, Supabase persistence, and database work.

## Phase 2.14 - Daily Execution & Notifications

- Added typed Daily Execution and notification contracts in `src/types/daily-execution.ts`.
- Added `DailyExecutionStatus` with `pending`, `completed`, `missed`, `inactive`, and `scheduled_rest`.
- Added `ExecutionAlertLevel` with `reminder`, `warning`, and `critical`.
- Added notification contracts with severity `reminder`, `warning`, `critical`, and `success`, plus type categories for activity, deadline, streak, boss, inactive, and reading.
- Added explicit demo Daily Execution data in `src/lib/demo/evolve-demo-data.ts`.
- Demo state covers before 5:00 PM, after-5 reminder, evening warning, near-deadline critical, day complete, missed after 10:00 PM, streak at risk, inactive commitment, scheduled rest, Boss deadline, reading progress reminder, and book recovery presentation.
- Added `TodayExecution` in `src/components/dashboard/today-execution.tsx`.
- Dashboard now renders Today directly after Identity and Overall Progression so current-day execution is visible before secondary progress surfaces.
- Today prioritizes unresolved and missed required commitments before inactive, scheduled-rest, and completed items.
- The 5:00 PM warning threshold is represented as presentation data and displayed in 12-hour format.
- The 10:00 PM execution deadline is displayed separately from the 12:00 AM calendar boundary.
- Missed-state presentation supports target and completed-before-deadline values without XP, level, or Discipline consequences.
- Daily closeout presentation shows required, completed, missed, overall evaluation label, and progression-impact boundary supplied by demo state.
- Streak-at-risk treatment is shown for unresolved required activity streaks, and automatic streak protection is displayed without manually consuming freezes.
- Boss notifications cover new offer, accepted/deadline, completed, and failed states while remaining separate from ordinary daily commitment alerts.
- Inactive Mode alerts cover started, expires tomorrow, and expired states without consequence logic.
- Reading reminder displays current book progress and pages remaining; book recovery is represented as non-failure state.
- Notification history is intentionally lightweight and distinguishes mandatory critical categories from optional reminders without adding a disable-all loophole.
- The Today surface uses contained visual severity, textual labels, accessible progress, keyboard-accessible links, and mobile-first stacked layouts.
- Deferred progression algorithms, XP rewards/penalties, Discipline calculations, level regression, daily qualification, streak qualification, Boss penalty, adaptive notification timing, push/service-worker/email/SMS delivery, Supabase persistence, and database work.

## Phase 2.15 - Profile / Character

- Added typed Profile contracts in `src/types/profile.ts`.
- Added `PersonalProfile` for editable personal information: name, age, height in cm, weight in kg, and broad personal goals.
- Added `CharacterAvatar` to reserve a future level-based avatar asset without implementing avatar selection rules.
- Added structured monthly analysis contracts with strong, weak, and neutral insight direction support.
- Added explicit Profile demo data in `src/lib/demo/profile-demo-data.ts` using existing achievements, titles, consistency, Improvement Areas, Boss data, and Journey context as supplied presentation inputs.
- Replaced the `/character` placeholder with the Profile / Character screen.
- Added `ProfileWorkspace` in `src/components/profile/profile-workspace.tsx`.
- Profile identity shows avatar placeholder, name, current level, highest level, selected active title, total XP, evolving-since date, active days, and personal detail summary.
- Current level and highest level remain separate; the demo supports current level below historical highest level without treating it as an error.
- Added restrained local edit behavior for name, age, height, weight, and personal goals only.
- Earned/system data such as level, XP, consistency, achievements, records, lifetime stats, and title eligibility remain read-only.
- Added compact title selection using active titles, with inactive titles visible but not selectable, and a link to the full Achievements page for title history.
- Added prominent Discipline & Consistency summary with current consistency, current overall streak, best streak, and compact activity-level consistency.
- Added Current Development summary focused on Core and Priority Improvement Areas rather than duplicating every commitment.
- Added Recent Performance with mandatory time context for each evidence metric.
- Added Personal Records and Lifetime Statistics as read-only earned evidence.
- Added Major Achievements as a curated selection only, with a link to the full Achievements page instead of creating a badge wall.
- Added Monthly Analysis presentation with both strongest-area and needs-attention evidence, supplied as mock structured data rather than calculated in Profile.
- Added Progression History summary as accumulated identity context without merging the Journey timeline into Profile.
- Kept Profile private and avoided followers, sharing, likes, leaderboards, or public profile mechanics.
- Added accessible labels, real form controls, validation error messaging, keyboard-accessible title controls, and responsive mobile-first stacking.
- Deferred avatar progression, monthly-analysis algorithms, Discipline algorithms, XP algorithms, level algorithms, progression/regression algorithms, adaptive target logic, recommendation engines, public profile features, Supabase persistence, and database work.

## Phase 2.16 - Responsive, Icons & Motion Polish

- Added shared motion tokens in `src/app/globals.css` for fast, base, and panel transitions.
- Added global `prefers-reduced-motion` handling that disables nonessential animation and transitions.
- Added a restrained `motion-panel` utility for dialog/edit-panel entry motion.
- Updated the shared `Button` primitive with consistent min-height, transition timing, disabled treatment, and subtle pressed feedback.
- Updated the shared `Progress` primitive so value changes use a restrained width transition and respect reduced-motion preferences.
- Tightened the shared `Card` primitive padding on mobile while preserving the existing surface and shadow language.
- Refined desktop and mobile navigation transitions with shared timing/easing.
- Updated navigation icons to clearer lucide semantics: dashboard, list checks, route, user, reports, awards, settings, and plus.
- Improved mobile header and bottom navigation safe-area treatment.
- Kept Log Activity visually strongest in mobile navigation without increasing its footprint.
- Added `src/config/icon-maps.ts` with typed activity and status icon mappings.
- Updated Activity History to use centralized activity icons and a cleaner mobile row layout.
- Moved Dashboard Today above Identity/Progression so execution state is first on mobile and desktop.
- Improved Reports target-vs-actual chart rows for narrow widths with safer grid tracks and progress-bar transitions.
- Improved Profile responsiveness by reducing mobile avatar height, tightening mobile spacing, and adding restrained avatar hover feedback on desktop.
- Added consistent dialog entry motion to Boss rejection and Flexible Improvement removal confirmations.
- Preserved keyboard focus states, textual status labels, and icon accessibility conventions.
- No constant decorative animations, page transition system, reward animation system, motion dependency, product feature, or algorithm was introduced.
- Validation passed with lint, typecheck, and production build.

## Phase 2.17 - System States & First-Use UX

- Added shared system-state contracts in `src/types/system-state.ts`.
- Added `DataViewState` with `loading`, `ready`, `empty`, `insufficient_data`, and `error`.
- Added `DataMaturity` with `new`, `building`, and `established` as a presentation maturity concept only.
- Added `src/components/ui/system-state.tsx` with reusable `SystemState`, `LoadingState`, `ErrorState`, and `OfflineState` components.
- System states use restrained icons, textual explanations, optional actions, existing tokens, `motion-panel`, and no constant animation.
- Dashboard Today now handles no required commitments, empty Boss alerts, empty notification history, and empty inactive-mode alerts.
- Daily closeout remains supplied presentation state and does not calculate XP, Discipline, streak qualification, or level impact.
- Daily Quests now distinguishes no configured quests from scheduled-rest/no-required-work states and links to configuration only when that solves the state.
- Activity Logging now handles no active activities without rendering an empty selector and keeps the hook-based logging flow isolated in a child session component.
- Activity History now uses a first-record empty state instead of a plain empty list.
- Consistency now supports insufficient-data presentation and preserves the difference between no best streak history and a zero-day current streak.
- Journey now supports a clean Level 1 starting point when no milestone history exists, without populating fake completed milestones.
- Boss Challenges now distinguish no Boss evidence/history from offered, active, completed, failed, and rejected demo states.
- Reports now accept explicit view state props for loading, error, empty, and insufficient-data states without calculating data maturity.
- Reports target-vs-actual and reading sections now avoid meaningless empty charts/cards when activity measurements, current book, or completed books are missing.
- Achievements now handle empty achievement results and no-title history without revealing hidden achievements or inventing status titles.
- Improvement Areas now handle empty Core, Priority, Flexible, Program, Catalogue, and Completed sections with concise state messaging.
- Settings includes offline-ready presentation as a UI boundary only; no network detection, sync, push notifications, or persistence was implemented.
- Profile now handles no selected title, no title history, insufficient consistency, missing monthly analysis, no current development, no records, no lifetime history, no major achievements, and no progression-history evidence.
- Avatar fallback remains stable and prevents broken image presentation when no asset is supplied.
- Form validation remains specific for profile, settings, reading, schedules, custom activity, and capacity-related states.
- Disabled and unavailable states retain textual reasons, especially commitment capacity and locked Core/Priority commitments.
- Empty-state language is concise, direct, and avoids fabricated percentages, fake streaks, fake Bosses, fake achievements, fake analysis, or fake records.
- Missing data and known zero values remain conceptually separate: empty states use no-data copy, while supplied numeric zero can still render as a real value where meaningful.
- Loading skeleton infrastructure was intentionally kept lightweight; no broad async data system was introduced.
- Error states are recoverable where a retry action can be supplied, without exposing raw technical exceptions.
- Offline presentation is ready for future network-aware code but does not pretend demo changes are synchronized.
- Mobile and desktop layouts inherit the Phase 2.16 responsive structure; empty/error/loading states stack cleanly and avoid horizontal overflow.
- Accessibility improvements include semantic state text, decorative icon hiding, optional retry buttons, `role="alert"` on form errors already present, textual disabled reasons, and reduced-motion-compatible state panels.
- Deferred progression algorithms, XP/level systems, Habit Zone readiness, Boss generation, monthly-analysis algorithms, adaptive targets, achievement evaluation, Supabase persistence, real push notifications, offline synchronization, and social features.
- Validation passed with lint, typecheck, and production build.

## Pre-Phase 2.18 - Weekly Reminders

- Added a separate Weekly Reminder contract in `src/types/weekly-reminder.ts`.
- Added `WeeklyReminder` with `id`, `title`, `enabled`, `completed`, `createdAt`, and optional `completedAt`.
- Added `WeeklyReminderSnapshot` with a per-user/demo `maxActive` value and reminder list.
- Added centralized demo Weekly Reminder state in `src/lib/demo/evolve-demo-data.ts` covering pending, completed, enabled, off, and 3-of-3 active limit states.
- Wired Weekly Reminders into `DailyExecutionSnapshot` as optional weekly presentation data, separate from Daily Quests, Activity Records, Bosses, and Improvement Areas.
- Dashboard Today now renders Weekly Reminders under `Optional this week`, below required commitments and above secondary actions.
- Dashboard reminders show neutral `Pending` and `Completed` states only; there is no missed, failed, overdue, warning, critical, deadline, XP, streak, or progression treatment.
- Dashboard reminder completion uses local/demo state and marks the current weekly cycle complete without creating progression consequences.
- Wired Weekly Reminders into `SettingsSnapshot`.
- Settings now includes a dedicated `Weekly Reminders` management section, separate from serious activity and Improvement Area configuration.
- Settings supports adding a reminder by name only, renaming existing reminders, toggling reminders on/off, and removing reminders.
- Enforced the maximum-three active reminder rule in local/demo UI state; off reminders do not count toward the limit.
- When three reminders are active, activating another off reminder is disabled with explanatory text.
- Adding a reminder while the active limit is full creates it off rather than exceeding the active limit.
- Weekly Reminders use neutral Bell/Circle/Check icons and existing Evolve surfaces so they remain quieter than required execution work.
- Mobile layout keeps titles wrapping, controls touch-safe, and avoids horizontal overflow.
- Accessibility includes labeled inputs, accessible toggle state, textual optional/pending/completed/off status, and keyboard-accessible Done/Add/Remove controls.
- Preserved the future backend boundary for reminder definitions, enabled status, weekly completion, carry-over, and completion history.
- Deferred recurrence algorithms, persistence, completion history storage, notification delivery, XP, levels, Discipline, Consistency, streaks, Boss influence, achievements, due dates, scheduling, priorities, subtasks, and todo-list behavior.
- Validation passed with lint, typecheck, and production build.

## Phase 2.18 - Full Integration, Consistency Audit & Cleanup

- Audited route structure, navigation, app shell, shared components, domain types, demo data, settings configuration, icon mappings, state components, motion utilities, terminology, and algorithm-boundary search results.
- Added `src/lib/demo/demo-persona.ts` as a small centralized established-user persona source for shared demo identity and progression presentation.
- Normalized the established demo persona across Dashboard, Journey, Reports, and Profile around current level 38, highest level 42, total XP 84,240, and selected title Endurance.
- Updated Journey demo state so Level 42 is preserved as historical highest reached while Current Level 38 remains the current position.
- Updated Reports progression demo values to match the same persona while preserving period-specific historical movement and regression-capable highest-level presentation.
- Updated report date labels to the current Phase-2 snapshot week: Today `Aug 28, 2026`, This Week `Aug 23-29, 2026`, Previous Week `Aug 16-22, 2026`.
- Corrected reading demo consistency so Dashboard and Reports both derive Atomic Habits at 208 / 320 pages.
- Updated August reading report/profile values to 768 pages, matching two completed August books plus current Atomic Habits progress.
- Adjusted Reports reading metrics to use the selected period's reading activity value instead of combining all completed book history into every period.
- Renamed the user-facing `/goals` route title and navigation label to `Boss Challenges` while preserving the existing route path.
- Added a dedicated `boss` navigation icon key and lucide Crown mapping so Boss Challenges no longer reuse the quest icon.
- Removed fixed Daily Quest XP reward fields from the quest type, demo quests, and Daily Quest UI to avoid implying finalized XP reward logic.
- Kept Reports XP summary as explicit mocked progression-report state only; no activity-to-XP formula was added.
- Cleaned the Daily Quest card copy to emphasize required execution from active commitments.
- Removed the user-facing `Full demo` capacity metric from Improvement Areas.
- Removed the now-unused `demoFullCapacityImprovements` fixture.
- Verified Weekly Reminders remain separate from Daily Quests, Improvement Areas, Activity Records, Bosses, Achievements, Titles, Consistency, and commitment capacity.
- Verified Weekly Reminders remain optional, appear under `Optional this week`, use Pending/Completed/Off states only, and do not use missed, failed, warning, critical, deadline, XP, streak, or progression language.
- Verified Core, Priority, and Flexible terminology remains consistent; only Flexible exposes free removal.
- Verified deadline terminology remains `5:00 PM`, `10:00 PM`, and `12:00 AM` in 12-hour user-facing format.
- Verified the weekly reporting range now follows Sunday to Saturday.
- Verified reading remains page/book based and recovery remains separate from inactive mode and missed work.
- Verified Inactive Mode, Streak Freeze, Boss status, Achievement category/status, Title active/inactive, Journey, Reports, and Profile concepts remain separated in types and UI.
- Verified hidden achievement state is still preserved and no rarity system terms exist.
- Verified Settings does not expose editable XP, difficulty, adaptive target, penalty, level, or consistency formulas.
- Verified no algorithm-engine names or accidental final evaluators exist for XP, level, Discipline, consistency, streaks, Boss generation, achievement qualification, title eligibility, monthly analysis, or Habit Zone readiness.
- Verified no obvious development console calls, TODO/FIXME leftovers, arbitrary emoji, gamey rarity language, or stale Phase-2 temporary component names remain.
- Reused existing state, card, button, progress, icon, responsive, and motion primitives; no new UI dependency or large abstraction was introduced.
- Accessibility remains based on semantic buttons/links, labeled form controls, textual status, disabled-state explanation, visible focus from shared controls, and reduced-motion-compatible CSS.
- Performance cleanup was limited to removing unused demo data and avoiding extra dependencies; no heavy animation or data layer was added.
- No files were removed from disk; only the unused exported demo fixture was deleted from source.
- Existing test script is not defined in `package.json`, so no separate test suite was run.
- Validation passed with `npm run lint`.
- Validation passed with `npm run typecheck`.
- Validation passed with `npm run build`.
- Remaining mocked functionality: demo persona state, demo activity records, demo quest matching, demo weekly reminders, demo consistency state, demo Journey milestones, demo Boss evidence/status, demo report periods, demo reading records/books, demo achievements/titles, demo profile analysis, demo settings, and offline/loading/error presentation states.
- Deferred to Phase 3: XP rewards, XP penalties, level thresholds, level gain/loss, Discipline scoring, consistency scoring, streak qualification, Streak Freeze earning/use rules, inactive-mode consequences, commitment capacity reduction/restoration, adaptive target generation, Daily Quest generation, daily closeout evaluation, Boss generation, Boss difficulty, Boss rejection/failure penalties, achievement qualification, title eligibility/loss/reactivation, Journey mutation, monthly analysis intelligence, Habit Zone readiness, recommendation systems, Supabase persistence, authentication, push notifications, offline synchronization, and backend APIs.
- Phase 2 complete.
- No Phase 3 algorithm logic was implemented.

## Phase 3.1 - Evidence and Execution Foundation

- Created the Evolve engine foundation under `src/domain/evolve-engine`.
- Added immutable activity evidence contracts with `ActivityExecutionEvidence`, `EvidenceSource`, `EvidenceQuality`, `RequirementState`, `ExclusionState`, `DeadlineState`, and `ExecutionState`.
- Preserved fact versus interpretation boundaries: raw evidence keeps target, actual, source, quality, timing, requirement state, deadline state, exclusion state, raw completion ratio, and capped commitment fulfillment.
- Added requirement-state separation for `MISSED`, `NO_REQUIREMENT`, `EXCLUDED`, and `UNKNOWN`; these are not collapsed into a generic skipped/missed state.
- Added execution classification in `execution/classifier.ts` with configurable `ExecutionClassificationPolicy`.
- Supported execution outputs: `FULL`, `QUALIFYING_PARTIAL`, `ATTEMPT`, `INSUFFICIENT_EFFORT`, `MISSED`, and `EXCLUDED`.
- Added raw output handling where numeric execution preserves uncapped `rawCompletionRatio` while separately storing capped `commitmentFulfillment`.
- Added consistency contribution derivation in `execution/consistency.ts`; excluded and no-requirement states do not enter the denominator, while attempts remain evidence without completion-consistency credit.
- Added reusable aggregation utilities for factual/derived reporting output.
- Added Sunday-to-Saturday weekly aggregation in `aggregation/weekly.ts`.
- Added calendar-month aggregation in `aggregation/monthly.ts` with activity-specific breakdowns.
- Aggregation returns eligible requirements, execution counts, consistency contribution, consistency percentage, expected output, raw actual output, raw output ratio, effective output, and execution distribution.
- Kept raw output and effective output separate so future recovery/make-up credit can be introduced without rewriting historical facts.
- Added baseline contracts and a replaceable `BaselineEstimator` interface.
- Added `RobustBaselineEstimator`, which separates peak capability from sustainable capability and limits the influence of one extreme observation.
- Added confidence as an internal interpretation concept through `ConfidenceValue`.
- Added target history contracts with previous target, new target, effective date, reason, recommendation reference, and user decision.
- Added target history helpers that append new target records without overwriting historical targets.
- Added an ActivityRecord-to-evidence adapter so existing recorded activity can be converted into standardized evidence without replacing the existing ActivityRecord model.
- Added a development-only evidence inspection helper that returns raw evidence, weekly aggregation, monthly aggregation, and baseline estimates outside production.
- Integrated Reports data contracts with engine-derived evidence fields on target-vs-actual metrics: execution state, raw completion ratio, and capped fulfillment.
- No UI redesign was performed.
- No XP, Current Level, Progression Rating, Boss generation, recommendation scoring, behavioral analysis, Discipline, level regression, achievement, title, or adaptive-target formula was implemented.
- Added `tests/evolve-engine.test.ts` with 12 unit tests covering classification, excess output preservation, proportional partial consistency, attempt behavior, missed preservation, excluded/no-requirement distinction, robust baseline behavior, peak/sustainable separation, Sunday-to-Saturday aggregation, immutable aggregation, and target history preservation.
- Added `tsconfig.test.json` and a `npm test` script using TypeScript compilation into `.test-build` plus Node's built-in test runner.
- Added `.test-build` to `.gitignore` and ESLint ignores so generated test output is not linted or committed.
- Validation passed with `npm test`.
- Validation passed with `npm run typecheck`.
- Validation passed with `npm run lint`.
- Validation passed with `npm run build`.
- Deferred to Phase 3.2 and later: final consistency scoring, Discipline, XP rewards/penalties, level progression/regression, Progression Rating, Boss generation, challenge difficulty, recommendation scoring, behavioral analysis, inactive/recovery consequences, streak-freeze eligibility, achievement/title qualification, adaptive targets, Supabase persistence, and production debug tooling.

## Phase 3.2 - Consistency, Reliability & Capability Engine

- Extended the existing `src/domain/evolve-engine` architecture instead of creating duplicate execution, evidence, aggregation, or baseline models.
- Added shared signal contracts for consistency summaries, reliability, attendance, capability, target relationship, gap classification, period comparison, and composed activity development state.
- Preserved the separation between execution, consistency, and capability throughout the engine.
- Added `src/domain/evolve-engine/consistency/summary.ts` for activity-level consistency over current week, previous week, current month, previous month, and rolling recent history.
- Consistency summaries now include eligible opportunities, full completions, qualifying partials, attempts, insufficient efforts, misses, exclusions, total consistency credit, consistency ratio, scheduled distribution, execution distribution, recent direction, confidence, and internal pattern signals.
- Added internal pattern signals for miss clusters, consecutive misses, full clusters, recovery after misses, partial-heavy execution, attempt ratio, stability, and repeated weak day-of-week patterns.
- Added `src/domain/evolve-engine/reliability/attendance.ts` to preserve attendance/show-up evidence separately from completion consistency credit.
- Added `src/domain/evolve-engine/reliability/reliability.ts` with bounded reliability value, confidence, state, and supporting signals.
- Reliability state supports `UNKNOWN`, `UNSTABLE`, `DEVELOPING`, `RELIABLE`, `HIGHLY_RELIABLE`, `DETERIORATING`, and `REBUILDING`.
- Reliability considers consistency, attendance, miss clustering, recent direction, volatility, and evidence sufficiency without treating one isolated miss as collapse.
- Added `src/domain/evolve-engine/capability/estimator.ts` for robust capability estimation.
- Capability now separates sustainable, peak, recent, and established capability.
- Capability includes confidence, robust volatility, momentum, direction, sample counts, qualifying sample counts, policy type, and baseline state.
- Capability policy supports future quantitative, frequency, milestone, and binary capability models without solving every activity family now.
- The estimator uses median/trimmed/winsorized robust centers rather than a plain arithmetic average as the sole standard.
- Peak capability remains independent from sustainable capability and is not used as the default target.
- Recent capability can diverge from established capability so deterioration, improvement, comeback, and rebuilding evidence can be represented without erasing history.
- Baseline state transitions remain conservative: new evidence starts as `NEW`/`BUILDING`, stable repeated evidence can become `ESTABLISHED`, and repeated divergence from an established baseline can become `REBUILDING`.
- Added `src/domain/evolve-engine/target/relationship.ts` to classify target relationship as unknown, below capability, appropriate, challenging, or potentially unsustainable.
- Added `src/domain/evolve-engine/gap/classifier.ts` to distinguish no meaningful gap, discipline gap, capability gap, mixed gap, and insufficient evidence.
- Gap classification uses attendance, consistency, reliability, target relationship, and capability confidence; it returns supporting evidence only and does not change targets or apply consequences.
- Added `src/domain/evolve-engine/comparison/comparison.ts` for me-vs-me period comparisons with absolute change, relative change, direction, and confidence.
- Added `src/domain/evolve-engine/development/activity-state.ts` as the reusable `ActivityDevelopmentState` builder for later Phase 3 systems.
- Extended the development-only inspector to include activity development states, including consistency, attendance, reliability, capability, target relationship, and gap classification.
- Added non-visual Reports data integration: `ActivityReport` can now carry engine-derived development signals while the current UI design remains unchanged.
- Added `src/domain/evolve-engine/internal/statistics.ts` for reusable robust statistical helpers.
- Added `tests/evolve-engine-phase-3-2.test.ts` with Phase 3.2 coverage.
- Test coverage now verifies stable capability, outlier handling, gradual sustainable-capability movement, rebuilding evidence, poor-session caution, exceptional-session caution, volatility, attendance versus consistency, excluded opportunity behavior, miss-cluster reliability, capability gap, discipline gap, mixed gap, insufficient evidence, target relationship, period comparison, and raw evidence immutability.
- Existing Phase 3.1 tests remain intact and passing.
- Validation passed with `npm test` across 29 tests.
- Validation passed with `npm run typecheck`.
- Validation passed with `npm run lint`.
- Validation passed with `npm run build`.
- No UI redesign, XP, Current Level, Progression Rating, Boss generation, achievement logic, adaptive target recommendation, commitment-capacity change, demotion, behavioral interference, Supabase persistence, or final hidden anti-gaming formula was implemented.
- Deferred to Phase 3.3 and later: final progression scoring, XP effects, level movement, Progression Rating, recommendation generation, Boss generation/difficulty, behavioral interference analysis, achievement/title qualification, adaptive targets, capacity changes, demotion rules, and production persistence.

## Phase 3.3 - Behavior Intelligence & Development Pillars

- Extended the existing `src/domain/evolve-engine` architecture without duplicating Phase 3.1 evidence or Phase 3.2 activity-state models.
- Added high-level development pillar contracts for `HEALTH`, `DISCIPLINE`, `CAPABILITY`, and `BALANCE`.
- Added configurable activity-to-pillar contribution mapping with primary, secondary, and supporting roles.
- Added `DevelopmentPillarState` with direction, confidence, supporting activities, weak activities, evidence summary, recent state, established state, stability, momentum, and pressure flags.
- Added immutable `BehaviorEvent` facts for non-development behavior observations such as lifestyle and restricted behaviors.
- Added behavior categories: `DEVELOPMENT`, `LIFESTYLE`, and `RESTRICTED`.
- Added `RestraintContract` architecture supporting future `ZERO`, `FREQUENCY_CAP`, `QUANTITY_CAP`, `SPACING_RULE`, and `REDUCTION_TARGET` modes.
- Added `evaluateRestraintContract` for factual restraint status, occurrences, allowed occurrences, violations, adherence, confidence, and evidence references.
- Preserved the distinction between behavior occurrence and restraint violation.
- Added `detectBehaviorInterference`, which detects repeated associations between behavior events and weaker development execution without claiming causation.
- Interference detection supports configurable lookahead windows and compares post-behavior evidence against targets and available personal capability state.
- Interference signals return impact direction, estimated strength, confidence, sample count, recurring pattern, evidence references, and careful non-causal explanation text.
- Added `BehavioralFrictionState` as a structured aggregate of repeated interference and restraint-violation evidence.
- Added `BehavioralDebtState` as a downstream interpretation layer only; it does not affect level, XP, Bosses, or progression.
- Added development pressure signals by pillar, driven by core weaknesses and interference evidence without generating prescriptions or Bosses.
- Added conservative pillar imbalance detection.
- Added Core Weakness signals for serious Core commitment neglect so strong performance in one area does not hide a separate weak Core area.
- Added cross-domain `DisciplineDevelopmentState` based on reliability patterns, weaknesses, strengths, recent trend, and restraint adherence.
- Added monthly behavior report model for future Reports.
- Added structured development analysis model for future Profile Monthly Analysis.
- Extended the development-only inspector with pillar states, behavior events, restraint evaluations, interference signals, behavioral friction, behavioral debt, and development pressure.
- No user-facing UI redesign was performed.
- No final Progression Rating, Current Level, level threshold, candidate-level confirmation, demotion, XP calculation, Boss-generation rule, recommendation ranking, commitment-capacity change, production anti-gaming penalty, or behavioral consequence was implemented.
- Added `tests/evolve-engine-phase-3-3.test.ts`.
- Phase 3.3 tests cover social activity with strong development, repeated behavior association, isolated behavior events, low-confidence associations, restraint within limit, restraint violations, repeated violation friction, BehaviorEvent immutability, Core weakness visibility, Health pressure targeting, no Behavioral Debt without deterioration, approved inactive/rest exclusions, cross-domain Discipline summary, capability aggregation preserving weak Core areas, low sample caution, and monthly behavior report wording.
- Existing Phase 3.1 and Phase 3.2 tests remain passing.
- Validation passed with `npm test` across 45 tests.
- Validation passed with `npm run typecheck`.
- Validation passed with `npm run lint`.
- Validation passed with `npm run build`.
- Deferred to Phase 3.4 and later: final Progression Rating, Current Level, level thresholds, candidate-level confirmation, demotion, final XP, Boss-generation rules, recommendation ranking, capacity changes, hidden production anti-gaming penalties, behavioral consequence models, persistence, and user-facing behavior analytics UI.

## Phase 3.4 - Progression Rating & Current Level Engine

- Extended the existing `src/domain/evolve-engine` architecture with progression modules; no React component formulas or UI redesigns were added.
- Added internal `ProgressionRatingBreakdown` with discipline, capability, health, balance, commitment execution, progression evidence, recovery contribution, Core Weakness pressure, behavioral friction pressure, instability pressure, rebuilding pressure, confidence, and final hidden rating.
- Added `calculateProgressionRating` as a configurable internal rating engine consuming Activity Development State, pillar states, Core Weakness, Behavioral Friction/Debt, development pressure, monthly evaluations, and recovery memory.
- Kept Lifetime XP separate from Current Level; `lifetimeXp` is accepted only as contextual input and is not used to calculate the rating or Current Level.
- Added private/replaceable progression policy and level threshold policy modules.
- Added nonlinear level threshold mapping through `LevelThresholdPolicy`; level thresholds are centralized and not scattered through UI/components.
- Added `LevelCandidateState` and candidate-level state-machine behavior.
- Candidate levels now start when supported evidence crosses a threshold, accumulate evidence-based confirmation, tolerate modest fluctuation through hysteresis, and can be lost after sustained deterioration.
- Confirmed candidate levels update Current Level, emit `LEVEL_CONFIRMED`, and can update Highest Level.
- Added `LevelRiskState` and demotion/risk state-machine behavior.
- Level risk now starts before demotion, requires sustained high-confidence deterioration to demote, and can recover to safe before demotion confirmation.
- Added Highest Level history with permanent peak level, first/last reached timestamps, establishment strength, maintained duration, and supporting evidence summary.
- Highest Level never decreases.
- Added Level Establishment Strength based on maintained rating history, monthly outcomes, confidence, confirmation quality, and volatility.
- Added Level Memory and recovery-state architecture with `NONE`, `EARLY_COMEBACK`, `ACTIVE_RECOVERY`, `NEAR_PREVIOUS_STANDARD`, and `PREVIOUS_STANDARD_RESTORED`.
- Recovery advantage applies only toward previously proven territory, depends on establishment strength, weakens after repeated collapses, and ends at the previous Highest Level frontier.
- Added rating history entries with timestamp, hidden rating, confidence, Current Level, Candidate Level, risk state, and major component summaries.
- Added domain events for progression rating updates, candidate start/loss/confirmation, risk start/recovery, demotion, Highest Level update, recovery start, and previous-level restoration.
- Added a clean Level Summary view model for future UI integration without exposing raw internal mechanics.
- Extended the development-only inspector with progression rating and level state when current/highest level context is supplied.
- Added `tests/evolve-engine-phase-3-4.test.ts`.
- Phase 3.4 tests cover Lifetime XP separation, rating improvement, Core Weakness drag, overperformance saturation, different viable development profiles, low-confidence caution, monthly outcome evidence, candidate creation/confirmation/loss/hysteresis, one-bad-week demotion protection, level-at-risk, confirmed demotion, risk recovery, Highest Level permanence/update, recovery advantage, recovery frontier limits, repeated-collapse weakening, establishment rebuilding, and raw evidence immutability.
- Existing Phase 3.1, 3.2, and 3.3 tests remain passing.
- Validation passed with `npm test` across 69 tests.
- Validation passed with `npm run typecheck`.
- Validation passed with `npm run lint`.
- Validation passed with `npm run build`.
- No Lifetime XP implementation, final XP calculation, final Boss rules, recommendation ranking, commitment-capacity changes, production anti-gaming penalties, persistence, schema migration, or visible UI redesign was implemented.
- Deferred to Phase 3.5 and later: final XP/Lifetime XP engine, progression impact policy tuning, Boss integration, recommendation ranking, capacity changes, production persistence, public UI presentation for candidate/risk states, final anti-gaming enforcement, and full monthly progression evaluation.

## Phase 3.7 - Engine Audit, Simulation & Tuning

- Added a development-only simulation package under `src/domain/evolve-engine/simulation`.
- The simulator runs through the real domain engine services for execution classification, activity development state, behavior/friction, Progression Rating, Current Level, target progression, Boss eligibility/outcomes, recommendations, XP ledger, achievements, titles, Journey events, capacity, and weekly/monthly closeouts.
- Added deterministic seeded generation with explicit scenario seed and duration support for `1w`, `1m`, `3m`, `6m`, `12m`, and `24m`.
- Added a structured `SimulationResult` carrying final state, level history, Progression Rating history, XP history, XP ledger, commitment history, capacity/capability history, behavior history, Boss/recommendation/target/adaptation/achievement history, weekly/monthly snapshots, source evidence snapshots, audit metrics, hard invariant failures, and tuning warnings.
- Implemented Scenario A through Scenario Z plus long-term stagnation, long-term mastery, and boundary suites: ideal beginner, static standard, high-capability low-discipline, high-attendance capability gap, mixed failure, collapsing Core commitment, extreme activity farming, minimum-threshold gaming, heroic catch-up, approved inactive period, reading recovery, successful/failed/abused adaptation, social fairness, lifestyle interference, restraint maintained/violated, high-level climb/collapse/comeback/weak establishment/cycling, Boss rejection/completion, and balanced physical/learning/mixed profiles.
- Added reusable hard invariant assertions for Lifetime XP permanence, Highest Level permanence, raw evidence immutability, neutral exclusions, missed-history preservation, peak versus sustainable capability separation, one-activity compensation limits, low-confidence consequence restraint, level shock limits, recovery frontier limits, capacity preservation, Boss idempotency, XP idempotency, monthly closeout idempotency, restraint fairness, and social fairness.
- Tightened XP idempotency auditing so simulation results preserve the final XP ledger and check duplicate transaction IDs, duplicate source keys, replay stability, and monotonic checkpoint transaction counts.
- Added tuning warnings for suspicious outcomes including fast Level growth, Level growth without development, surplus XP dominance, ignored Core weakness, large checkpoint jumps, sensitive demotion, recovery speed issues, aggressive target escalation, easy capacity unlocks, behavior false positives, social penalties, Boss repetition, and adaptation protection that does not end.
- Added compact regression fixtures in `src/domain/evolve-engine/simulation/fixtures/regression-fixtures.ts` with qualitative level bands and selected warning/surplus/Core-weakness expectations rather than exact internal decimals.
- Added `evolveEnginePolicyRegistry` to centralize simulation-visible policy ownership across XP, Progression Rating, level thresholds, target progression, Boss eligibility, recommendations, and commitment capacity without moving factual invariants into tunable config.
- Added `npm run evolve:simulate` and `npm run evolve:audit` development commands.
- Added `tests/evolve-engine-phase-3-7.test.ts`.
- Phase 3.7 tests verify scenario catalog completeness, determinism, hard invariants across the suite, XP source idempotency, accepted regression fixture bands, sensitivity analysis, and behavioral expectations around anti-farming, Core weakness pressure, late catch-up, neutral exclusions, social fairness, interference confidence, adaptation abuse, recovery memory, Highest Level permanence, Level/XP separation, capacity, and Boss farming.
- Latest validation passed with `npm test`: 153 tests, 153 passed, 0 failed.
- Latest validation passed with `npm run evolve:audit`: 33 scenarios, 0 hard invariant failures, 7 tuning warnings.
- Audit warnings observed: static standards can still produce notable Current Level growth in static/stagnation scenarios; target escalation is frequent in extreme farmer, first high-level climb, weak high-level, and long mastery scenarios; earned comeback can repeat similar Boss outcomes.
- No production UI formulas or hidden coefficients were exposed.
- No Supabase, authentication, production scheduler, or app integration rewrite was implemented.
- Performance finding: the slowest scenario in the latest audit was `first-climb-to-high-level` at about 2396ms with 1564 evidence records; current development-state derivation repeatedly scans historical evidence, so Phase 4 persistence should plan snapshot/index support for larger real histories.
- No policy tuning was applied in this cleanup pass; the suspicious outcomes remain reported as tuning warnings rather than hidden by test assertions.
- Recommendation: the domain engine is ready for Phase 3.8 integration audit, with known tuning watchpoints around static-standard Level growth, target escalation cadence, and Boss repetition.

## Phase 3.8 - Full Engine Integration Audit & Cleanup

- Audited legacy Phase 2 product logic before changes and classified findings as KEEP, REPLACE, REMOVE, or DEFER.
- Kept explicit local/demo fixture state because Supabase is deferred, but moved integrated app behavior through `src/application/evolve` commands and selectors.
- Replaced Daily Quest fixture dependency with active commitment schedule projection through `getScheduledRequirementsForDate` and `getDailyQuestViewModel`.
- Replaced direct/local Activity Logging progression behavior with `logActivity`, which creates factual ActivityRecords, classifies evidence, preserves after-deadline work separately from missed requirements, and appends idempotent XP ledger transactions.
- Replaced Boss accept/reject local-only state with command-layer orchestration. Accepted Bosses are stored as active Boss contracts; rejected Bosses are removed from active state and recorded in Boss history.
- Replaced target recommendation acceptance with target history versioning, future target update, adaptation state creation, and recommendation decision history.
- Replaced dashboard XP-to-Level progress presentation with Current Level from progression state, Highest Level from progression state, and Lifetime XP from the ledger summary.
- Replaced hardcoded reading report/current book selector values with `books` plus reading evidence.
- Replaced scattered Settings deadline labels with centralized `time-policy` labels.
- Replaced fixed selector freeze/streak demo values with neutral/evidence-derived values.
- Removed the unused temporary Phase 2 `src/lib/demo/quest-matching.ts` helper.
- Added repository interfaces for Activities, Evidence, Commitments, Weekly Reminders, Books, Bosses, Recommendations, XP, Achievements, Titles, Journey, and Snapshots with current memory-backed implementations.
- Added application-level weekly and monthly closeout commands that run domain closeout idempotently and store snapshots for reports/profile/progression consumers.
- Added active Boss and book state to the local application state contract.
- Added `docs/evolve-engine-integration.md` covering domain modules, application orchestration, repository boundaries, UI consumers, command flows, closeouts, factual vs derived state, time semantics, legacy audit decisions, and Supabase deferrals.
- Added `tests/evolve-application-phase-3-8.test.ts` covering Daily Quest derivation, before-deadline logging, late activity preservation, neutral inactive/reading recovery exclusions, Weekly Reminder progression isolation, capacity enforcement, XP/Current Level separation, Boss acceptance persistence, target history, closeout idempotency, and book-derived reading reports.
- UI pages audited: Dashboard, Today, Journey, Reports, Bosses, Achievements, Improvement Areas, Programs, Settings, Profile/Character, Activity History, and Weekly Reminders now consume application view models where their Phase 3 engine source exists.
- Remaining intentionally retained demo data: page-local demo state is still recreated from explicit fixtures until Phase 4 persistence/auth work begins.
- Remaining deferred UI issues: Settings still has local configuration controls that need deeper command wiring once persistence exists; `/quests` and `/auth` remain placeholder routes for later phases; correction/void admin UI is not built.
- Weekly Reminders remain progression-neutral: completion mutates only reminder state and does not award XP, change Current Level, affect consistency, Boss eligibility, achievements, capacity, or monthly outcome.
- Time handling is centralized for application scheduling: user timezone, 5 PM attention threshold, 10 PM progression deadline, midnight calendar boundary, and Sunday-Saturday week keys.
- Performance finding: selectors now centralize derivation, but app pages still recreate demo state per route; Phase 4 should persist snapshots and index evidence by user/activity/period to avoid repeated historical scans.
- Validation passed with `npm run typecheck`.
- Validation passed with `npm run lint`.
- Validation passed with `npm test`: 164 tests, 164 passed, 0 failed.
- Validation passed with `npm run build`.
- No Supabase, production auth, RLS, cloud scheduler, or production notification transport was implemented.
- Phase 4 readiness statement: local repositories now have a replaceable adapter boundary for the major persisted state categories, so database adapters can be introduced without rewriting product components. Some Settings command wiring and scheduler ownership remain Phase 4/5 work, but the main product logic boundary is ready for Phase 3.9 planning and then Supabase.

## Phase 4 - Supabase Backend, Authentication, Persistence & Authoritative Engine Execution

- Added official Supabase dependencies: `@supabase/supabase-js` and `@supabase/ssr`.
- Added `.env.example` entries for public Supabase URL/key, server-only service role key, `EVOLVE_USE_SUPABASE`, and an optional internal closeout job secret.
- Added migration `supabase/migrations/20260904000000_phase_4_core.sql`.
- Migration creates user/profile, Growth Commitment, target version, scheduled requirement, ActivityRecord, evidence, book, exclusion period, behavior event, restraint contract, Weekly Reminder, Boss, recommendation, XP ledger, progression state/history, rating snapshot, weekly/monthly snapshot, achievement, title, capacity, Journey, and closeout tables.
- Migration adds ownership FKs, integrity checks, idempotency constraints, key indexes, profile bootstrap trigger, update timestamp triggers, and RLS policies.
- RLS enables own-row reads and intentionally withholds client write policies for consequential tables such as XP, progression, snapshots, achievements, Bosses, recommendations, capacity, and closeouts.
- Added Next 16 `proxy.ts` route protection/session refresh using the replacement for deprecated middleware.
- Added Supabase env helpers, browser client, server cookie client, and server-only service-role client under `src/lib/supabase`.
- Added `createEmptyEvolveState` so new authenticated users start from empty engine state instead of demo history.
- Added Supabase DTO/domain mappers and `SupabaseEvolveStateRepository`, preserving domain objects in `domain_payload` while keeping ownership, status, time, and policy fields queryable.
- Added trusted server command entry points for activity logging, serious commitment creation, Weekly Reminder completion, Boss accept/reject, target recommendation accept, recommendation reject, weekly closeout, and monthly closeout.
- Activity logging now has a server-action path: client sends factual input, server authenticates, loads state, runs the real Phase 3 command/engine, persists ActivityRecords/evidence/XP, and returns a safe dashboard view model.
- Added `/api/evolve/closeouts` as a development/manual authoritative closeout route with optional bearer-secret protection.
- Converted main app pages to load through `getCurrentEvolveState`, using Supabase when configured and explicit demo state otherwise.
- Replaced `/quests` placeholder with the Daily Quest view model derived from application state.
- Added `/auth` email/password signup, login, logout, and password-reset request forms without redesigning the rest of the UI.
- Added `docs/evolve-phase-4-supabase.md` documenting architecture, auth, RLS, persistence groups, command flows, deadlines, closeouts, policy provenance, and deferred scheduler/live RLS work.
- Added `tests/evolve-phase-4-supabase.test.ts` to statically validate migration tables, RLS, server-writable boundaries, idempotency, immutable evidence fields, and auth profile bootstrap.
- Validation passed with `npm run typecheck`.
- Validation passed with `npm run lint`.
- Validation passed with `npm test`: 169 tests, 169 passed, 0 failed.
- Validation passed with `npm run build`.
- Live Supabase migration execution and two-user RLS denial tests were not run because no Supabase project/database credentials were provided in this environment.
- Remaining Phase 4 deployment work: apply migrations to a real Supabase project, generate typed database definitions, run live RLS/security tests, deploy the scheduler/worker for due requirements and closeout catch-up, and decide final production transaction/RPC strategy for multi-row atomicity.
- Phase 5 readiness statement: the app now has the backend boundary needed for full real-data product integration, but it is not ready to declare production backend complete until live migration/RLS tests pass against an actual Supabase project.
