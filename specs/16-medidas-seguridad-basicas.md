# SPEC 16 — Medidas de seguridad básicas

> **Estado:** Borrador
> **Depende de:** SPEC 04, SPEC 06, SPEC 15
> **Fecha:** 2026-10-18
> **Objetivo:** Cerrar el checklist de `references/security/checklist.md`: inserciones en `scores` validadas por RLS y ligadas al usuario, ajustes de Auth endurecidos y headers de seguridad en Next.js.

---

## Por qué existe esta spec

Estado real comprobado el 2026-10-18 (Supabase MCP):

| Punto del checklist        | Estado actual                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| RLS en `games` y `scores`  | Ya activa (también en `profiles`). Solo verificar.                                                    |
| Policy INSERT `scores`     | `scores are publicly insertable`: `anon`+`authenticated`, `WITH CHECK (true)`. Acepta cualquier fila. |
| `scores.user_id`           | No existe. Columnas: `id, game_id, name, score, created_at`. FK `game_id → games(id)` ya existe.      |
| Contraseña mínima 8        | Solo en la server action (SPEC 15). Supabase sigue aceptando 6 vía API.                               |
| Leaked Password Protection | `get_advisors` lo avisa. El proyecto es plan **Free**: la opción es solo Pro+.                        |
| Max signup rate            | Default de Supabase (30/h por IP).                                                                    |
| Headers de seguridad       | `next.config.ts` vacío.                                                                               |

Además, BACKLOG ("`scores.user_id` + RLS") documenta la suplantación: un invitado puede firmar con el username de otro jugador.

---

## Scope

**In:**

- Supabase (migración con `apply_migration`):
  - Columna `scores.user_id uuid null` con FK a `auth.users(id) on delete set null`.
  - Sustituir la policy `scores are publicly insertable` por dos policies (`anon` y `authenticated`) con validaciones.
- `lib/scores-client.ts`: `saveScore` acepta `userId` y lo inserta.
- `components/player.tsx`: pasa `user?.id`; mensaje propio cuando RLS rechaza la fila (nombre reservado).
- `next.config.ts`: `headers()` con `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` en todas las rutas.
- Configuración manual en el dashboard de Supabase (contraseña mínima 8, signup rate 10/h), documentada en `docs/verificacion/16-seguridad.md`.
- `specs/BACKLOG.md`: Leaked Password Protection (requiere Pro); cerrar la parte de inserción de la entrada `scores.user_id`.
- `references/security/checklist.md`: marcar los ítems cumplidos.

**Out of scope (para futuras specs):**

- Content-Security-Policy (nonces, Supabase, OAuth). Spec propia.
- Leaked Password Protection: requiere plan Pro. Va a BACKLOG.
- Anti-cheat real (validar la partida en servidor, firmas, replays).
- Límite de score por juego (`games.max_score`).
- Mostrar en leaderboard/salón qué puntuaciones son de usuarios registrados.
- Rellenar `user_id` en las 4 filas existentes (quedan `null`).
- Rate limit de inserciones en `scores`.
- Configurar Auth vía Management API.
- Archivo de migración en el repo (`supabase/migrations/`).

---

## Modelo de datos

```sql
-- Migración: scores_user_id_and_insert_policies
alter table public.scores
  add column user_id uuid null references auth.users(id) on delete set null;

drop policy "scores are publicly insertable" on public.scores;

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
```

- `game_id`: no se valida en la policy. La FK `scores_game_id_fkey` ya lo garantiza.
- `(select auth.uid())`: forma recomendada por Supabase (se evalúa una vez por consulta, no por fila).
- `anon` lee `profiles` (policy `profiles_select_all`), así la subconsulta funciona bajo RLS.
- `lower(name)`: los invitados escriben en mayúsculas (`player.tsx` hace `toUpperCase().slice(0, 10)`); los usernames son minúsculas.
- `char_length(name) between 1 and 16` en anon: 16 = máximo de username; el input limita a 10.
- `on delete set null`: borrar un usuario conserva sus puntuaciones como anónimas.
- La policy SELECT `scores are publicly readable` no cambia. `game_stats` (`security_invoker=true`) no cambia.

