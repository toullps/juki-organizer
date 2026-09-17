-- Juki Organizer: hábitos
-- Execute este arquivo no SQL Editor do Supabase caso a migração automática não esteja disponível.

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  icon text not null default 'other',
  tracking_type text not null default 'boolean' check (tracking_type in ('boolean','quantity','duration','count')),
  target numeric not null default 1,
  unit text not null default 'vez',
  frequency text not null default 'daily' check (frequency in ('daily','weekdays','weekly')),
  weekdays integer[] not null default '{}',
  time time,
  color text not null default 'pink',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  value numeric not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(habit_id, log_date)
);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

drop policy if exists owner_all on public.habits;
drop policy if exists owner_all on public.habit_logs;

create policy owner_all on public.habits
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy owner_all on public.habit_logs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists idx_habits_owner_active on public.habits(owner_id, active);
create index if not exists idx_habit_logs_owner_date on public.habit_logs(owner_id, log_date);
create index if not exists idx_habit_logs_habit_date on public.habit_logs(habit_id, log_date);
