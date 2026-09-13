create table if not exists public.communication_skill_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid,
  source_module text not null check (source_module in ('DAILY_CONVERSATION', 'PHRASE_BANK', 'EXPLAIN_BETTER', 'UNDERSTAND_MEANING', 'BOSS_CHALLENGE', 'LISTENING', 'PRONUNCIATION')),
  dimension text not null check (dimension in ('conversationFlow', 'understanding', 'wordChoice', 'explanationClarity', 'fluency', 'phraseUsage')),
  value numeric not null check (value >= 0 and value <= 100),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  difficulty text not null check (difficulty in ('ADAPTIVE', 'EASY', 'NORMAL', 'CHALLENGING')),
  evidence_type text not null,
  assistance_level text not null check (assistance_level in ('NONE', 'LIGHT_HINT', 'STRONG_HINT', 'MODEL_EXAMPLE', 'DIRECT_PROMPT')),
  evidence_key text not null,
  metadata jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, evidence_key, dimension)
);

create table if not exists public.communication_skill_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dimensions jsonb not null default '[]'::jsonb,
  overall_score numeric,
  overall_band text not null default 'Not enough data',
  updated_at timestamptz not null default now()
);

create table if not exists public.communication_skill_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dimension text not null,
  score numeric,
  confidence numeric not null,
  evidence_count integer not null,
  captured_at timestamptz not null default now()
);

create index if not exists communication_skill_evidence_user_time_idx on public.communication_skill_evidence(user_id, occurred_at desc);
create index if not exists communication_skill_snapshots_user_time_idx on public.communication_skill_snapshots(user_id, captured_at desc);
alter table public.communication_skill_evidence enable row level security;
alter table public.communication_skill_profiles enable row level security;
alter table public.communication_skill_snapshots enable row level security;
create policy "communication skill evidence read own" on public.communication_skill_evidence for select using (auth.uid() = user_id);
create policy "communication skill profiles read own" on public.communication_skill_profiles for select using (auth.uid() = user_id);
create policy "communication skill snapshots read own" on public.communication_skill_snapshots for select using (auth.uid() = user_id);
