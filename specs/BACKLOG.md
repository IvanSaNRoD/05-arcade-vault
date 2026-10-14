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
