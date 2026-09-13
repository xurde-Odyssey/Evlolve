create table if not exists public.communication_meaning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty text not null check (difficulty in ('ADAPTIVE', 'EASY', 'NORMAL', 'CHALLENGING')),
  input_mode text not null check (input_mode in ('VOICE_TEXT', 'TEXT_ONLY')),
  target_item_count integer not null check (target_item_count between 1 and 12),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null check (status in ('ACTIVE', 'COMPLETED', 'INCOMPLETE', 'ERROR')),
  completed_item_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_meaning_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.communication_meaning_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase_id uuid references public.communication_phrases(id) on delete set null,
  question_type text not null check (question_type in ('WHAT_DOES_IT_MEAN', 'REALLY_SAYING', 'BEST_RESPONSE', 'SAME_MEANING', 'MINI_CONVERSATION')),
  content jsonb not null,
  difficulty text not null check (difficulty in ('ADAPTIVE', 'EASY', 'NORMAL', 'CHALLENGING')),
  category text not null,
  sequence integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_meaning_attempts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.communication_meaning_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null,
  response_mode text not null check (response_mode in ('TEXT', 'VOICE_TRANSCRIPT')),
  correctness text not null check (correctness in ('CORRECT', 'PARTIAL', 'INCORRECT')),
  confidence text check (confidence in ('SURE', 'NOT_SURE')),
  used_hint boolean not null default false,
  time_taken_ms integer,
  analysis jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communication_meaning_sessions_user_created_idx on public.communication_meaning_sessions(user_id, created_at desc);
create index if not exists communication_meaning_items_session_idx on public.communication_meaning_items(session_id, sequence);
create index if not exists communication_meaning_attempts_item_idx on public.communication_meaning_attempts(item_id, created_at);

alter table public.communication_meaning_sessions enable row level security;
alter table public.communication_meaning_items enable row level security;
alter table public.communication_meaning_attempts enable row level security;

create policy "communication meaning sessions own" on public.communication_meaning_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "communication meaning items own" on public.communication_meaning_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "communication meaning attempts own" on public.communication_meaning_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
