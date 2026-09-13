-- Phrase Bank is an evidence-backed layer over Communication sessions.
alter table public.communication_phrase_events
  alter column session_id drop not null;

alter table public.communication_phrase_events
  drop constraint if exists communication_phrase_events_event_type_check;

alter table public.communication_phrase_events
  add constraint communication_phrase_events_event_type_check
  check (event_type in ('EXPOSED', 'UNDERSTOOD', 'REQUESTED_HELP', 'RECOGNIZED', 'RECALLED', 'USED_WITH_PROMPT', 'USED_UNPROMPTED', 'USED_CORRECTLY', 'USED_INCORRECTLY', 'REVIEW_PASSED', 'REVIEW_FAILED'));

create table if not exists public.communication_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase text not null check (char_length(phrase) between 1 and 240),
  normalized_phrase text not null,
  meaning text not null default '',
  short_meaning text not null default '',
  example text not null default '',
  context_note text,
  personal_note text,
  status text not null check (status in ('NEW', 'LEARNING', 'PRACTICING', 'MASTERED')),
  source_type text not null check (source_type in ('CONVERSATION', 'MANUAL', 'EXPLAIN_BETTER', 'UNDERSTAND_MEANING', 'AI_RECOMMENDED', 'BOSS_CHALLENGE')),
  source_session_id uuid references public.communication_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_practiced_at timestamptz,
  next_review_at timestamptz,
  mastered_at timestamptz,
  is_archived boolean not null default false,
  tags jsonb not null default '[]'::jsonb,
  unique (user_id, normalized_phrase)
);

create table if not exists public.communication_phrase_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phrase_ids jsonb not null default '[]'::jsonb,
  current_index integer not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists communication_phrases_user_status_idx on public.communication_phrases(user_id, status, next_review_at);

alter table public.communication_phrases enable row level security;
alter table public.communication_phrase_practice_sessions enable row level security;

drop policy if exists "communication phrases select own" on public.communication_phrases;
drop policy if exists "communication phrases insert own" on public.communication_phrases;
drop policy if exists "communication phrases update own" on public.communication_phrases;
create policy "communication phrases select own" on public.communication_phrases for select using (auth.uid() = user_id);
create policy "communication phrases insert own" on public.communication_phrases for insert with check (auth.uid() = user_id);
create policy "communication phrases update own" on public.communication_phrases for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "communication practice sessions select own" on public.communication_phrase_practice_sessions;
drop policy if exists "communication practice sessions insert own" on public.communication_phrase_practice_sessions;
drop policy if exists "communication practice sessions update own" on public.communication_phrase_practice_sessions;
create policy "communication practice sessions select own" on public.communication_phrase_practice_sessions for select using (auth.uid() = user_id);
create policy "communication practice sessions insert own" on public.communication_phrase_practice_sessions for insert with check (auth.uid() = user_id);
create policy "communication practice sessions update own" on public.communication_phrase_practice_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
