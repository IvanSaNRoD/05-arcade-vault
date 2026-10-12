# SPEC JAM frogger-A — Frogger navideño clásico

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 09
> **Date:** 2026-10-08
> **Objective:** Crear desde cero un motor TypeScript + Client Component de Frogger clásico con ambientación navideña que sustituye el juego simulado `ranaria` (renombrado a `frogger`), con 3 vidas, temporizador por rana y puntuaciones reales en Supabase, añadiendo una entrada al registro de motores.
> **Variante:** A de 3 — difiere de las otras en: reglas mínimas fieles al Frogger original (3 vidas, 30 s por rana, sin mecánicas extra), la de menor coste.

## Por qué existe esta spec

El catálogo ya tiene `ranaria` (RANARIA, `cover-rana`, ARCADE, green), placeholder temático de Frogger con gameplay simulado. Igual que `rocas` → `asteroids` (SPEC 05), `caida` → `tetris` (SPEC 07), `bloque-buster` → `arkanoid` (SPEC 08) y `serpentina` → `snake` (SPEC 09), se renombra en vez de duplicar. Frogger encaja en Arcade Vault: un solo canvas, teclado, partidas cortas y score comparable. El tema navidad solo cambia la ambientación: una rana con gorro rojo cruza una calle nevada llena de trineos y quitanieves, y un río helado sobre troncos de Navidad y témpanos, hasta cinco chimeneas. **No existe prototipo vanilla ni assets** en `references/resources/` para Frogger, así que se escribe desde cero con primitivas de canvas y sin sonido. Frogger tiene vidas (3), así que mapea directo a la ranura "Vidas" con corazones, sin `secondaryLabel`. El registro `lib/games/registry.ts` ya existe: añadir Frogger es una entrada más.

## Scope

**In:**

- Motor `lib/games/frogger/engine.ts` (`FroggerEngine`) con estas reglas:
  - Canvas 800×600. Grid de `COLS = 20` columnas × `GRID_ROWS = 13` filas de `CELL = 40` px, desde `GRID_Y = 40`. Franja superior (0–40 px) decorativa (guirnalda de luces) y franja inferior (560–600 px) con la barra de tiempo.
  - Filas (de arriba abajo): fila 0 = 5 chimeneas (meta), filas 1–5 = río helado, fila 6 = mediana nevada (segura), filas 7–11 = calle nevada, fila 12 = salida (segura).
  - Chimeneas de 2 celdas de ancho en las columnas `HOME_COLS = [1, 5, 9, 13, 17]`; el resto de la fila 0 es muro de ladrillo.
  - Carriles fijos `LANES` (velocidad en px/s, positiva = derecha; longitud en celdas):
    - Fila 11: trineo, `-60`, long. 1, 3 objetos.
    - Fila 10: quitanieves, `+80`, long. 1, 3 objetos.
    - Fila 9: trineo, `-100`, long. 1, 3 objetos.
    - Fila 8: camión de regalos, `+50`, long. 2, 2 objetos.
    - Fila 7: trineo de Papá Noel, `-160`, long. 1, 1 objeto.
    - Fila 5: tronco, `+60`, long. 3, 3 objetos.
    - Fila 4: témpano, `-80`, long. 2, 3 objetos.
    - Fila 3: tronco, `+100`, long. 5, 2 objetos.
    - Fila 2: témpano, `-70`, long. 3, 3 objetos.
    - Fila 1: tronco, `+80`, long. 3, 3 objetos.
  - La rana empieza en la fila 12, `x = 380` (centrada). Cada pulsación salta exactamente 1 celda (40 px). Se ignora la autorrepetición (`e.repeat`).
  - Calle: si el hitbox de la rana (inset `FROG_INSET = 6` px) solapa un vehículo → muere.
  - Río: si el centro de la rana no está sobre ningún tronco/témpano de su fila → muere (cae al agua). Sobre una plataforma, la rana se desplaza con ella; si su centro sale del canvas → muere.
  - Meta: al saltar a la fila 0, si el centro de la rana cae dentro de una chimenea libre, la ocupa; si cae en el muro o en una chimenea ya ocupada → muere.
  - Tiempo: `TIME_PER_FROG = 30` s por rana; llegar a 0 → muere. Se reinicia al reaparecer y al ocupar una chimenea.
  - Vidas: `INITIAL_LIVES = 3`. Al morir: `phase = 'dead'` durante `DEATH_PAUSE = 1` s (rana aplastada/salpicadura), luego reaparece en la salida o, si `lives = 0`, `phase = 'gameover'`.
  - Puntuación: `+10` por cada fila nueva alcanzada en el trayecto actual (retroceder y volver no suma); `+50` por chimenea ocupada más `+10 × floor(tiempo restante)`; `+1000` al ocupar las 5.
  - Nivel: ocupar las 5 chimeneas sube `level` +1, vacía las chimeneas y multiplica la velocidad de todos los carriles por `speedMul = min(1 + 0.15 × (level − 1), 2.5)`.
