-- Forward-only hardening for Communication's shared phrase event contract.
-- Phrase Practice has no conversation session, so session_id must remain nullable.
alter table if exists public.communication_phrase_events
  alter column session_id drop not null;

alter table if exists public.communication_phrase_events
  add column if not exists occurred_at timestamptz not null default now();

alter table if exists public.communication_phrase_events
  add column if not exists confidence numeric check (confidence >= 0 and confidence <= 1);

alter table if exists public.communication_phrase_events
  add column if not exists metadata jsonb;

create index if not exists communication_phrase_events_phrase_time_idx
  on public.communication_phrase_events(phrase_id, occurred_at desc);

create index if not exists communication_skill_evidence_user_dimension_time_idx
  on public.communication_skill_evidence(user_id, dimension, occurred_at desc);

-- Service-role writes are used by the authenticated application commands.
-- Client-readable RLS remains enabled; no public write policy is added here.