```ts
// lib/scores-client.ts
export async function saveScore(
  gameId: string,
  name: string,
  score: number,
  userId: string | null,
): Promise<void>;
```

Error RLS: Supabase devuelve `error.code === "42501"`. `player.tsx` lo muestra como "▸ NOMBRE RESERVADO_ ELIGE OTRO" (invitado). Cualquier otro error: mensaje actual.

Headers (`next.config.ts`, `source: "/(.*)"`):

| Header                   | Valor                                      |
| ------------------------ | ------------------------------------------ |
| `X-Content-Type-Options` | `nosniff`                                  |
| `X-Frame-Options`        | `DENY`                                     |
| `Referrer-Policy`        | `strict-origin-when-cross-origin`          |
| `Permissions-Policy`     | `camera=(), microphone=(), geolocation=()` |

Ajustes de Auth (dashboard):

| Ajuste                                                     | Valor     |
| ---------------------------------------------------------- | --------- |
| Auth → Providers → Email → Minimum password length         | 8         |
| Auth → Rate Limits → Sign-ups and sign-ins (por IP / hora) | 10        |
| Leaked password protection                                 | No (Free) |

---

## Plan de implementación

1. **Configuración manual (usuario).** Crear `docs/verificacion/16-seguridad.md` con los ajustes de Auth de la tabla y ejecutarlos en el dashboard. Si el nombre exacto del rate limit difiere en el dashboard, anotar el real en el doc. Verificar: registro con contraseña de 7 caracteres vía API (`curl` a `/auth/v1/signup` con la publishable key) devuelve error `weak_password`.
2. **Migración.** Aplicar el SQL con `apply_migration` (`scores_user_id_and_insert_policies`). Verificar con `execute_sql`: `pg_policies` de `scores` muestra `scores_insert_anon`, `scores_insert_authenticated` y `scores are publicly readable`; ya no existe `scores are publicly insertable`. `get_advisors` (security) sin `0024_permissive_rls_policy`.
3. **Cliente.** `lib/scores-client.ts`: añadir `userId` al insert (`user_id: userId`). `components/player.tsx`: `saveScore(game.id, name, score, user?.id ?? null)`; estado de error distinto para `42501` con el mensaje "▸ NOMBRE RESERVADO_ ELIGE OTRO". Verificar: `npx tsc --noEmit`.
4. **Headers.** Consultar `node_modules/next/dist/docs/01-app/` (config `headers`) antes. Añadir `headers()` a `next.config.ts` con la tabla de arriba. Verificar: `npm run build` + `npm run start`, `curl -I http://localhost:3000/` y `curl -I http://localhost:3000/juegos` muestran los 4 headers.
5. **BACKLOG y checklist.** `specs/BACKLOG.md`: nueva entrada "Leaked Password Protection (requiere plan Pro)"; actualizar la entrada `scores.user_id` (inserción resuelta en SPEC 16; queda mostrar en leaderboard/salón). `references/security/checklist.md`: marcar RLS, contraseña mínima, signup rate, headers y "RLS Policy Always True"; anotar Leaked Password como aplazado (Free).

---

## Criterios de aceptación

- [ ] `games` y `scores` con `relrowsecurity = true` (`execute_sql`).
- [ ] `scores.user_id` existe, nullable, FK a `auth.users(id) on delete set null`.
- [ ] No existe ninguna policy de `scores` con `WITH CHECK (true)`; `get_advisors` security sin `0024_permissive_rls_policy`.
- [ ] Invitado guarda puntuación con nombre libre (p. ej. `AAA`) → fila con `user_id = null`.
- [ ] Invitado con nombre igual a un username existente (en mayúsculas) → no se inserta; player muestra "▸ NOMBRE RESERVADO_ ELIGE OTRO".
- [ ] Logueado guarda puntuación → fila con `user_id = auth.uid()` y `name = username`.
- [ ] Insert vía API como `anon` con `user_id` no nulo → rechazado.
- [ ] Insert vía API como `authenticated` con `name` distinto de su username o `user_id` ajeno → rechazado.
- [ ] Insert con `score = -1` o `score = 10000001` → rechazado (anon y authenticated).
- [ ] Leaderboard de `/juegos/[id]`, `/salon` y `best`/`plays` de `/juegos` siguen mostrando datos.
- [ ] Signup vía API con contraseña de 7 caracteres → rechazado por Supabase.
- [ ] Rate limit de signups = 10/h por IP en el dashboard (anotado en `docs/verificacion/16-seguridad.md`).
- [ ] `curl -I` en `/` y `/juegos` (build de producción) devuelve los 4 headers con los valores de la tabla.
- [ ] Login con Google y GitHub sigue funcionando con los headers activos.
- [ ] `npm run build`: `/`, `/juegos` siguen con `Revalidate 1m`.
- [ ] `npx tsc --noEmit` sin errores; `npx eslint` sobre los archivos tocados sin errores nuevos.
- [ ] `docs/verificacion/16-seguridad.md`, entradas de `specs/BACKLOG.md` y checklist actualizados.