- Estado emitido por callback: `{ score, lives, level, phase }`.
- Controles: flechas y WASD saltan; `P`/`Escape` pausa/reanuda. `preventDefault` en flechas y espacio.
- `FroggerEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` vuelve a nivel 1, 3 vidas, score 0, chimeneas vacías.
- `components/games/frogger-game.tsx` (`"use client"`, `forwardRef<FroggerGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx`.
- `lib/games/registry.ts`: añadir `frogger: { component: FroggerGame }` (sin `secondaryLabel`: tiene vidas → corazones).
- Paso en Supabase vía MCP de Supabase: `update games set id = 'frogger', title = 'FROGGER', short = …, long = … where id = 'ranaria'` (textos navideños, ver Modelo de datos). Si el MCP no está conectado al llegar a este paso, el agente se detiene y pide al usuario que lo active.
- Añadir la fila de `frogger` a `references/implemented-games.md` (tabla y detalle por juego).

**Out of scope (para specs futuras):**

- Nueva portada: `cover-rana` se mantiene (ya dibuja carriles y una rana); no se toca `app/globals.css`.
- Cambios en `components/player.tsx`.
- Sonido (no hay assets de audio).
- Sprites PNG (no hay assets): todo se dibuja con primitivas de canvas.
- Témpanos que se hunden, cocodrilos/peligros en la meta, rana bonus, moscas bonus.
- Vidas extra por puntuación.
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

## Modelo de datos

```ts
// lib/games/frogger/engine.ts
export const W = 800;
export const H = 600;
export const CELL = 40;
export const COLS = 20; // W / CELL
export const GRID_ROWS = 13;
export const GRID_Y = 40; // y en px de la fila 0
export const HOME_COLS = [1, 5, 9, 13, 17]; // chimeneas de 2 celdas
export const START_ROW = 12;
export const START_X = 380; // (W - CELL) / 2
export const FROG_INSET = 6;
export const TIME_PER_FROG = 30; // s
export const DEATH_PAUSE = 1; // s
export const INITIAL_LIVES = 3;
export const SPEED_STEP = 0.15;
export const MAX_SPEED_MUL = 2.5;
export const LOOP_W = 1000; // W + 200: longitud del bucle de cada carril

export type LaneKind = "road" | "river";
export type LaneSprite =
  "trineo" | "quitanieves" | "camion" | "santa" | "tronco" | "tempano";

interface LaneDef {
  row: number;
  kind: LaneKind;
  sprite: LaneSprite;
  speed: number; // px/s, + = derecha
  len: number; // celdas
  count: number;
}

export const LANES: LaneDef[]; // los 10 carriles del Scope, valores exactos

export type FroggerPhase = "playing" | "dead" | "gameover" | "paused";

export interface FroggerState {
  score: number;
  lives: number;
  level: number;
  phase: FroggerPhase;
}

type Dir = { x: -1 | 0 | 1; y: -1 | 0 | 1 };
type MovingObj = { x: number; w: number }; // px

export class FroggerEngine {
  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: FroggerState) => void,
  );
  start(): void;
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  restart(): void;
  destroy(): void;
}
```

```ts
// components/games/frogger-game.tsx
export interface FroggerGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}
```

```ts
// lib/games/registry.ts — entrada nueva
frogger: { component: FroggerGame }, // tiene vidas → corazones, sin secondaryLabel
```

```sql
-- Fila del catálogo (vía MCP de Supabase). Cambian id, title, short y long.
-- Sin cambios: category 'ARCADE', cover 'cover-rana', color 'green',
-- best_seed 18900, plays_seed '6.4K' (valores del seed según references/resources/templates/data.jsx).
update games
set id = 'frogger',
    title = 'FROGGER',
    short = 'Cruza la nevada de Nochebuena.',
    long = 'Una rana con gorro rojo esquiva trineos y quitanieves en la calle nevada y cruza el río helado saltando sobre troncos de Navidad y témpanos. Llega a las cinco chimeneas antes de que se acabe el tiempo.'
where id = 'ranaria';
```

Convenciones:

- Origen arriba-izquierda. Fila `r` en px: `y = GRID_Y + r * CELL`. La rana guarda `x` en px (continuo, por el arrastre del río) y `row` entero.
- Salto horizontal: `x ± CELL`, clamp a `[0, W − CELL]`. Salto vertical: `row ± 1`, clamp a `[0, START_ROW]`.
- Los saltos se encolan en `pendingHop: Dir | null` desde `keydown` y se aplican en `update()`; con `phase` distinta de `'playing'` se descartan.
- Carriles: cada objeto avanza `speed × speedMul × dt`; si `speed > 0` y `x > W` → `x −= LOOP_W`; si `speed < 0` y `x + w < 0` → `x += LOOP_W`. Posición inicial del objeto `i`: `i × LOOP_W / count`.
- Chimenea alcanzada si el centro de la rana (`x + CELL / 2`) está en `[col × CELL, (col + 2) × CELL]`; la rana ocupa la chimenea y vuelve a la salida.
- `maxRowReached` (fila mínima del trayecto) se reinicia al reaparecer y al ocupar una chimenea.
- `dt` en segundos, clampeado a `Math.min(dt, 0.05)`. Los carriles siguen moviéndose durante `'dead'`; el tiempo de la rana no corre.
- `phase = 'paused'` congela la simulación sin cancelar el frame, igual que asteroids/tetris/arkanoid/snake.
- La barra de tiempo (franja 560–600 px) es parte del juego, no del HUD: el HUD React sigue siendo el único que muestra score, vidas y nivel.
- Paleta: río `#0b2a4a`, calle `#1c1c2a`, nieve `#e8f4ff`, ladrillo `#7a2e1f`, rana `var(--green)` equivalente `#00ff88`, gorro `#e0262f` con pompón blanco, troncos `#6b3f1d` con acebo, témpanos `#bfe9ff`.

## Plan de implementación

1. Crear `lib/games/frogger/engine.ts` (parte 1): constantes, `LANES`, tipos, clase `FroggerEngine` con campos de instancia (`frog { x, row }`, `maxRowReached`, `lanes` con sus `MovingObj[]`, `homes: boolean[5]`, `timeLeft`, `lives`, `score`, `level`, `state`, `paused`, `deathTimer`, `pendingHop`, `rafId`, `lastTime`, `flakes` decorativos), constructor que obtiene el contexto 2D (lanza si es null) y llama a `reset()` (`buildLanes()`, chimeneas vacías, `resetFrog()`). Verificar: `npx tsc --noEmit` sin errores nuevos.
2. `engine.ts` (parte 2): `update(dt)` — mover carriles, gestionar `deathTimer` en `'dead'` (reaparecer o `gameover`), aplicar `pendingHop` (+10 por fila nueva), descontar `timeLeft`, arrastre en el río, colisión de vehículos, caída al agua, salida lateral, llegada a la fila 0 (chimenea libre: +50 + 10 × tiempo; ocupada/muro: muerte), 5 chimeneas → +1000, `level++`, `speedMul`. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. `engine.ts` (parte 3): `draw()` — guirnalda superior, chimeneas (ocupadas con una rana y un regalo), río, plataformas, mediana, calle, vehículos, salida, rana con gorro (aplastada en `'dead'`), copos decorativos y barra de tiempo. Sin score/vidas/nivel en el canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `engine.ts` (parte 4): loop e input. `start()` idempotente; `keydown` en `window` como arrow class field (flechas + WASD encolan salto si `!e.repeat`; `P`/`Escape` alternan pausa; `preventDefault` en flechas/espacio). Loop: `if (!paused) update(dt)`, siempre `draw()` y `emitState()`. Añadir `pause`, `resume`, `forceGameOver` (`state = 'gameover'`), `restart` (`reset()` + nivel 1, 3 vidas, score 0) y `destroy` (cancela RAF, quita listener). Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
5. Crear `components/games/frogger-game.tsx`, espejo de `asteroids-game.tsx`: callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
6. Añadir `frogger: { component: FroggerGame }` a `GAME_ENGINES` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores.
7. Supabase vía MCP. **Precondición:** si el MCP de Supabase no está conectado/disponible al llegar aquí, el agente **se detiene y pide al usuario que lo active**, sin continuar ni caer a un paso manual. Con MCP: comprobar que `select count(*) from scores where game_id = 'ranaria'` devuelve 0 (la FK `scores.game_id` no tiene `on update cascade`); ejecutar el `update` del Modelo de datos. Verificar: `select id, title, cover, color from games where id = 'frogger'` devuelve `frogger | FROGGER | cover-rana | green`.
8. Añadir `frogger` a `references/implemented-games.md`: fila en la tabla Catalog (`ARCADE`, `green`, `cover-rana`, seeds, `— (lives / hearts)`, spec final) y bloque "Per-game details"; quitar `ranaria` de la nota de placeholders. Verificar: el archivo lista 5 juegos jugables y 3 placeholders.
9. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/juegos` muestra la card "FROGGER" con `cover-rana` y ya no muestra "RANARIA".
- [ ] `/juegos/frogger` carga mostrando "Mejor global" y "Partidas", con el texto corto "Cruza la nevada de Nochebuena.".
- [ ] `/juegos/frogger/jugar` renderiza el canvas con calle nevada, río helado y 5 chimeneas, no el `.game-arena` simulado.
- [ ] La rana empieza centrada en la fila inferior y el HUD muestra "Vidas" con 3 corazones, nivel 01 y score 0.
- [ ] Cada pulsación de flecha o WASD mueve la rana exactamente una celda; mantener la tecla pulsada no encadena saltos.
- [ ] Avanzar a una fila nueva suma exactamente 10 puntos; retroceder y volver a esa fila no suma.
- [ ] Tocar un vehículo quita una vida y la rana reaparece en la salida tras ~1 s.
- [ ] Saltar al agua fuera de un tronco o témpano quita una vida.
- [ ] Sobre un tronco la rana se desplaza con él; si sale del canvas, pierde una vida.
- [ ] Ocupar una chimenea con 20 s restantes suma exactamente 250 puntos (50 + 10 × 20).
- [ ] Saltar contra el muro o a una chimenea ocupada quita una vida.
- [ ] Agotar los 30 s de la barra de tiempo quita una vida.
- [ ] Ocupar las 5 chimeneas suma 1000 además de los puntos de la 5ª chimenea, vacía las chimeneas, el HUD pasa a Nivel 02 y los carriles van un 15 % más rápido.
- [ ] Con 0 vidas se abre el modal de fin de partida sin pulsar FIN.
- [ ] Flechas y espacio no hacen scroll de la página mientras se juega.
- [ ] PAUSA congela el juego y REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo.
- [ ] FIN abre el modal con la puntuación real.
- [ ] JUGAR DE NUEVO empieza en nivel 1, 3 vidas, score 0 y chimeneas vacías.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'frogger'` visible en `/juegos/frogger` y `/salon?juego=frogger`; si falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando igual.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado.
- [ ] SALIR y volver a entrar no duplica input ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal.

## Decisiones

- **Sí:** renombrar `ranaria` → `frogger` en Supabase. Mismo precedente que SPEC 05/07/08/09; evita dos Froggers en la Biblioteca.
- **No:** fila nueva `frogger` junto a `ranaria`. Duplicaría el juego.
- **Sí:** mantener `cover-rana`, `ARCADE`, `green` y seeds. La portada ya dibuja carriles y una rana. (decisión del agente, revisar)
- **Sí:** reescribir `short` y `long` con texto navideño. Los textos actuales hablan de coches y nenúfares, que el tema sustituye; a diferencia de renames anteriores, aquí el texto dejaría de describir el juego. (decisión del agente, revisar)
- **Sí:** `id = 'frogger'`, `title = 'FROGGER'`. El tema es ambientación, no un juego distinto. (decisión del agente, revisar)
- **Sí:** tema navidad solo visual: trineos/quitanieves = coches, troncos/témpanos = troncos/tortugas, chimeneas = nenúfares, rana con gorro rojo. No cambia reglas en esta variante. (decisión del agente, revisar)
- **Sí:** grid de 20×13 celdas de 40 px con franjas de 40 px arriba y abajo. 13 filas es la estructura clásica (meta + 5 río + mediana + 5 calle + salida) y cabe en 800×600. (decisión del agente, revisar)
- **Sí:** 3 vidas con corazones, sin `secondaryLabel`. Frogger tiene vidas; no se toca `player.tsx`.
- **Sí:** usar `phase = 'dead'` durante 1 s tras morir. El contrato lo prevé y `player.tsx` lo trata como "jugando". (decisión del agente, revisar)
- **Sí:** puntuación clásica (10 por fila nueva, 50 por meta + 10 × segundo restante, 1000 por las 5). Fiel al original. (decisión del agente, revisar)
- **Sí:** velocidad ×(1 + 0.15 × (nivel − 1)), tope ×2.5. Da sentido al campo "Nivel" con coste mínimo. (decisión del agente, revisar)
- **No:** témpanos que se hunden, peligros en la meta y bonus. Son la variante B/C; aquí se busca el coste mínimo.
- **Sí:** barra de tiempo dibujada en el canvas. El HUD no tiene ranura de tiempo y el temporizador es mecánica de juego, no HUD.
- **Sí:** ignorar `e.repeat`. Un salto por pulsación, como el original; evita saltos involuntarios al mantener la tecla.
- **Sí:** saltos encolados (`pendingHop`) y aplicados en `update()`. La lógica de colisión vive en un único sitio y respeta la pausa.
- **Sí:** persistencia real vía `saveScore`. Todo juego con motor guarda desde SPEC 07.
- **No:** sonido ni sprites PNG. No hay assets de Frogger en `references/resources/`; desde cero se usan primitivas de canvas.
- **No:** controles táctiles. Merecen su propia spec.

## Riesgos

| Riesgo                                                                                                        | Mitigación                                                                                     |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| El `update` de `games.id` falla si hay filas en `scores` con `game_id = 'ranaria'` (FK sin cascade)           | El paso 7 comprueba el `count` antes; si no es 0, borrar o migrar esas filas primero.          |
| `/juegos/ranaria` queda en 404 tras el rename                                                                 | Aceptado; sin redirección, igual que los renames anteriores.                                   |
| Existe otra variante temática de Frogger (`specs/game-jam/frogger-halloween/`) que también renombra `ranaria` | Solo se puede adoptar una; la segunda necesitaría fila nueva y portada propia.                 |
| Los seeds reales de `ranaria` en Supabase difieren de `data.jsx`                                              | El `update` no toca seeds; la verificación del paso 7 solo comprueba id, title, cover y color. |
| Saltos laterales sobre el río desalinean la rana de la rejilla                                                | Aceptado: es el comportamiento del original; la meta usa tolerancia de 2 celdas por chimenea.  |
| Hitbox demasiado estricto genera muertes injustas                                                             | Inset de 6 px por lado en la rana; ajustable con `FROG_INSET`.                                 |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena                                    | Riesgo preexistente; frogger puede no salir en la home. No se corrige aquí.                    |

## Lo que **no** está en esta spec

- Nueva portada para frogger (`cover-rana` se mantiene).
- Cambios en `components/player.tsx`.
- Sonido y sprites PNG.
- Témpanos que se hunden, peligros en la meta, rana y moscas bonus.
- Vidas extra por puntuación.
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

Cada uno, si llega, va en su propia spec.
