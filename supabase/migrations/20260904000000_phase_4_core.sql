-- Phase 4: Supabase persistence, authority boundaries, and RLS.
-- Domain algorithms remain in TypeScript. SQL protects ownership, idempotency,
-- append-oriented facts, and server-owned derived state.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  age integer check (age is null or age between 0 and 130),
  height_cm numeric check (height_cm is null or height_cm > 0),
  weight_kg numeric check (weight_kg is null or weight_kg > 0),
  goals jsonb not null default '[]'::jsonb,
  timezone text not null default 'UTC',
  selected_title_id uuid,
  onboarding_state text not null default 'NOT_STARTED',
  evolve_since timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_not_blank check (length(trim(timezone)) > 0)
);

create table if not exists public.growth_commitments (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  activity_type text not null,
  category text,
  tier text not null check (tier in ('CORE', 'PRIORITY', 'FLEXIBLE')),
  status text not null check (status in ('ACTIVE', 'INACTIVE', 'COMPLETED', 'LOCKED')),
  measurement_type text not null,
  unit text not null,
  schedule_config jsonb not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  program_id uuid,
  original_target_id uuid,
  domain_payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, domain_id),
  constraint growth_commitments_schedule_object check (jsonb_typeof(schedule_config) = 'object')
);

create table if not exists public.commitment_targets (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  commitment_id uuid not null references public.growth_commitments(id) on delete restrict,
  version integer not null,
  target_value numeric not null check (target_value > 0),
  unit text not null,
  effective_from timestamptz not null,
  effective_until timestamptz,
  source text not null,
  recommendation_id uuid,
  adaptation_state text,
  policy_version text not null,
  domain_payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, domain_id),
  unique (commitment_id, version),
  constraint commitment_targets_effective_order check (
    effective_until is null or effective_until > effective_from
  )
);

create table if not exists public.scheduled_requirements (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  commitment_id uuid not null references public.growth_commitments(id) on delete restrict,
  target_version_id uuid references public.commitment_targets(id) on delete restrict,
  scheduled_date date not null,
  timezone text not null,
  deadline_at timestamptz not null,
  requirement_state text not null check (
    requirement_state in ('PENDING', 'COMPLETED', 'QUALIFYING_PARTIAL', 'ATTEMPTED', 'MISSED', 'EXCLUDED')
  ),
  exclusion_type text check (
    exclusion_type is null or exclusion_type in ('GLOBAL_INACTIVE', 'READING_RECOVERY', 'SCHEDULED_REST', 'OTHER_APPROVED_EXCLUSION')
  ),
  closed_at timestamptz,
  domain_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, domain_id),
  unique (user_id, commitment_id, scheduled_date)
);

create table if not exists public.activity_records (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  commitment_id uuid references public.growth_commitments(id) on delete restrict,
  scheduled_requirement_id uuid references public.scheduled_requirements(id) on delete restrict,
  target_version_id uuid references public.commitment_targets(id) on delete restrict,
  book_id uuid,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  actual_value numeric,
  unit text,
  measurement_type text not null,
  source text not null check (source in ('MANUAL', 'TRACKED', 'VERIFIED', 'SYSTEM_DERIVED')),
  evidence_quality text not null default 'STANDARD',
  execution_state text,
  deadline_state text,
  record_status text not null default 'ACTIVE' check (record_status in ('ACTIVE', 'CORRECTED', 'VOIDED')),
  supersedes_record_id uuid references public.activity_records(id) on delete restrict,
  void_reason text,
  corrected_at timestamptz,
  idempotency_key text not null,
  policy_version text not null,
  domain_payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, domain_id),
  unique (user_id, idempotency_key)
);

create table if not exists public.activity_execution_evidence (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_record_id uuid references public.activity_records(id) on delete restrict,
  commitment_id uuid references public.growth_commitments(id) on delete restrict,
  scheduled_requirement_id uuid references public.scheduled_requirements(id) on delete restrict,
  activity_type text not null,
  scheduled_for date,
  occurred_at timestamptz,
  target_value numeric,
  actual_value numeric,
  unit text,
  measurement_type text,
  source text not null,
  evidence_quality text not null,
  requirement_state text not null,
  exclusion_state text not null,
  execution_state text not null,
  deadline_state text not null,
  policy_version text not null,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, id)
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  total_pages integer not null check (total_pages > 0),
  status text not null check (status in ('READING', 'COMPLETED', 'ABANDONED')),
  started_at date not null,
  finished_at date,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, domain_id)
);

alter table public.activity_records
  add constraint activity_records_book_fk
  foreign key (book_id) references public.books(id) on delete restrict;

