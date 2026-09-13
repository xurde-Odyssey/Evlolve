-- Behavior & Boundaries extends the Phase 4 behavior facts without creating
-- a second behavior database. Existing rows remain readable as legacy facts.
alter table public.behavior_events
  add column if not exists domain_id text,
  add column if not exists boundary_id text,
  add column if not exists record_status text not null default 'ACTIVE',
  add column if not exists idempotency_key text,
  add column if not exists evaluation_status text;

alter table public.restraint_contracts
  add column if not exists domain_id text,
  add column if not exists intent text not null default 'REDUCE',
  add column if not exists category text not null default 'RESTRICTED',
  add column if not exists version integer not null default 1,
  add column if not exists label text;

alter table public.restraint_contracts
  drop constraint if exists restraint_contracts_status_check;

alter table public.restraint_contracts
  add constraint restraint_contracts_status_check
  check (status in ('ACTIVE', 'ESTABLISHED', 'COMPLETED', 'REOPENED', 'DEACTIVATED', 'PAUSED', 'CANCELLED', 'REPLACED'));

alter table public.restraint_contracts
  drop constraint if exists restraint_contracts_mode_check;

alter table public.restraint_contracts
  add constraint restraint_contracts_mode_check
  check (mode in ('ZERO', 'FREQUENCY_CAP', 'QUANTITY_CAP', 'SPACING_RULE', 'REDUCTION_TARGET', 'ZERO_TOLERANCE', 'WEEKLY_CAP', 'MONTHLY_CAP', 'MINIMUM_SPACING', 'QUANTITY_LIMIT', 'CONTEXT_ONLY'));

drop index if exists behavior_events_user_domain_idx;
create unique index if not exists behavior_events_user_domain_idx
  on public.behavior_events(user_id, domain_id);

create unique index if not exists behavior_events_user_idempotency_idx
  on public.behavior_events(user_id, idempotency_key)
  where idempotency_key is not null;

drop index if exists restraint_contracts_user_domain_idx;
create unique index if not exists restraint_contracts_user_domain_idx
  on public.restraint_contracts(user_id, domain_id);

create index if not exists behavior_events_user_behavior_occurred_idx
  on public.behavior_events(user_id, behavior_type, occurred_at desc);

drop policy if exists "behavior insert own" on public.behavior_events;
create policy "behavior insert own" on public.behavior_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "behavior update own" on public.behavior_events;
create policy "behavior update own" on public.behavior_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "restraints insert own" on public.restraint_contracts;
create policy "restraints insert own" on public.restraint_contracts
  for insert with check (auth.uid() = user_id);

drop policy if exists "restraints update own" on public.restraint_contracts;
create policy "restraints update own" on public.restraint_contracts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