---

## Decisiones

- **Sí:** `scores.user_id` nullable + invitado sigue guardando (decisión del usuario). Mantiene el juego como invitado de SPEC 15.
- **No:** solo `authenticated` puede insertar (propuesta literal del checklist). Rompe el guardado como invitado.
- **No:** solo checks sin `user_id`. No liga puntuaciones a usuarios ni frena la suplantación.
- **Sí:** policy `authenticated` exige `name = username` del profile. Impide firmar con otro nombre vía API.
- **Sí:** policy `anon` rechaza nombres que coinciden con un username. Cierra la suplantación por invitados.
- **Sí:** dos policies separadas por rol. Cada una aplica solo a su rol (`to anon` / `to authenticated`), así sus checks no se mezclan por OR.
- **Sí:** `score` entre 0 y 10.000.000 global. Corta basura vía API; no pretende ser anti-cheat.
- **No:** `games.max_score` por juego. Más preciso, más trabajo; fuera de scope.
- **No:** validar `game_id` en la policy. La FK existente ya lo hace.
- **Sí:** 4 headers (los 3 del checklist + `Permissions-Policy`). Coste cero, sin riesgo de romper nada.
- **No:** CSP en esta spec. Requiere nonces y lista de orígenes (Supabase, OAuth); merece spec propia.
- **Sí:** ajustes de Auth manuales en el dashboard + doc de verificación. Mismo patrón que SPEC 15.
- **No:** Management API. Necesita access token personal; no compensa para 2 ajustes.
- **Sí:** signup rate 10/h por IP. Basta para uso real; frena bots.
- **No:** Leaked Password Protection. Plan Free; warning aceptado y a BACKLOG.
- **Sí:** filas antiguas con `user_id = null`. Son 4; no merece backfill.

---

## Riesgos

| Riesgo                                                                             | Mitigación                                                                                                                                        |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Usuario logueado sin profile → su insert falla (`name = null`)                     | SPEC 15 crea profile por trigger; verificar `select count(*) from auth.users u left join profiles p using (id) where p.id is null` = 0 en paso 2. |
| Sesión caducada en cliente: `useUser()` da usuario pero la petición va como `anon` | Fila rechazada (`user_id` no nulo en anon); error genérico de guardado. Aceptado.                                                                 |
| Invitado guarda y luego alguien se registra con ese nombre                         | La fila antigua queda; solo se bloquean inserciones nuevas. Aceptado.                                                                             |
| `X-Frame-Options: DENY` rompe algún embed propio                                   | No hay iframes propios de la app; OAuth usa redirección, no iframe. Criterio de login OAuth lo comprueba.                                         |
| Rate limit 10/h molesta en pruebas locales (misma IP)                              | Subirlo temporalmente en el dashboard y anotarlo en `docs/verificacion/16-seguridad.md`.                                                          |
| `42501` también salta por score fuera de rango o nombre largo                      | Input limita a 10 caracteres; scores reales < 10M. Mensaje "reservado" aceptado para esos casos raros.                                            |

---

## Lo que **no** está en esta spec

- Content-Security-Policy.
- Leaked Password Protection (plan Pro).
- Anti-cheat real y límite de score por juego.
- Distinguir puntuaciones de usuarios registrados en leaderboard/salón.
- Backfill de `user_id` en filas antiguas.
- Rate limit de inserciones en `scores`.

Cada una, si llega, va en su propia spec.