create table if not exists public.exclusion_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  commitment_id uuid references public.growth_commitments(id) on delete restrict,
  book_id uuid references public.books(id) on delete restrict,
  exclusion_type text not null check (
    exclusion_type in ('GLOBAL_INACTIVE', 'READING_RECOVERY', 'SCHEDULED_REST', 'OTHER_APPROVED_EXCLUSION')
  ),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  status text not null check (status in ('APPROVED', 'ACTIVE', 'ENDED', 'VOIDED')),
  reason text,
  domain_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint exclusion_period_order check (ends_at > starts_at)
);

create table if not exists public.behavior_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  behavior_type text not null,
  category text not null,
  occurred_at timestamptz not null,
  quantity numeric,
  unit text,
  source text not null default 'MANUAL',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  domain_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.restraint_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  behavior_type text not null,
  mode text not null check (mode in ('ZERO', 'FREQUENCY_CAP', 'QUANTITY_CAP', 'SPACING_RULE', 'REDUCTION_TARGET')),
  limit_config jsonb not null,
  status text not null check (status in ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED')),
  started_at timestamptz not null,
  completed_at timestamptz,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_reminders (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  cycle_state text not null check (cycle_state in ('PENDING', 'COMPLETED', 'OFF')),
  completed_cycle_key text,
  completed_at timestamptz,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, domain_id)
);

create table if not exists public.boss_challenges (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  boss_type text not null,
  status text not null check (status in ('OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'REJECTED', 'EXPIRED', 'CANCELLED_BY_SYSTEM')),
  title text not null,
  description text,
  reason_code text,
  difficulty_class text,
  affected_activity_ids text[] not null default '{}',
  affected_pillars text[] not null default '{}',
  offered_at timestamptz not null,
  accepted_at timestamptz,
  deadline_at timestamptz,
  completed_at timestamptz,
  rejected_at timestamptz,
  failed_at timestamptz,
  policy_version text not null,
  reason_snapshot jsonb not null default '{}'::jsonb,
  target_config jsonb not null default '{}'::jsonb,
  domain_payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, domain_id)
);

create table if not exists public.boss_evidence (
  boss_id uuid not null references public.boss_challenges(id) on delete cascade,
  activity_record_id uuid not null references public.activity_records(id) on delete restrict,
  contribution_type text not null,
  created_at timestamptz not null default now(),
  primary key (boss_id, activity_record_id)
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  status text not null check (status in ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SUPERSEDED')),
  priority_class text,
  reason text,
  affected_commitment_id uuid references public.growth_commitments(id) on delete restrict,
  affected_activity_id text,
  proposed_change jsonb not null default '{}'::jsonb,
  analysis_snapshot jsonb not null default '{}'::jsonb,
  policy_version text not null,
  domain_payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  unique (user_id, domain_id)
);

create table if not exists public.xp_transactions (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  category text not null,
  amount integer not null check (amount >= 0),
  reason_code text,
  evidence_refs text[] not null default '{}',
  occurred_at timestamptz not null,
  policy_version text not null,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id, category)
);

create table if not exists public.user_progression_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_level integer not null check (current_level >= 1),
  highest_level integer not null check (highest_level >= current_level),
  candidate_level integer,
  level_state text not null,
  direction text not null,
  confidence_band text not null,
  current_rating_internal numeric,
  current_policy_version text not null,
  last_confirmed_at timestamptz,
  domain_payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.progression_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  from_level integer,
  to_level integer,
  candidate_level integer,
  occurred_at timestamptz not null,
  policy_version text not null,
  evidence_summary jsonb not null default '{}'::jsonb,
  snapshot_id text,
  domain_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.progression_rating_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_type text not null check (period_type in ('WEEK', 'MONTH')),
  period_key text not null,
  internal_rating numeric,
  confidence numeric,
  direction text,
  policy_version text not null,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, period_type, period_key)
);

create table if not exists public.weekly_development_snapshots (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_key text not null,
  week_start date not null,
  week_end date not null,
  timezone text not null,
  consistency_summary jsonb not null,
  reliability_summary jsonb not null default '{}'::jsonb,
  capability_summary jsonb not null default '{}'::jsonb,
  pillar_summary jsonb not null default '{}'::jsonb,
  behavior_summary jsonb not null default '{}'::jsonb,
  rating_summary jsonb not null default '{}'::jsonb,
  current_level integer not null,
  highest_level integer not null,
  capacity integer not null,
  xp_earned integer not null default 0,
  policy_version text not null,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_key)
);

