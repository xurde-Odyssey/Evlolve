create table if not exists public.learning_tracks (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  commitment_id uuid not null references public.growth_commitments(id) on delete restrict,
  title text not null,
  track_type text not null check (track_type in ('COURSE', 'CERTIFICATION', 'SKILL', 'LANGUAGE', 'HOBBY', 'CUSTOM')),
  provider text,
  started_at timestamptz not null,
  target_completion_date date,
  status text not null check (status in ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED')),
  completed_at timestamptz,
  archived_at timestamptz,
  current_milestone_id text,
  milestones jsonb not null default '[]'::jsonb,
  domain_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, domain_id)
);

create unique index if not exists learning_tracks_one_active_per_commitment_idx
  on public.learning_tracks(user_id, commitment_id)
  where status = 'ACTIVE';

alter table public.activity_records
  add column if not exists learning_track_id uuid references public.learning_tracks(id) on delete restrict,
  add column if not exists learning_milestone_id text;

create index if not exists learning_tracks_user_status_idx
  on public.learning_tracks(user_id, status);

create index if not exists activity_records_learning_track_idx
  on public.activity_records(user_id, learning_track_id, occurred_at desc);

alter table public.learning_tracks enable row level security;

create policy "learning tracks select own" on public.learning_tracks
  for select using (auth.uid() = user_id);

comment on table public.learning_tracks is 'User-owned Learning tracks linked to the single Learning commitment; milestones are structured JSONB and activity history remains immutable.';
