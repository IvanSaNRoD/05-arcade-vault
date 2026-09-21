# SPEC 06 — Leaderboard y tabla de juegos reales (Supabase)

> **Status:** Draft
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-09-21
> **Objective:** Migrar el catálogo de juegos (`lib/games.ts`) y el leaderboard (`lib/scores.ts`) de datos mock a tablas reales de Supabase, conectando "GUARDAR PUNTUACIÓN" a una escritura real solo para `asteroids`.

## Por qué existe esta spec

SPEC 04 configuró la conexión a Supabase sin crear tablas. SPEC 05 portó el motor real de Asteroids pero dejó explícitamente fuera de scope "persistencia real de puntuación" y "leaderboard real por partida". Hoy `lib/games.ts` es un array estático en memoria y `lib/scores.ts` (`seededScores`) genera filas falsas con un LCG determinista, consumidas por `components/leaderboard.tsx` y `components/hall-of-fame.tsx`. Esta spec reemplaza ambos por datos reales en Supabase, dando a "GUARDAR PUNTUACIÓN" (hoy solo un cambio de estado visual en `player.tsx`) su primer efecto real, limitado al único juego con motor y score reales.

## Scope

**In:**

- Tablas Supabase `games` y `scores` (vía `mcp__supabase__apply_migration`), con políticas RLS: SELECT público en ambas tablas, INSERT público solo en `scores` (sin Auth real, mismo nivel de confianza que ya asume la UI actual con el input de alias libre).
- Seed de `games` con los 8 juegos actuales de `lib/games.ts`, una sola vez, dentro de la propia migración.
- `lib/games.ts`: `GAMES` (array estático) se elimina; se añaden `getGames(): Promise<Game[]>` y `getGame(id): Promise<Game | undefined>`, que consultan Supabase server-side (`lib/supabase/server.ts`) y calculan `best`/`plays` en vivo desde `scores` (`MAX(score)` / `COUNT(*)` por `game_id`), con fallback a `best_seed`/`plays_seed` cuando el juego no tiene partidas reales todavía. `Game`, `Category`, `GameColor`, `CATEGORIES` se mantienen sin cambios.
- `lib/scores.ts`: `seededScores` se elimina; se añaden `getTopScores(gameId, limit): Promise<ScoreRow[]>` (SELECT real ordenado por `score` desc) y `saveScore(gameId, name, score): Promise<void>` (INSERT real vía cliente browser de Supabase, `lib/supabase/client.ts`). `ScoreRow` se mantiene igual (`rank` se calcula en el resultado, `date` se deriva de `created_at`).
- Todas las páginas/componentes que hoy importan `GAMES`/`getGame`/`seededScores` pasan a usar las nuevas funciones async y reciben los datos por prop donde el consumidor es un Client Component (ver "Archivos afectados").
- `components/player.tsx`: al pulsar "GUARDAR PUNTUACIÓN" con `game.id === "asteroids"`, llama a `saveScore(game.id, name, score)`; si falla, muestra un estado de error y permite reintentar (no marca `saved = true`); si el juego no es `asteroids`, comportamiento idéntico al actual (`setSaved(true)` sin red).
- `app/juegos/[id]/page.tsx` y `app/juegos/[id]/jugar/page.tsx` añaden `export const revalidate = 60` (ISR) para que el catálogo y el leaderboard se refresquen sin rebuild manual, manteniendo `generateStaticParams`.
- `mcp__supabase__get_advisors` ejecutado tras la migración para confirmar que las políticas RLS no generan alertas de seguridad inesperadas.

**Out of scope (para specs futuras):**

- Auth real / login conectado a las puntuaciones (el alias sigue siendo texto libre sin verificar).
- Ranking global entre juegos (fuera de esta spec; el leaderboard sigue siendo por juego, como hoy).
- Persistencia real para los 7 juegos con gameplay simulado (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`). Su botón "GUARDAR PUNTUACIÓN" sigue sin tocar red.
- Validación anti-abuso de scores (rangos razonables, rate-limit, CAPTCHA) más allá del RLS público de INSERT.
- Editar o borrar puntuaciones ya guardadas.
- Panel de administración para gestionar el catálogo de juegos.

## Modelo de datos

```sql
-- Tabla games (fuente de verdad del catálogo; reemplaza el array estático de lib/games.ts)
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  category text not null,        -- 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS'
  cover text not null,           -- nombre de clase CSS (ej. 'cover-rocas'), sin cambios de SPEC 05
  color text not null,           -- 'cyan' | 'magenta' | 'yellow' | 'green'
  best_seed integer not null,    -- valor semilla mostrado hasta que existan partidas reales
  plays_seed text not null       -- valor semilla mostrado hasta que existan partidas reales
);