create table if not exists public.monthly_development_snapshots (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  month_key text not null,
  month_start date not null,
  month_end date not null,
  timezone text not null,
  commitment_outcomes jsonb not null default '[]'::jsonb,
  consistency_summary jsonb not null,
  output_summary jsonb not null default '{}'::jsonb,
  gap_summary jsonb not null default '{}'::jsonb,
  capability_summary jsonb not null default '{}'::jsonb,
  core_weakness_summary jsonb not null default '[]'::jsonb,
  behavior_summary jsonb not null default '{}'::jsonb,
  pillar_summary jsonb not null default '{}'::jsonb,
  rating_summary jsonb not null default '{}'::jsonb,
  level_summary jsonb not null default '{}'::jsonb,
  xp_summary jsonb not null default '{}'::jsonb,
  achievements_summary jsonb not null default '[]'::jsonb,
  boss_summary jsonb not null default '[]'::jsonb,
  recommendation_summary jsonb not null default '[]'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  policy_version text not null,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create table if not exists public.achievement_definitions (
  achievement_key text primary key,
  title text not null,
  hidden boolean not null default false,
  major boolean not null default false,
  definition jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.achievement_awards (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_key text not null,
  tier text,
  earned_at timestamptz not null,
  policy_version text not null,
  source_type text not null,
  source_id text,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  major boolean not null default false,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, domain_id)
);

create table if not exists public.title_awards (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_key text not null,
  earned_at timestamptz not null,
  active boolean not null default true,
  policy_version text not null,
  domain_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, domain_id),
  unique (user_id, title_key)
);

alter table public.profiles
  add constraint profiles_selected_title_fk
  foreign key (selected_title_id) references public.title_awards(id) on delete set null;

create table if not exists public.commitment_capacity_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current_capacity integer not null check (current_capacity between 0 and 12),
  highest_capacity integer not null check (highest_capacity >= current_capacity),
  candidate_capacity integer,
  state text not null,
  confidence numeric,
  policy_version text not null,
  domain_payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.commitment_capacity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_capacity integer,
  to_capacity integer not null,
  event_type text not null,
  occurred_at timestamptz not null,
  policy_version text not null,
  reason_snapshot jsonb not null default '{}'::jsonb,
  domain_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, occurred_at)
);

create table if not exists public.journey_events (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  occurred_at timestamptz not null,
  source_type text,
  source_id text,
  major boolean not null default false,
  policy_version text not null,
  domain_payload jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, source_type, source_id)
);

create table if not exists public.engine_closeouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_type text not null check (period_type in ('WEEK', 'MONTH')),
  period_key text not null,
  status text not null check (status in ('STARTED', 'COMPLETED', 'FAILED')),
  policy_version text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, period_type, period_key),
  unique (user_id, idempotency_key)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.bootstrap_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.bootstrap_profile();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists growth_commitments_touch_updated_at on public.growth_commitments;
create trigger growth_commitments_touch_updated_at
  before update on public.growth_commitments
  for each row execute function public.touch_updated_at();

drop trigger if exists weekly_reminders_touch_updated_at on public.weekly_reminders;
create trigger weekly_reminders_touch_updated_at
  before update on public.weekly_reminders
  for each row execute function public.touch_updated_at();

drop trigger if exists books_touch_updated_at on public.books;
create trigger books_touch_updated_at
  before update on public.books
  for each row execute function public.touch_updated_at();

drop trigger if exists restraint_contracts_touch_updated_at on public.restraint_contracts;
create trigger restraint_contracts_touch_updated_at
  before update on public.restraint_contracts
  for each row execute function public.touch_updated_at();

create index if not exists activity_records_user_occurred_idx on public.activity_records(user_id, occurred_at desc);
create index if not exists activity_records_commitment_occurred_idx on public.activity_records(commitment_id, occurred_at desc);
create index if not exists scheduled_requirements_user_date_idx on public.scheduled_requirements(user_id, scheduled_date);
create index if not exists commitment_targets_commitment_effective_idx on public.commitment_targets(commitment_id, effective_from desc);
create index if not exists behavior_events_user_occurred_idx on public.behavior_events(user_id, occurred_at desc);
create index if not exists xp_transactions_user_occurred_idx on public.xp_transactions(user_id, occurred_at desc);
create index if not exists progression_events_user_occurred_idx on public.progression_events(user_id, occurred_at desc);
create index if not exists weekly_snapshots_user_start_idx on public.weekly_development_snapshots(user_id, week_start desc);
create index if not exists monthly_snapshots_user_month_idx on public.monthly_development_snapshots(user_id, month_key desc);
create index if not exists boss_challenges_user_status_idx on public.boss_challenges(user_id, status);
create index if not exists recommendations_user_status_idx on public.recommendations(user_id, status);
create index if not exists journey_events_user_occurred_idx on public.journey_events(user_id, occurred_at desc);
create unique index if not exists progression_events_source_unique_idx
  on public.progression_events(user_id, event_type, occurred_at, coalesce(snapshot_id, ''));
