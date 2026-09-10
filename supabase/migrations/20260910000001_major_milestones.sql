create table if not exists public.major_milestones (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  commitment_id uuid not null references public.growth_commitments(id) on delete restrict,
  activity_type text not null,
  title text not null,
  target_days integer not null check (target_days in (100, 150, 200)),
  started_at timestamptz not null,
  status text not null check (status in ('ACTIVE', 'COMPLETED', 'ARCHIVED')),
  completed_at timestamptz,
  policy_version text not null,
  domain_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, domain_id)
);

create unique index if not exists major_milestones_one_active_per_commitment_idx
  on public.major_milestones(user_id, commitment_id)
  where status = 'ACTIVE';

create index if not exists major_milestones_user_status_idx
  on public.major_milestones(user_id, status);

alter table public.major_milestones enable row level security;

create policy "major milestones select own" on public.major_milestones
  for select using (auth.uid() = user_id);

comment on table public.major_milestones is 'Long-term milestones that advance through sustained qualifying commitment evidence.';
