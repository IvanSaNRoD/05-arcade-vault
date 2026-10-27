-- Arcade Vault — migración base (baseline).
-- Consolida el estado de dev a 2026-10-26: tablas games/scores/profiles, RLS,
-- policies, vista game_stats, trigger handle_new_user y catálogo de 8 juegos.
-- Dev ya tiene este estado (su historial MCP previo no se reproduce, BACKLOG #11).
-- Prod se montó con estos mismos scripts a mano: ahí se marca como aplicada con
--   npx supabase migration repair --status applied 20261026000000
-- Un proyecto vacío nuevo la aplica con `npx supabase db push`.


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

-- Catálogo de juegos -------------------------------------------------------

insert into public.games (id, title, short, long, category, cover, color, best_seed, plays_seed) values
  ('arkanoid', 'ARKANOID', 'Rebota la pelota y destruye muros de neón.', 'Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?', 'ARCADE', 'cover-bricks', 'cyan', 28450, '12.4K'),
  ('asteroids', 'ASTEROIDS', 'Pulveriza asteroides en gravedad cero.', 'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas en fragmentos cada vez más pequeños. Cuidado con los OVNIs en el horizonte.', 'SHOOTER', 'cover-rocas', 'yellow', 41200, '15.6K'),
  ('duelo-pixel', 'DUELO PIXEL', 'Dos paletas. Una pelota. Reflejos máximos.', 'El duelo más puro: dos paletas verticales se enfrentan por rebotar una pelota luminosa. Modo solitario contra la CPU o partida local a dos jugadores.', 'VERSUS', 'cover-duelo', 'cyan', 24, '4.2K'),
  ('frogger', 'FROGGER', 'Cruza la carretera y el río sin convertirte en papilla.', 'Guía a tu rana a través de una carretera repleta de coches y un río de troncos y tortugas flotantes. Llena las cinco bocas del otro lado para completar la ronda; cada nivel acelera el tráfico y acorta el tiempo. Tres vidas y mucho asfalto por delante.', 'ARCADE', 'cover-rana', 'green', 18900, '6.4K'),
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.', 'Un círculo glotón patrulla un laberinto coleccionando puntos luminosos. Cuatro espectros lo persiguen, pero cada cierto tiempo aparece una píldora que invierte los papeles.', 'ARCADE', 'cover-glot', 'yellow', 96400, '27.2K'),
  ('invasores', 'INVASORES', 'Defiende el planeta de filas alienígenas.', 'Olas de pixeles hostiles descienden formación tras formación. Mueve tu cañón en horizontal y abre fuego con precisión, antes de que toquen la superficie.', 'SHOOTER', 'cover-invaders', 'green', 54190, '18.0K'),
  ('snake', 'SNAKE', 'Crece sin morder tu propia cola.', 'Una serpiente de luz recorre la grilla buscando núcleos magenta. Cada bocado la alarga y la hace más veloz. Un movimiento en falso y se devora a sí misma.', 'ARCADE', 'cover-snake', 'green', 7820, '9.1K'),
  ('tetris', 'TETRIS', 'Encaja las piezas antes de que el techo te aplaste.', 'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.', 'PUZZLE', 'cover-tetro', 'magenta', 184220, '31.8K');
