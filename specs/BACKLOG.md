# Backlog de specs

Problemas detectados fuera del alcance de la spec en la que aparecieron. Cada entrada es la semilla de un futuro `/spec`, no una spec en sí.

---

## 1. Agregar `best` y `plays` en Postgres

**Resuelto en SPEC 14** (vista `game_stats`).

**Prioridad:** alta.

`getGames()` (`lib/games.ts:43-54`) hace `supabase.from("scores").select("game_id, score")` sin filtro: descarga **todas** las filas de `scores` y calcula `MAX`/`COUNT` en JS. `getGame()` (`lib/games.ts:61-69`) hace lo mismo filtrado por juego.

Con un leaderboard real el payload crece sin límite. La agregación debería ocurrir en la base de datos (vista, RPC o `count`/`max` agregados).

Detectado durante SPEC 08.

---

## 2. `npm run lint` falla en `app/page.tsx`

**Prioridad:** alta (bloquea el gate de verificación de toda spec).

4 errores `react/jsx-no-comment-textnodes` en `app/page.tsx:54`, `:75`, `:109` y `:182`. Son preexistentes, no los introdujo SPEC 08.

Mientras sigan ahí, el criterio "`npm run lint` sin errores" no se puede cumplir en ninguna spec.

Menor, en el mismo paquete: `BLOCK_ROWS` y `BLOCK_COLORS` en `lib/games/arkanoid/engine.ts:14,17` están portadas del prototipo pero sin uso, y generan warnings.

---

## 3. La home muestra solo 6 juegos y sin orden definido

**Prioridad:** media.

`app/page.tsx` corta el carrusel a los 6 primeros juegos y `getGames()` no emite `.order()`, así que el orden de filas es indefinido. Un juego nuevo puede simplemente no aparecer en la home.

Ya registrado como riesgo en SPEC 05, SPEC 07 y SPEC 08 sin resolverse en ninguna.

---

## 4. Latencia del middleware de sesión

**Prioridad:** baja.

`proxy.ts:5` → `updateSession` (`lib/supabase/proxy.ts:28`) hace `await supabase.auth.getUser()` en cada navegación, lo que añade un viaje de red a Supabase como suelo de latencia.

Es el patrón oficial de `@supabase/ssr` y el `matcher` ya excluye estáticos, así que puede que no haya nada que arreglar. Antes de escribir una spec hay que medir el coste real en producción, no en `next dev`, donde la compilación bajo demanda domina los tiempos.

Detectado midiendo tiempos de carga tras SPEC 08.

---

## 5. `/salon` es dinámica y la ruta más lenta

**Prioridad:** media.

`npm run build` marca `/salon` como `ƒ` (dinámica): se renderiza en cada request. Con `next start` su TTFB es 0,6 s, frente a 0,01–0,03 s de `/juegos` y `/juegos/[id]` (ISR).

Probable causa: lee `searchParams` (`?juego=`, `app/salon/page.tsx:12`), lo que fuerza render dinámico pese a `revalidate = 60`. Analizar si el selector de juego puede resolverse en cliente o con rutas `/salon/[id]` prerenderizadas.

Detectado midiendo tiempos durante SPEC 14.

---

## 6. SMTP propio para los correos de Auth

**Prioridad:** media (bloquea producción con usuarios reales).

SPEC 15 usa el SMTP por defecto de Supabase: ~2 correos/hora, pensado solo para desarrollo. Confirmación de registro y recuperación de contraseña dependen de él. Configurar Resend como SMTP custom en Supabase (requiere dominio verificado; `onboarding@resend.dev` solo envía al correo de la cuenta).

Detectado durante SPEC 15.

---

## 7. Ligar `scores` a `auth.users`

**Prioridad:** baja (inserción resuelta en SPEC 16).

~~Con SPEC 15 una partida con sesión guarda `name = username`, pero `scores` no tiene `user_id`: cualquiera puede escribir ese mismo nombre como invitado.~~ SPEC 16 añadió `scores.user_id` y policies de insert por rol (invitado no puede usar un username). Queda: decidir cómo se distinguen en leaderboard/salón las puntuaciones de usuarios registrados. Las 4 filas previas tienen `user_id = null`.

Detectado durante SPEC 15.

---

## 8. Página de perfil

**Prioridad:** baja.

No hay forma de cambiar el username (autogenerado en OAuth), ni de borrar la cuenta. `profiles` no tiene policies de update/delete: hoy solo escribe el trigger `handle_new_user`.

Detectado durante SPEC 15.

---

## 9. Volver a la página de origen tras login (`?next=`)

**Prioridad:** baja.

Tras iniciar sesión siempre se aterriza en `/juegos`. `/auth/callback` ya acepta `next` (solo rutas internas); faltaría propagarlo desde los enlaces a `/auth` y desde `signIn`/`signInWithProvider`.

Detectado durante SPEC 15.

---

## 10. Leaked Password Protection

**Prioridad:** baja.

`get_advisors` avisa `auth_leaked_password_protection`: Supabase no comprueba contraseñas contra HaveIBeenPwned. La opción (Auth → Providers → Email → "Prevent use of leaked passwords") solo existe en plan Pro; el proyecto es Free. Activarla si se cambia de plan.

Detectado durante SPEC 16.

---

## 11. Historial de migraciones de dev desalineado

**Resuelto** con migraciones versionadas en `supabase/migrations/` + Supabase CLI en prod (runbook `docs/despliegue/supabase-produccion.md` §1 y §5).

~~La migración `create_games_and_scores` siembra ids antiguos (`caida`, `bloque-buster`, `serpentina`, `ranaria`); en dev se renombraron fuera de migraciones (`tetris`, `arkanoid`, `snake`, `frogger`). Reproducir el historial no da el estado real.~~ La baseline `20261026000000_baseline.sql` consolida el estado actual; el historial antiguo de dev se deja como está (la CLI nunca se enlaza a dev).

Detectado durante la preparación de producción.
