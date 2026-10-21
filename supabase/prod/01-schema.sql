-- Arcade Vault — esquema de producción.
-- Equivale al estado actual de dev (migraciones 20260921155634 … 20261017232721,
-- sin el seed antiguo ni el drop policy intermedio). Ejecutar UNA vez en el
-- SQL Editor del proyecto de producción, sobre una base vacía.

begin;

-- Tablas -------------------------------------------------------------------

create table public.games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  category text not null,
  cover text not null,
  color text not null,
  best_seed integer not null,
  plays_seed text not null
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null
);

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),
  created_at timestamptz not null default now()
);

-- RLS + policies -----------------------------------------------------------

alter table public.games enable row level security;
alter table public.scores enable row level security;
alter table public.profiles enable row level security;

create policy "games are publicly readable"
  on public.games for select
  to anon, authenticated
  using (true);

create policy "scores are publicly readable"
  on public.scores for select
  to anon, authenticated
  using (true);

create policy "scores_insert_anon" on public.scores
  for insert to anon
  with check (
    user_id is null
    and char_length(name) between 1 and 16
    and score between 0 and 10000000
    and not exists (
      select 1 from public.profiles p where p.username = lower(scores.name)
    )
  );

create policy "scores_insert_authenticated" on public.scores
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and score between 0 and 10000000
    and name = (
      select p.username from public.profiles p where p.id = (select auth.uid())
    )
  );

create policy "profiles_select_all" on public.profiles
  for select using (true);

-- Vista de estadísticas (SPEC 14) ------------------------------------------

create view public.game_stats
with (security_invoker = true) as
select
  game_id,
  max(score)::int as best,
  count(*)::int   as plays
from public.scores
group by game_id;

-- Profile automático al registrarse (SPEC 15) ------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base      text;
  candidate text;
  n         int := 0;
begin
  base := lower(coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'user_name',
    split_part(new.email, '@', 1)
  ));
  base := left(regexp_replace(base, '[^a-z0-9_]', '', 'g'), 12);
  if length(base) < 3 then
    base := 'jugador';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n;
  end loop;

  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;
