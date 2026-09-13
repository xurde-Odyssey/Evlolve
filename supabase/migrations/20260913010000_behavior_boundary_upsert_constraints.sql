-- Supabase upserts use (user_id, domain_id) as the authoritative identity.
-- A normal unique index is required for Postgres conflict inference.
drop index if exists public.behavior_events_user_domain_idx;
create unique index if not exists behavior_events_user_domain_idx
  on public.behavior_events(user_id, domain_id);

drop index if exists public.restraint_contracts_user_domain_idx;
create unique index if not exists restraint_contracts_user_domain_idx
  on public.restraint_contracts(user_id, domain_id);

alter table public.restraint_contracts
  drop constraint if exists restraint_contracts_status_check;

alter table public.restraint_contracts
  add constraint restraint_contracts_status_check
  check (status in ('ACTIVE', 'ESTABLISHED', 'COMPLETED', 'REOPENED', 'DEACTIVATED', 'PAUSED', 'CANCELLED', 'REPLACED'));
