# security-auditor memory

## Baseline aceptado

- `auth_leaked_password_protection` (advisor WARN) — plan Free, la opción es solo Pro+ (SPEC 16, BACKLOG #10).
- Sin Content-Security-Policy — fuera de scope en SPEC 16, merece spec propia (SPEC 16).
- `profiles_select_all` (`SELECT`, `true`) — username público a propósito; la subconsulta de `scores_insert_anon` lo necesita (SPEC 15/16).
- `scores are publicly readable` (`SELECT`, `true`, `anon`+`authenticated`) — leaderboard público (SPEC 06/16).
- `games are publicly readable` (`SELECT`, `true`) — catálogo público (SPEC 04).
- `scores_insert_anon` — invitado guarda puntuaciones a propósito, con checks (SPEC 16).
- Filas antiguas de `scores` con `user_id` null (4 al 2026-10-18) — sin backfill (SPEC 16).
- `profiles` sin policies de insert/update/delete — solo escribe el trigger `handle_new_user` (SPEC 15).
- Rutas de juego y `/salon` públicas — modo invitado (SPEC 15/16).
- `useUser()` usa `getSession()` en cliente solo para pintar UI (SPEC 15) → no es S-AU01.
- SMTP por defecto de Supabase (BACKLOG #6).

### Policies esperadas (`public`)

| tabla      | policy                         | cmd    | roles               |
| ---------- | ------------------------------ | ------ | ------------------- |
| `games`    | `games are publicly readable`  | SELECT | anon, authenticated |
| `scores`   | `scores are publicly readable` | SELECT | anon, authenticated |
| `scores`   | `scores_insert_anon`           | INSERT | anon                |
| `scores`   | `scores_insert_authenticated`  | INSERT | authenticated       |
| `profiles` | `profiles_select_all`          | SELECT | public              |

### Objetos esperados

- RLS activa en `games`, `scores`, `profiles`.
- `handle_new_user`: `security definer`, `search_path=''`, `execute` revocado a `public`/`anon`/`authenticated` (SPEC 15).
- `game_stats`: vista con `security_invoker=true` (SPEC 14).
- `scores.user_id` → FK `auth.users(id) on delete set null`; `scores.game_id` → FK `games(id)` (SPEC 16).
- Headers en `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` (SPEC 16).
- Proxy `lib/supabase/proxy.ts`: `SESSION_ONLY = ["/auth/nueva-contrasena"]`, `GUEST_ONLY = ["/auth", "/auth/recuperar"]`; páginas repiten el check (SPEC 16).

## Catálogo aprendido

Seed S-DB01–S-DB08, S-AU01–S-AU04, S-SE01–S-SE03, S-HD01, S-XS01–S-XS02, S-DP01 vive en el agente. Patrones nuevos desde el siguiente ID libre de cada familia.

| ID  | Riesgo | Señal | Fix | Origen (fecha) |
| --- | ------ | ----- | --- | -------------- |

## Lecciones

## Historial

| date | alcance | fallos (IDs) | informe | spec | status |
| ---- | ------- | ------------ | ------- | ---- | ------ |