create unique index if not exists achievement_awards_tier_unique_idx
  on public.achievement_awards(user_id, achievement_key, coalesce(tier, ''));
create unique index if not exists journey_events_source_unique_idx
  on public.journey_events(user_id, event_type, coalesce(source_type, ''), coalesce(source_id, ''));

alter table public.profiles enable row level security;
alter table public.growth_commitments enable row level security;
alter table public.commitment_targets enable row level security;
alter table public.scheduled_requirements enable row level security;
alter table public.activity_records enable row level security;
alter table public.activity_execution_evidence enable row level security;
alter table public.books enable row level security;
alter table public.exclusion_periods enable row level security;
alter table public.behavior_events enable row level security;
alter table public.restraint_contracts enable row level security;
alter table public.weekly_reminders enable row level security;
alter table public.boss_challenges enable row level security;
alter table public.boss_evidence enable row level security;
alter table public.recommendations enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.user_progression_state enable row level security;
alter table public.progression_events enable row level security;
alter table public.progression_rating_snapshots enable row level security;
alter table public.weekly_development_snapshots enable row level security;
alter table public.monthly_development_snapshots enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.achievement_awards enable row level security;
alter table public.title_awards enable row level security;
alter table public.commitment_capacity_state enable row level security;
alter table public.commitment_capacity_events enable row level security;
alter table public.journey_events enable row level security;
alter table public.engine_closeouts enable row level security;

create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update safe own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "commitments select own" on public.growth_commitments for select using (auth.uid() = user_id);
create policy "targets select own" on public.commitment_targets for select using (auth.uid() = user_id);
create policy "requirements select own" on public.scheduled_requirements for select using (auth.uid() = user_id);
create policy "activities select own" on public.activity_records for select using (auth.uid() = user_id);
create policy "evidence select own" on public.activity_execution_evidence for select using (auth.uid() = user_id);
create policy "books select own" on public.books for select using (auth.uid() = user_id);
create policy "exclusions select own" on public.exclusion_periods for select using (auth.uid() = user_id);
create policy "behavior select own" on public.behavior_events for select using (auth.uid() = user_id);
create policy "restraints select own" on public.restraint_contracts for select using (auth.uid() = user_id);
create policy "weekly reminders select own" on public.weekly_reminders for select using (auth.uid() = user_id);
create policy "weekly reminders update own safe" on public.weekly_reminders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bosses select own" on public.boss_challenges for select using (auth.uid() = user_id);
create policy "boss evidence select own" on public.boss_evidence for select using (
  exists (
    select 1 from public.boss_challenges b
    where b.id = boss_evidence.boss_id and b.user_id = auth.uid()
  )
);
create policy "recommendations select own" on public.recommendations for select using (auth.uid() = user_id);
create policy "xp select own" on public.xp_transactions for select using (auth.uid() = user_id);
create policy "progression state select own" on public.user_progression_state for select using (auth.uid() = user_id);
create policy "progression events select own" on public.progression_events for select using (auth.uid() = user_id);
create policy "rating snapshots select own" on public.progression_rating_snapshots for select using (auth.uid() = user_id);
create policy "weekly snapshots select own" on public.weekly_development_snapshots for select using (auth.uid() = user_id);
create policy "monthly snapshots select own" on public.monthly_development_snapshots for select using (auth.uid() = user_id);
create policy "achievement definitions select" on public.achievement_definitions for select using (true);
create policy "achievement awards select own" on public.achievement_awards for select using (auth.uid() = user_id);
create policy "titles select own" on public.title_awards for select using (auth.uid() = user_id);
create policy "capacity state select own" on public.commitment_capacity_state for select using (auth.uid() = user_id);
create policy "capacity events select own" on public.commitment_capacity_events for select using (auth.uid() = user_id);
create policy "journey select own" on public.journey_events for select using (auth.uid() = user_id);
create policy "closeouts select own" on public.engine_closeouts for select using (auth.uid() = user_id);

-- Intentional absence of client insert/update policies on consequential tables:
-- activity_records, evidence, XP, progression, snapshots, achievements, bosses,
-- recommendations, capacity, and closeouts are written by trusted server code.
