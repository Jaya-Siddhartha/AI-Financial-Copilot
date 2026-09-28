-- FinCopilot: per-user money data. Every table is protected by row-level security so a signed-in
-- user can only read and change their own rows. Applied to the project with the Supabase MCP
-- (apply_migration "fincopilot_initial_schema"); to set up a new project, paste this file into
-- the Supabase SQL Editor.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  monthly_income numeric(14,2) not null default 0 check (monthly_income >= 0),
  salary_day smallint not null default 1 check (salary_day between 1 and 31),
  buffer_enabled boolean not null default true,
  buffer_amount numeric(14,2) not null default 2000 check (buffer_amount >= 0),
  balance_amount numeric(14,2),
  balance_date timestamptz,
  theme text not null default 'purple' check (char_length(theme) <= 20),
  text_size text not null default 'normal' check (text_size in ('normal', 'large', 'xlarge')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_name text not null check (char_length(file_name) <= 200),
  file_path text check (char_length(file_path) <= 300),
  source_app text not null default 'Other' check (char_length(source_app) <= 40),
  period_start date,
  period_end date,
  tx_count integer not null default 0 check (tx_count >= 0),
  created_at timestamptz not null default now()
);

create table public.emis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  lender text not null default '' check (char_length(lender) <= 60),
  amount numeric(14,2) not null check (amount > 0),
  due_day smallint not null check (due_day between 1 and 31),
  total_months integer check (total_months between 1 and 600),
  remaining_months integer not null default 12 check (remaining_months between 0 and 600),
  principal numeric(14,2) check (principal >= 0),
  interest_rate numeric(6,3) check (interest_rate >= 0 and interest_rate <= 100),
  autopay boolean not null default false,
  paid_through_date date,
  last_paid_date timestamptz,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date timestamptz not null,
  description text not null check (char_length(description) between 1 and 200),
  amount numeric(14,2) not null check (amount > 0),
  type text not null check (type in ('debit', 'credit')),
  category text not null check (char_length(category) <= 40),
  note text check (char_length(note) <= 200),
  source text not null default 'manual' check (source in ('manual', 'statement', 'autopay')),
  statement_id uuid references public.statements (id) on delete set null,
  emi_id uuid references public.emis (id) on delete set null,
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_statement_idx on public.transactions (statement_id);
create index transactions_emi_idx on public.transactions (emi_id);
create index emis_user_idx on public.emis (user_id);
create index statements_user_idx on public.statements (user_id);

alter table public.profiles enable row level security;
alter table public.statements enable row level security;
alter table public.emis enable row level security;
alter table public.transactions enable row level security;

create policy "own profile: read" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile: update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own statements" on public.statements for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own emis" on public.emis for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own transactions" on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Keep updated_at current on profile changes.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile row for every new sign-up, using the name given at sign-up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets a signed-in user delete their own account (all their rows cascade).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- Private bucket for uploaded statements: each user may only use their own folder (<user id>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('statements', 'statements', false, 10485760,
  array['application/pdf', 'text/csv', 'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/octet-stream']);

create policy "own statement files: read" on storage.objects for select to authenticated
  using (bucket_id = 'statements' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own statement files: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'statements' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own statement files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'statements' and (storage.foldername(name))[1] = (select auth.uid())::text);
