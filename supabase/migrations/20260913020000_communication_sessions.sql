-- Communication sessions keep conversation evidence separate from the existing
-- activity ledger until the Communication activity mapping is enabled.
create table if not exists public.communication_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  target_duration_minutes smallint not null check (target_duration_minutes in (5, 10, 15, 20)),
  input_mode text not null check (input_mode in ('VOICE_TEXT', 'TEXT_ONLY')),
  conversation_style text not null check (conversation_style in ('EVERYDAY', 'SOCIAL', 'IDEAS_OPINIONS', 'MIXED')),
  difficulty text not null check (difficulty in ('ADAPTIVE', 'EASY', 'NORMAL', 'CHALLENGING')),
  status text not null check (status in ('SETUP', 'ACTIVE', 'ANALYZING', 'COMPLETED', 'INCOMPLETE', 'ERROR')),
  message_count integer not null default 0 check (message_count >= 0),
  summary jsonb,
  skill_observations jsonb not null default '{}'::jsonb,
  review jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.communication_sessions(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('SYSTEM', 'USER', 'ASSISTANT')),
  content text not null check (char_length(content) between 1 and 12000),
  input_source text not null check (input_source in ('TEXT', 'VOICE_TRANSCRIPT', 'SYSTEM')),
  timestamp timestamptz not null default now()
);

create table if not exists public.communication_phrase_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.communication_sessions(id) on delete cascade,
  phrase_id text not null,
  event_type text not null check (event_type in ('EXPOSED', 'UNDERSTOOD', 'REQUESTED_HELP', 'RECOGNIZED', 'RECALLED', 'USED_WITH_PROMPT', 'USED_UNPROMPTED', 'USED_CORRECTLY', 'USED_INCORRECTLY', 'REVIEW_PASSED', 'REVIEW_FAILED')),
  created_at timestamptz not null default now()
);

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

create index if not exists communication_sessions_user_created_idx on public.communication_sessions(user_id, created_at desc);
create index if not exists communication_messages_session_time_idx on public.communication_messages(session_id, timestamp asc);
create index if not exists communication_phrase_events_user_created_idx on public.communication_phrase_events(user_id, created_at desc);
create index if not exists communication_phrases_user_status_idx on public.communication_phrases(user_id, status, next_review_at);

alter table public.communication_sessions enable row level security;
alter table public.communication_messages enable row level security;
alter table public.communication_phrase_events enable row level security;
alter table public.communication_phrases enable row level security;
alter table public.communication_phrase_practice_sessions enable row level security;

create policy "communication sessions select own" on public.communication_sessions for select using (auth.uid() = user_id);
create policy "communication sessions insert own" on public.communication_sessions for insert with check (auth.uid() = user_id);
create policy "communication sessions update own" on public.communication_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "communication messages select own" on public.communication_messages for select using (auth.uid() = user_id);
create policy "communication messages insert own" on public.communication_messages for insert with check (auth.uid() = user_id);
create policy "communication phrase events select own" on public.communication_phrase_events for select using (auth.uid() = user_id);
create policy "communication phrase events insert own" on public.communication_phrase_events for insert with check (auth.uid() = user_id);
create policy "communication phrases select own" on public.communication_phrases for select using (auth.uid() = user_id);
create policy "communication phrases insert own" on public.communication_phrases for insert with check (auth.uid() = user_id);
create policy "communication phrases update own" on public.communication_phrases for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "communication practice sessions select own" on public.communication_phrase_practice_sessions for select using (auth.uid() = user_id);
create policy "communication practice sessions insert own" on public.communication_phrase_practice_sessions for insert with check (auth.uid() = user_id);
create policy "communication practice sessions update own" on public.communication_phrase_practice_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
