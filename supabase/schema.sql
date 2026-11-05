-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.progress (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  game_id    text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

alter table public.progress enable row level security;

-- Each signed-in user can only see and change their own rows.
drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own" on public.progress
  for select using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Guard against oversized payloads.
alter table public.progress
  drop constraint if exists progress_data_size;
alter table public.progress
  add constraint progress_data_size check (pg_column_size(data) < 20000);
