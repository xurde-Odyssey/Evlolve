create table if not exists public.notepad_notes (
  id uuid primary key default gen_random_uuid(),
  domain_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  color text not null check (color in ('PAPER', 'ROSE', 'YELLOW', 'BLUE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  domain_payload jsonb not null default '{}'::jsonb,
  unique (user_id, domain_id)
);

create index if not exists notepad_notes_user_updated_idx
  on public.notepad_notes(user_id, updated_at desc);

alter table public.notepad_notes enable row level security;

create policy "notepad notes select own" on public.notepad_notes
  for select using (auth.uid() = user_id);

comment on table public.notepad_notes is 'Private user-owned quick notes, separate from progression and activity evidence.';