-- Tabla scores (reemplaza seededScores mock de lib/scores.ts)
create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  name text not null,            -- alias del jugador, texto libre, máx. 10 (igual que el input de player.tsx)
  score integer not null,
  created_at timestamptz not null default now()
);
```

```ts
// lib/games.ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  category: Category;
  cover: string;
  color: GameColor;
  best: number; // calculado: MAX(scores.score) para game_id, o best_seed si no hay filas
  plays: string; // calculado: COUNT(scores.*) para game_id formateado, o plays_seed si no hay filas
}

export async function getGames(): Promise<Game[]>;
export async function getGame(id: string): Promise<Game | undefined>;
```

```ts
// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // derivado de created_at, mismo formato dd/mm/yyyy que hoy
}

export async function getTopScores(
  gameId: string,
  limit?: number,
): Promise<ScoreRow[]>;
export async function saveScore(
  gameId: string,
  name: string,
  score: number,
): Promise<void>;
```

Convenciones:

- `plays` se formatea igual que hoy (ej. `"12.4K"`); con datos reales bajos, se muestra el número tal cual (ej. `"3"`) hasta que el formateador decida abreviar.
- `best`/`plays` calculados en vivo: si `scores` no tiene filas para un `game_id`, se usa `best_seed`/`plays_seed` de `games` como fallback visual, sin escribir nada.

## Plan de implementación

1. Migración SQL: crear tablas `games` y `scores` con las columnas de arriba, políticas RLS (`select` público en ambas, `insert` público solo en `scores`), e `insert` de seed con los 8 juegos actuales de `lib/games.ts` (`best_seed`/`plays_seed` = valores `best`/`plays` actuales). Verificar: `mcp__supabase__list_tables` muestra `games` y `scores`; `mcp__supabase__get_advisors` sin alertas críticas nuevas.
2. Reescribir `lib/games.ts`: quitar `export const GAMES`, añadir `getGames()`/`getGame(id)` usando `lib/supabase/server.ts`, con el cálculo de `best`/`plays` en vivo descrito arriba. Verificar: `npx tsc --noEmit` sin errores nuevos (fallarán los imports de `GAMES` en otros archivos hasta el paso 4, eso es esperado en este punto intermedio).
3. Reescribir `lib/scores.ts`: quitar `seededScores`, añadir `getTopScores`/`saveScore`. Verificar: `npx tsc --noEmit` sobre este archivo sin errores.
4. Actualizar consumidores server-side: `app/page.tsx`, `app/juegos/page.tsx`, `app/juegos/[id]/page.tsx`, `app/juegos/[id]/jugar/page.tsx`, `app/salon/page.tsx` pasan a `await getGames()`/`await getGame(id)`/`await getTopScores(...)`, con `export const revalidate = 60` en las dos rutas dinámicas por `[id]`. Verificar: `npx tsc --noEmit` sin errores nuevos.
5. `components/library.tsx`: recibir `games: Game[]` por prop (desde `app/juegos/page.tsx`) en vez de importar `GAMES`; filtrado cliente-side sin cambios. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
6. `components/hall-of-fame.tsx`: recibir `games: Game[]` (para las tabs) y `scores: ScoreRow[]` (ya resueltos por `app/salon/page.tsx`) por prop, en vez de leer `GAMES`/`seededScores` internamente. Verificar: mismo chequeo.
7. `components/player.tsx`: conectar "GUARDAR PUNTUACIÓN" a `saveScore(game.id, name, score)` solo cuando `game.id === "asteroids"`; en error, mostrar mensaje corto (ej. "ERROR AL GUARDAR_") y permitir reintentar sin marcar `saved`; el resto de juegos sin cambios. Verificar manual: guardar una puntuación real en `/juegos/asteroids/jugar` y confirmar la fila en Supabase (`mcp__supabase__execute_sql` de solo lectura).
8. `npm run build`, `npm run lint` y `npx tsc --noEmit` completos. Verificar: los tres terminan sin errores.
9. Verificación manual end-to-end: `/juegos` lista los 8 juegos desde Supabase; jugar una partida de asteroids, guardarla con un alias, verla reflejada en el leaderboard de `/juegos/asteroids` y en `/salon?juego=asteroids`; `/juegos/<otro-id>` sigue mostrando un leaderboard (ahora real, con datos semilla si no hay partidas) sin romper visualmente.

## Criterios de aceptación

- [ ] `mcp__supabase__list_tables` muestra `games` y `scores` con las columnas descritas.
- [ ] `/juegos` muestra los 8 juegos leídos desde Supabase (no desde un array estático en el bundle).
- [ ] `/juegos/<id>` muestra "Mejor global" y "Partidas" calculados en vivo desde `scores`, o el valor semilla si el juego no tiene partidas reales.
- [ ] Al terminar una partida de `asteroids` y pulsar "GUARDAR PUNTUACIÓN" con un alias, se crea una fila real en `scores` con ese `game_id`, `name` y `score`.
- [ ] Tras guardar, esa puntuación aparece en el leaderboard de `/juegos/asteroids` (`components/leaderboard.tsx`) y en `/salon?juego=asteroids` (`components/hall-of-fame.tsx`) sin recargar manualmente el build (ISR de 60s o navegación nueva).
- [ ] Si `saveScore` falla (red/RLS), la UI muestra un estado de error y no marca la puntuación como guardada; el usuario puede reintentar.
- [ ] "GUARDAR PUNTUACIÓN" en cualquier juego distinto de `asteroids` sigue mostrando el toast sin llamadas de red (comportamiento SPEC 05 sin cambios).
- [ ] Cualquier visitante no autenticado puede leer `games` y `scores`, y puede insertar en `scores` (RLS público), sin poder insertar en `games` desde el cliente.
- [ ] `npm run build`, `npm run lint` y `npx tsc --noEmit` terminan sin errores.

## Decisiones

- **Sí:** `games` en Supabase como fuente de verdad, con seed único desde el array actual. Es el pedido explícito del usuario ("tabla de juegos" real); `lib/games.ts` deja de ser el dato, no solo los tipos.
- **No:** mantener `lib/games.ts` como fuente y Supabase como espejo. No cumpliría el objetivo de una tabla de juegos real.
- **Sí:** `best`/`plays` calculados en vivo desde `scores`, con fallback a `best_seed`/`plays_seed`. Evita mostrar "Mejor global: 0" en juegos sin partidas reales aún, sin inventar una tabla de agregados separada.
- **No:** columna `best`/`plays` actualizada por trigger o cron. Innecesario mientras el cálculo en vivo (`MAX`/`COUNT` por `game_id`) es barato a esta escala.
- **Sí:** solo `asteroids` escribe puntuaciones reales. Es el único juego con motor y score reales (SPEC 05); conectar los otros 7 guardaría números de un `setInterval` simulado como si fueran partidas reales.
- **No:** persistencia real para los 7 juegos simulados en esta spec. Se hace cuando cada uno tenga su propio motor real, en specs futuras.
- **Sí:** identidad de jugador = alias manual sin Auth. SPEC 04 dejó "Auth real" explícitamente fuera; el input de alias ya existe en `player.tsx` y es el mismo nivel de confianza que la UI ya asumía.
- **No:** bloquear el guardado hasta tener login real. Ampliaría el alcance de esta spec a Auth, que merece spec propia.
- **Sí:** RLS con INSERT público en `scores`. Consistente con no tener Auth; se documenta como limitación conocida (cualquiera puede insertar puntuaciones falsas).
- **No:** validación anti-abuso (rate-limit, rangos) en esta spec. Fuera de alcance; se añadiría en una spec de "integridad de puntuaciones" si se vuelve un problema real.
- **Sí:** ranking por juego únicamente, sin ranking global nuevo. Mantiene el diseño actual de `Leaderboard`/`HallOfFame`; un ranking global es una feature nueva con su propio diseño.
- **Sí:** ISR (`revalidate = 60`) en las rutas dinámicas por `[id]` en vez de SSR puro o SSG sin revalidar. Balance entre frescura del leaderboard y no pagar una consulta a Supabase en cada request.
- **No:** SSR puro (`force-dynamic`) en todas las rutas. Más carga innecesaria para un leaderboard que no necesita estar al segundo.
- **Sí:** error visible + reintento si falla `saveScore`. Evita que el jugador crea que su puntuación se guardó cuando no fue así.

## Riesgos

| Riesgo                                                                                         | Mitigación                                                                                                                       |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| RLS de INSERT público en `scores` permite spam de puntuaciones falsas                          | Aceptado como limitación conocida de esta spec (documentada en Decisiones); anti-abuso queda para una spec futura si hace falta. |
| `generateStaticParams` falla en build si Supabase no responde                                  | El build ya depende de `.env.local`/variables de entorno configuradas (SPEC 04); mismo riesgo que cualquier build con Supabase.  |
| Cálculo en vivo de `best`/`plays` (`MAX`/`COUNT` por request) se vuelve lento con muchas filas | Aceptado a esta escala (proyecto pequeño); se resolvería con una tabla de agregados o vista materializada en spec futura.        |

## Lo que **no** está en esta spec

- Auth real / login conectado a las puntuaciones.
- Ranking global entre juegos.
- Persistencia real para los 7 juegos con gameplay simulado.
- Validación anti-abuso de puntuaciones.
- Edición o borrado de puntuaciones guardadas.
- Panel de administración del catálogo de juegos.

Cada uno, si llega, va en su propia spec.
