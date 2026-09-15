create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  personal_goal_id text,
  title text not null,
  description text not null default '',
  started_at date not null default current_date,
  target_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists journeys_one_primary_per_user_idx on public.journeys(user_id) where is_primary;
create index if not exists journeys_user_updated_idx on public.journeys(user_id, updated_at desc);

create table if not exists public.journey_nodes (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  category text not null check (category in ('skills', 'learning', 'experience', 'goals', 'resources')),
  title text not null,
  description text not null default '',
  status text not null default 'planned' check (status in ('planned', 'learning', 'in_progress', 'completed', 'paused')),
  completed boolean not null default false,
  level text check (level in ('basic', 'intermediate', 'advanced')),
  target_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journey_nodes_journey_order_idx on public.journey_nodes(journey_id, category, sort_order);

create table if not exists public.journey_diary_entries (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  entry_date date not null default current_date,
  tags text[] not null default '{}',
  milestone boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journey_diary_journey_date_idx on public.journey_diary_entries(journey_id, entry_date desc);

create table if not exists public.journey_diary_relations (
  diary_entry_id uuid not null references public.journey_diary_entries(id) on delete cascade,
  journey_node_id uuid not null references public.journey_nodes(id) on delete cascade,
  primary key (diary_entry_id, journey_node_id)
);

create table if not exists public.journey_quick_notes (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.journey_next_steps (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  due_date date,
  created_at timestamptz not null default now()
);

alter table public.journeys enable row level security;
alter table public.journey_nodes enable row level security;
alter table public.journey_diary_entries enable row level security;
alter table public.journey_diary_relations enable row level security;
alter table public.journey_quick_notes enable row level security;
alter table public.journey_next_steps enable row level security;

create policy "journeys own" on public.journeys for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "journey nodes own" on public.journey_nodes for all using (exists (select 1 from public.journeys where journeys.id = journey_nodes.journey_id and journeys.user_id = auth.uid())) with check (exists (select 1 from public.journeys where journeys.id = journey_nodes.journey_id and journeys.user_id = auth.uid()));
create policy "journey diary own" on public.journey_diary_entries for all using (exists (select 1 from public.journeys where journeys.id = journey_diary_entries.journey_id and journeys.user_id = auth.uid())) with check (exists (select 1 from public.journeys where journeys.id = journey_diary_entries.journey_id and journeys.user_id = auth.uid()));
create policy "journey relations own" on public.journey_diary_relations for all using (exists (select 1 from public.journey_diary_entries join public.journeys on journeys.id = journey_diary_entries.journey_id where journey_diary_entries.id = journey_diary_relations.diary_entry_id and journeys.user_id = auth.uid())) with check (exists (select 1 from public.journey_diary_entries join public.journeys on journeys.id = journey_diary_entries.journey_id where journey_diary_entries.id = journey_diary_relations.diary_entry_id and journeys.user_id = auth.uid()));
create policy "journey notes own" on public.journey_quick_notes for all using (exists (select 1 from public.journeys where journeys.id = journey_quick_notes.journey_id and journeys.user_id = auth.uid())) with check (exists (select 1 from public.journeys where journeys.id = journey_quick_notes.journey_id and journeys.user_id = auth.uid()));
create policy "journey steps own" on public.journey_next_steps for all using (exists (select 1 from public.journeys where journeys.id = journey_next_steps.journey_id and journeys.user_id = auth.uid())) with check (exists (select 1 from public.journeys where journeys.id = journey_next_steps.journey_id and journeys.user_id = auth.uid()));
