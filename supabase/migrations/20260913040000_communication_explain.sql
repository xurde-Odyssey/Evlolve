create table if not exists public.communication_explain_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  practice_type text not null check (practice_type in ('MIXED', 'SITUATION', 'IDEA', 'STORY', 'OPINION')),
  difficulty text not null check (difficulty in ('ADAPTIVE', 'EASY', 'NORMAL', 'CHALLENGING')),
  input_mode text not null check (input_mode in ('VOICE_TEXT', 'TEXT_ONLY')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null check (status in ('ACTIVE', 'COMPLETED', 'INCOMPLETE', 'ERROR')),
  task_count integer not null default 0,
  completed_task_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_explain_tasks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.communication_explain_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  prompt_type text not null check (prompt_type in ('SITUATION', 'IDEA', 'STORY', 'OPINION')),
  difficulty text not null check (difficulty in ('ADAPTIVE', 'EASY', 'NORMAL', 'CHALLENGING')),
  sequence integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_explain_attempts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.communication_explain_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  transcript text not null,
  input_source text not null check (input_source in ('TEXT', 'VOICE_TRANSCRIPT')),
  attempt_number integer not null,
  used_hints jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  analysis jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communication_explain_sessions_user_created_idx on public.communication_explain_sessions(user_id, created_at desc);
create index if not exists communication_explain_tasks_session_idx on public.communication_explain_tasks(session_id, sequence);
create index if not exists communication_explain_attempts_task_idx on public.communication_explain_attempts(task_id, attempt_number);

alter table public.communication_explain_sessions enable row level security;
alter table public.communication_explain_tasks enable row level security;
alter table public.communication_explain_attempts enable row level security;

create policy "communication explain sessions own" on public.communication_explain_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "communication explain tasks own" on public.communication_explain_tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "communication explain attempts own" on public.communication_explain_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
