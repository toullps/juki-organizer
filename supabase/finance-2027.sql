-- juki° planner 2027: additive finance foundation
-- REVIEW BEFORE RUNNING in the correct Supabase project. No destructive operations.
create table if not exists public.finance_transactions (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (length(btrim(title)) > 0),
 amount_cents bigint not null check (amount_cents > 0),
 currency text not null default 'BRL' check (currency = 'BRL'),
 kind text not null check (kind in ('income','expense')),
 category text,
 occurred_on date not null default current_date,
 created_at timestamptz not null default now()
);
create table if not exists public.finance_debts (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 person_name text not null check (length(btrim(person_name)) > 0),
 description text,
 direction text not null check (direction in ('owe','receivable')),
 amount_cents bigint not null check (amount_cents > 0),
 currency text not null default 'BRL' check (currency = 'BRL'),
 due_on date,
 created_at timestamptz not null default now()
);
create table if not exists public.finance_debt_payments (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 debt_id uuid not null references public.finance_debts(id) on delete cascade,
 amount_cents bigint not null check (amount_cents > 0),
 paid_on date not null default current_date,
 created_at timestamptz not null default now()
);
create index if not exists finance_transactions_owner_date_idx on public.finance_transactions(owner_id,occurred_on);
create index if not exists finance_debts_owner_idx on public.finance_debts(owner_id);
create index if not exists finance_debt_payments_owner_debt_idx on public.finance_debt_payments(owner_id,debt_id);
alter table public.finance_transactions enable row level security;
alter table public.finance_debts enable row level security;
alter table public.finance_debt_payments enable row level security;
create policy finance_transactions_owner on public.finance_transactions for all to authenticated
 using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy finance_debts_owner on public.finance_debts for all to authenticated
 using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy finance_debt_payments_owner on public.finance_debt_payments for all to authenticated
 using ((select auth.uid()) = owner_id and exists (
  select 1 from public.finance_debts d where d.id = debt_id and d.owner_id = (select auth.uid())
 )) with check ((select auth.uid()) = owner_id and exists (
  select 1 from public.finance_debts d where d.id = debt_id and d.owner_id = (select auth.uid())
 ));
-- IMPORTANT: server-side validation for aggregate payment <= original debt
-- is required before allowing concurrent writes in production.
