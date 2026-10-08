# SPEC JAM frogger-C — Frogger de Halloween en noche cerrada en Next.js

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 09
> **Date:** 2026-10-08
> **Objective:** Crear desde cero un motor TypeScript + Client Component de Frogger de Halloween jugado a oscuras, donde solo se ve el radio del farol de la rana salvo durante la luna llena periódica, que sustituye el juego simulado `ranaria` (renombrado a `frogger`), con puntuaciones reales en Supabase, añadiendo una entrada al registro de motores.
> **Variante:** C de 3 — difiere de las otras en: el tablero está a oscuras salvo un farol de radio menguante alrededor de la rana y 2 s de luna llena cada 10 s, y saltar a oscuras puntúa el doble.

## Por qué existe esta spec

El catálogo ya tiene `ranaria` (RANARIA, `cover-rana`, ARCADE, green), placeholder temático de Frogger con gameplay simulado. Igual que `rocas` → `asteroids` (SPEC 05), `caida` → `tetris` (SPEC 07), `bloque-buster` → `arkanoid` (SPEC 08) y `serpentina` → `snake` (SPEC 09), se renombra en vez de duplicar. Frogger encaja en Arcade Vault: un canvas, teclado, partidas cortas y un score numérico comparable. El tema Halloween da la ambientación (rana bruja, camino del cementerio con calabazas rodantes, carrozas fúnebres y escobas, río de niebla con ataúdes y calaveras, 5 tumbas abiertas) **y el twist**: es noche cerrada. La rana lleva un farol que ilumina un círculo a su alrededor; el resto del tablero solo deja ver los ojos brillantes de los peligros, y cada 10 s la luna llena lo ilumina todo durante 2 s. Esto convierte Frogger en un juego de memoria y timing: observar en luna llena, cruzar a oscuras. La luna de la fila 0 crece de creciente a llena para anunciar el siguiente destello. **No existe prototipo vanilla ni assets** en `references/resources/` para Frogger: motor desde cero, dibujado con primitivas de canvas y sin sonido. Frogger tiene vidas (3), así que mapea directo a la ranura "Vidas" con corazones, sin `secondaryLabel`.

## Scope

**In:**

- Motor `lib/games/frogger/engine.ts` (`FroggerEngine`) con estas reglas base:
  - Canvas 800×600, grid de `COLS = 20` × `ROWS = 15` celdas de `CELL = 40` px.
  - Filas: 0 cielo con la luna indicadora, `HOME_ROW = 1` (5 tumbas), 2–6 río de niebla, `MEDIAN_ROW = 7` franja segura, 8–12 camino del cementerio, `START_ROW = 13` salida segura, `TIMER_ROW = 14` barra de tiempo.
  - Rana: salta exactamente 1 celda (40 px) por pulsación; aparece en `x = 380`, fila 13. Se limita a `0 ≤ x ≤ W - CELL` y a filas 1–13.
  - 10 carriles fijos (`LANES`, ver Modelo de datos).
  - Camino: si la caja de la rana (recortada `FROG_INSET = 6` px por lado en horizontal) toca un peligro, la rana muere.
  - Río: la rana debe tener su centro sobre un ataúd o grupo de calaveras; si no, se ahoga. Sobre una plataforma se desplaza con ella. Si su centro sale de `[0, W]`, muere.
  - Tumbas: centros `HOME_SLOTS_X = [80, 240, 400, 560, 720]`, tolerancia `HOME_TOLERANCE = 20` px. Entrar en la fila 1 sobre una tumba libre la ocupa; fuera de una tumba o sobre una ocupada, la rana muere.
  - Tiempo: `TIME_PER_FROG = 30` s por rana; se reinicia al ocupar una tumba y al reaparecer. Llegar a 0 mata a la rana.
  - Vidas: `INITIAL_LIVES = 3`. Al morir, `lives -= 1` y `phase = 'dead'` durante `DEATH_DELAY = 1.0` s; después reaparece o, si `lives === 0`, `phase = 'gameover'`.
  - Nivel: ocupar las 5 tumbas suma +1 nivel, vacía las tumbas y aplica `speedMul = min(MAX_SPEED_MUL = 1.6, 1 + SPEED_STEP × (level - 1))` con `SPEED_STEP = 0.1`.
- Mecánica nueva — noche cerrada:
  - Ciclo lunar de `MOON_PERIOD = 10` s: los primeros `MOON_FULL = 2` s de cada ciclo son luna llena (sin oscuridad); los 8 s restantes son noche. La partida empieza en luna llena.
  - En noche, todo el canvas salvo la fila 0 y la fila 14 se cubre con un velo `rgba(5, 0, 15, DARK_ALPHA)` con `DARK_ALPHA = 0.92`, recortado por un gradiente radial centrado en la rana: transparente hasta `0.6 × lanternRadius`, opaco en `lanternRadius`.
  - Radio del farol: `lanternRadius = max(LANTERN_MIN = 90, LANTERN_BASE = 150 - LANTERN_STEP × (level - 1))` con `LANTERN_STEP = 15`.
  - Sobre el velo se dibujan siempre: los ojos de los peligros del camino (2 puntos de 3 px de radio, `#ff8a00`), una vela de 3 px (`#b388ff`) en el centro de cada ataúd y grupo de calaveras, las tumbas (con su vela si están libres), la rana y la barra de tiempo.
  - La luna de la fila 0 crece de creciente a llena durante los 8 s de noche (fracción `= (t - MOON_FULL) / (MOON_PERIOD - MOON_FULL)`), anunciando el siguiente destello.
  - El ciclo lunar avanza solo en `playing` y `dead`; se reinicia a luna llena en `restart()` y al subir de nivel.
- Puntuación:
  - Avanzar a una fila más alta que la máxima alcanzada por esa rana: +10 con luna llena, exactamente +20 en noche (`DARK_STEP_POINTS`).
  - Ocupar una tumba: +50, más `+10 × floor(timeLeft)` de bonus de tiempo.
  - Ocupar las 5 tumbas: +1000.
- Estado emitido por callback: `{ score, lives, level, phase }`.
- Controles: flechas y WASD saltan (una pulsación = un salto; se ignora `e.repeat`); `P`/`Escape` pausa/reanuda. `preventDefault` en flechas y espacio. Durante `phase = 'dead'` se ignoran los saltos.
- Paleta Halloween fija: rana bruja verde con sombrero morado, calabazas naranjas, carrozas fúnebres moradas, escobas marrones, ataúdes marrones, calaveras blancas, tumbas grises, luna amarilla.
- `FroggerEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` vuelve a nivel 1, 3 vidas, score 0, tumbas vacías, carriles en posición inicial y luna llena.
- `components/games/frogger-game.tsx` (`"use client"`, `forwardRef<FroggerGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx`.
- `lib/games/registry.ts`: añadir `frogger: { component: FroggerGame }` (sin `secondaryLabel`: tiene vidas → corazones).
- Paso en Supabase vía MCP de Supabase: renombrar `ranaria` → `frogger` y actualizar `short`/`long` al tema Halloween. Si el MCP no está conectado al llegar a este paso, el agente se detiene y pide al usuario que lo active.
- Añadir `frogger` a `references/implemented-games.md` (fila del catálogo, detalle por juego y quitar `ranaria` de la lista de placeholders).

**Out of scope (para specs futuras):**

- Nueva portada de Halloween: `cover-rana` se mantiene; no se toca `app/globals.css`.
- Cambios en `components/player.tsx`.
- Sonido (no hay assets de audio).
- Sprites o spritesheet (no hay assets de Frogger en `references/resources/assets/`).
- Recolectables (velas, caramelos) que amplíen el farol o alarguen la luna llena.
- Opción para desactivar la oscuridad o modo accesible de alto contraste.
- Tabla de niveles con carriles distintos y calaveras que se sumergen.
- Mosca bonus, rana dama, cocodrilos y serpiente.
- Animación del salto.
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

## Modelo de datos

```ts
// lib/games/frogger/engine.ts
export const W = 800;
export const H = 600;
export const CELL = 40;
export const COLS = 20; // W / CELL
export const ROWS = 15; // H / CELL
export const HOME_ROW = 1;
export const MEDIAN_ROW = 7;
export const START_ROW = 13;
export const TIMER_ROW = 14;
export const FROG_START_X = 380;
export const FROG_INSET = 6;
export const HOME_SLOTS_X = [80, 240, 400, 560, 720]; // centros en px
export const HOME_TOLERANCE = 20;
export const TIME_PER_FROG = 30; // s
export const INITIAL_LIVES = 3;
export const DEATH_DELAY = 1.0; // s
export const SPEED_STEP = 0.1;
export const MAX_SPEED_MUL = 1.6;
export const WRAP_MARGIN = 200;
export const MOON_PERIOD = 10; // s
export const MOON_FULL = 2; // s de luna llena al inicio de cada ciclo
export const DARK_ALPHA = 0.92;
export const LANTERN_BASE = 150; // px
export const LANTERN_STEP = 15;
export const LANTERN_MIN = 90;
export const STEP_POINTS = 10;
export const DARK_STEP_POINTS = 20;
export const HOME_POINTS = 50;
export const TIME_BONUS_PER_S = 10;
export const LEVEL_CLEAR_POINTS = 1000;

export type FroggerPhase = "playing" | "dead" | "gameover" | "paused";

export interface FroggerState {
  score: number;
  lives: number;
  level: number;
  phase: FroggerPhase;
}

type LaneKind = "road" | "river";
type HazardShape = "pumpkin" | "hearse" | "broom" | "coffin" | "skulls";

interface Lane {
  row: number;
  kind: LaneKind;
  shape: HazardShape;
  len: number; // celdas por objeto
  count: number; // objetos en el carril
  speed: number; // px/s en nivel 1
  dir: 1 | -1;
}

interface Mover {
  x: number; // borde izquierdo en px
  w: number; // len * CELL
}

export const LANES: Lane[] = [
  {
    row: 12,
    kind: "road",
    shape: "pumpkin",
    len: 1,
    count: 4,
    speed: 60,
    dir: -1,
  },
  {
    row: 11,
    kind: "road",
    shape: "hearse",
    len: 2,
    count: 3,
    speed: 80,
    dir: 1,
  },
  {
    row: 10,
    kind: "road",
    shape: "broom",
    len: 1,
    count: 3,
    speed: 110,
    dir: -1,
  },
  {
    row: 9,
    kind: "road",
    shape: "hearse",
    len: 2,
    count: 3,
    speed: 70,
    dir: 1,
  },
  {
    row: 8,
    kind: "road",
    shape: "hearse",
    len: 3,
    count: 2,
    speed: 50,
    dir: -1,
  },
  {
    row: 6,
    kind: "river",
    shape: "skulls",
    len: 3,
    count: 4,
    speed: 50,
    dir: -1,
  },
  {
    row: 5,
    kind: "river",
    shape: "coffin",
    len: 3,
    count: 4,
    speed: 60,
    dir: 1,
  },
  {
    row: 4,
    kind: "river",
    shape: "coffin",
    len: 5,
    count: 3,
    speed: 80,
    dir: 1,
  },
  {
    row: 3,
    kind: "river",
    shape: "skulls",
    len: 2,
    count: 5,
    speed: 70,
    dir: -1,
  },
  {
    row: 2,
    kind: "river",
    shape: "coffin",
    len: 4,
    count: 4,
    speed: 55,
    dir: 1,
  },
];

export const COLORS = {
  sky: "#0a0a18",
  moon: "#ffe066",
  river: "#1a0f2e",
  road: "#14101f",
  grass: "#0f2a14",
  frog: "#00ff88",
  hat: "#7a3cff",
  pumpkin: "#ff8a00",
  hearse: "#3a1f5c",
  broom: "#8b5a2b",
  coffin: "#5a3a22",
  skull: "#e8e8e8",
  tomb: "#6b6b7a",
  eyes: "#ff8a00",
  candle: "#b388ff",
  veil: "rgba(5, 0, 15, 0.92)",
  timer: "#00ff88",
  timerLow: "#ff8a00",
};

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
-- Sin cambios: category 'ARCADE', cover 'cover-rana', color 'green', best_seed 18900, plays_seed '6.4K'.
update games
set id = 'frogger',
    title = 'FROGGER',
    short = 'Cruza el cementerio en noche de difuntos.',
    long = 'Una rana bruja salta entre calabazas rodantes y carrozas fúnebres, cruza el río de niebla sobre ataúdes a la deriva y busca refugio en las tumbas abiertas antes de que se apague la vela.'
where id = 'ranaria';
```

Convenciones:

- Coordenadas del canvas: origen arriba-izquierda. La rana guarda `x` en px y `row` en celdas; `y = row * CELL`.
- Velocidades en px/s; `dt` en segundos, clampeado con `Math.min(dt, 0.05)`.
- Posición inicial de cada objeto: `x = -WRAP_MARGIN + i * spacing`, con `spacing = (W + 2 * WRAP_MARGIN) / count`. Envoltura: `x = mod(x + WRAP_MARGIN, W + 2 * WRAP_MARGIN) - WRAP_MARGIN`.
- Velocidad efectiva: `lane.speed * speedMul * lane.dir`.
- Centro de la rana: `cx = x + CELL / 2`, `cy = row * CELL + CELL / 2`. En el río, soporte si `mover.x ≤ cx ≤ mover.x + mover.w`.
- Ciclo lunar: `moonClock` en segundos; `t = moonClock % MOON_PERIOD`; `isNight = t >= MOON_FULL`.
- Orden de dibujo: escena completa → velo (si `isNight`) con un único `fillRect` de `y = CELL` a `y = TIMER_ROW * CELL` usando `createRadialGradient(cx, cy, 0.6 × r, cx, cy, r)` → ojos, velas, tumbas, rana → luna en fila 0 → barra de tiempo en fila 14. Sin canvas offscreen.
- `minRowReached` por rana; se reinicia a `START_ROW` al reaparecer y al ocupar una tumba. La puntuación del paso usa `isNight` en el instante del salto.
- `phase = 'paused'` congela la simulación y el ciclo lunar sin cancelar el frame. En `phase = 'dead'` los carriles y la luna siguen avanzando y el temporizador por rana se detiene.
- La barra de tiempo en la fila 14 no es HUD (score, vidas y nivel siguen en React); se permite como elemento de gameplay.

## Plan de implementación

1. Crear `lib/games/frogger/engine.ts` (parte 1): constantes, `LANES`, `COLORS`, tipos y clase `FroggerEngine` con campos de instancia (`frog`, `movers: Mover[][]`, `homes: boolean[]`, `minRowReached`, `timeLeft`, `deadTimer`, `moonClock`, `score`, `lives`, `level`, `speedMul`, `state`, `paused`, `rafId`, `lastTime`), constructor que obtiene el contexto 2D (lanza si es null) y llama a `reset()`. Verificar: `npx tsc --noEmit` sin errores nuevos.
2. `engine.ts` (parte 2): `update(dt)` — mover y envolver objetos, avanzar `moonClock`; en `dead`, descontar `deadTimer` y reaparecer o pasar a `gameover`; en `playing`, arrastrar la rana, colisiones de camino, ahogamiento, salida lateral, descontar `timeLeft` y matar a 0. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. `engine.ts` (parte 3): `hop(dx, dy)` — mover 1 celda con límites, +10 (luna llena) o +20 (noche) al superar `minRowReached`, resolución de la fila 1 (tumba libre: +50 y bonus de tiempo; 5 tumbas: +1000, nivel +1, `speedMul` recalculado, `moonClock = 0`, tumbas vacías; fuera de tumba u ocupada: muerte). Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `engine.ts` (parte 4): `draw()` de la escena — cielo, tumbas, río, franja, camino, objetos por `shape` y rana bruja (o una cruz en `dead`). Sin velo todavía. Verificar: `npx tsc --noEmit` sin errores nuevos.
5. `engine.ts` (parte 5): capa nocturna en `draw()` — velo con gradiente radial de radio `lanternRadius` si `isNight`, ojos de peligros, velas de plataformas y tumbas, rana encima, luna creciente en la fila 0 y barra de tiempo en la fila 14. Sin HUD ni overlays de texto en el canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
6. `engine.ts` (parte 6): loop e input. `start()` idempotente; `keydown` en `window` como arrow class field (flechas + WASD llaman a `hop`, ignorando `e.repeat` y `dead`; `P`/`Escape` alternan pausa; `preventDefault` en flechas/espacio). Loop: `if (!paused) update(dt)`, siempre `draw()` y `emitState()`. Añadir `pause`, `resume`, `forceGameOver` (`state = 'gameover'`), `restart` (`reset()` con nivel 1, 3 vidas, score 0, `moonClock = 0`) y `destroy` (cancela RAF, quita el listener). Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
7. Crear `components/games/frogger-game.tsx`, espejo de `asteroids-game.tsx`: callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
8. Añadir `frogger: { component: FroggerGame }` a `GAME_ENGINES` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores.
9. Supabase vía MCP de Supabase: el agente ejecuta el SQL con las herramientas del MCP. **Precondición:** si el MCP de Supabase no está conectado/disponible al llegar aquí, el agente **se detiene y pide al usuario que lo active**, sin continuar ni caer a un paso manual. Con el MCP conectado: comprobar que `select count(*) from scores where game_id = 'ranaria'` devuelve 0 (la FK `scores.game_id` no tiene `on update cascade`); ejecutar el `update` del Modelo de datos. Verificar: `select id, title, cover, color from games where id = 'frogger'` devuelve `frogger | FROGGER | cover-rana | green`.
10. Añadir `frogger` a `references/implemented-games.md`: fila en "Catalog (playable)" (`frogger | FROGGER | ARCADE | green | cover-rana | 18900 | 6.4K | — (lives / hearts) | SPEC NN`), bloque "Per-game details" con los nuevos `short`/`long`, y quitar `ranaria` de la nota de placeholders. Verificar: el archivo lista 5 juegos jugables y 3 placeholders.
11. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/juegos` muestra la card "FROGGER" con `cover-rana` y ya no muestra "RANARIA".
- [ ] `/juegos/frogger` carga mostrando "Mejor global", "Partidas" y el nuevo texto de Halloween.
- [ ] `/juegos/frogger/jugar` renderiza el canvas con la rana bruja, 5 carriles de camino, 5 de río y 5 tumbas, no el `.game-arena` simulado.
- [ ] El HUD muestra "Vidas" con 3 corazones al empezar, nivel 1 y score 0.
- [ ] La partida empieza con el tablero iluminado y a los 2 s se oscurece todo salvo un círculo de 150 px alrededor de la rana.
- [ ] Cada 10 s el tablero se ilumina por completo durante 2 s, y la luna de la fila 0 se ve llena en ese momento.
- [ ] En noche se ven los ojos naranjas de calabazas, carrozas y escobas y las velas de ataúdes y calaveras fuera del farol.
- [ ] Subir a una fila nueva con luna llena suma exactamente 10 puntos; en noche suma exactamente 20.
- [ ] En nivel 2 el radio del farol es 135 px; a partir del nivel 5 es 90 px y no baja más.
- [ ] Cada pulsación de flecha o WASD mueve la rana exactamente 1 celda; mantener la tecla pulsada no encadena saltos.
- [ ] Tocar un peligro del camino quita una vida y la rana reaparece en la salida tras 1 s.
- [ ] Saltar al agua sin plataforma debajo quita una vida; si el ataúd saca a la rana por el borde, también.
- [ ] Ocupar una tumba libre suma 50 más 10 por cada segundo entero restante.
- [ ] Saltar a la fila de tumbas fuera de una tumba o sobre una ocupada quita una vida.
- [ ] Dejar que la barra de tiempo llegue a 0 (30 s) quita una vida.
- [ ] Ocupar las 5 tumbas suma 1000, el nivel pasa a 2, las tumbas se vacían y el ciclo vuelve a luna llena.
- [ ] Perder la tercera vida abre el modal de fin de partida sin pulsar FIN.
- [ ] Flechas y espacio no hacen scroll de la página mientras se juega.
- [ ] PAUSA congela el juego y el ciclo lunar, y REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo.
- [ ] FIN abre el modal con la puntuación real.
- [ ] JUGAR DE NUEVO empieza en nivel 1, 3 vidas, score 0, tumbas vacías y luna llena.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'frogger'` visible en `/juegos/frogger` y `/salon?juego=frogger`; si falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando igual.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado.
- [ ] SALIR y volver a entrar no duplica input ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal y el farol sigue centrado en la rana.

## Decisiones

- **Sí:** renombrar `ranaria` → `frogger` en Supabase. Mismo precedente que SPEC 05/07/08/09; evita dos Froggers en la Biblioteca.
- **No:** fila nueva `frogger` junto a `ranaria`. Duplicaría el juego.
- **Sí:** id `frogger` y título `FROGGER`, sin sufijo de tema. El tema es ambientación, no otro juego. (decisión del agente, revisar)
- **Sí:** actualizar también `short` y `long` en el mismo `update`. Los textos de `ranaria` hablan de coches, troncos y nenúfares y contradirían la ambientación. (decisión del agente, revisar)
- **Sí:** mantener `cover-rana`, `ARCADE` y `green`. La portada ya describe un Frogger; una de Halloween va en otra spec. (decisión del agente, revisar)
- **Sí:** twist "noche cerrada" con farol y luna llena periódica. Sale del tema Halloween y cambia cómo se juega: observar con luz, cruzar de memoria. (decisión del agente, revisar)
- **Sí:** ojos y velas siempre visibles sobre el velo. Sin ellos, morir a oscuras sería azar; con ellos, es lectura de patrones. (decisión del agente, revisar)
- **Sí:** luna de la fila 0 que crece hasta el destello. Anuncia la luz sin texto en el canvas. (decisión del agente, revisar)
- **Sí:** +20 por fila nueva en noche frente a +10 con luna llena. Premia arriesgarse a oscuras en vez de esperar la luz. (decisión del agente, revisar)
- **Sí:** farol que mengua 15 px por nivel hasta 90 px, y velocidad que sube solo un 10 % por nivel con tope 1.6×. La dificultad la aporta la oscuridad; sumar la curva de A haría el juego injusto. (decisión del agente, revisar)
- **Sí:** velo con un `fillRect` y gradiente radial, sin canvas offscreen. Una sola llamada por frame; sin estado extra que limpiar en `destroy()`. (decisión del agente, revisar)
- **No:** recolectables que amplíen el farol. Segunda mecánica; esta variante introduce solo una.
- **No:** opción para desactivar la oscuridad. Necesitaría UI en `player.tsx`; va en otra spec.
- **Sí:** 3 vidas con corazones, sin `secondaryLabel`. Fiel al original; no se edita `player.tsx`.
- **Sí:** `phase = 'dead'` durante 1 s tras morir. Mismo uso que asteroids.
- **Sí:** barra de tiempo en el canvas, por encima del velo. El tiempo por rana es gameplay y debe verse a oscuras. (decisión del agente, revisar)
- **Sí:** salto instantáneo e ignorar `e.repeat`. Evita saltos encadenados involuntarios. (decisión del agente, revisar)
- **Sí:** dibujo con primitivas de canvas. No hay prototipo ni assets de Frogger en `references/resources/`.
- **No:** sonido. No hay assets de audio.
- **No:** calaveras que se sumergen, mosca bonus, cocodrilos y serpiente. Mezclarían otro eje con el twist.
- **Sí:** flechas + WASD, `P`/`Escape` para pausa.
- **Sí:** rename vía MCP de Supabase ejecutado por el agente, como SPEC 08/09.
- **Sí:** persistencia real vía `saveScore`. Todo juego con motor guarda desde SPEC 07.
- **No:** controles táctiles. Merecen su propia spec.

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                         |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| El `update` de `games.id` falla si hay filas en `scores` con `game_id = 'ranaria'` (FK sin cascade) | El paso 9 comprueba el `count` antes; si no es 0, borrar o migrar esas filas primero.              |
| `/juegos/ranaria` queda en 404 tras el rename                                                       | Aceptado; sin redirección, igual que los renames anteriores.                                       |
| La oscuridad hace el juego frustrante o injusto                                                     | Ojos y velas visibles, luna anunciada, luz cada 10 s; constantes aisladas para ajustar el balance. |
| Problema de accesibilidad para jugadores con baja visión                                            | Aceptado en esta variante; un modo alto contraste queda fuera de scope.                            |
| El gradiente radial por frame cuesta rendimiento en móviles                                         | Un único `fillRect` limitado a las filas 1–13; sin offscreen ni `filter`.                          |
| La rana sobre un ataúd queda desalineada y no encaja en una tumba                                   | Tolerancia de 20 px sobre el centro; al ocuparla se ajusta `x` al centro.                          |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena                          | Riesgo preexistente (BACKLOG #3); frogger puede no salir en la home. No se corrige aquí.           |
| `npm run lint` falla por errores preexistentes en `app/page.tsx`                                    | Riesgo preexistente (BACKLOG #2); el gate exige "sin errores nuevos" si sigue sin resolverse.      |

## Lo que **no** está en esta spec

- Nueva portada de Halloween (`cover-rana` se mantiene).
- Cambios en `components/player.tsx`.
- Sonido.
- Sprites o spritesheet.
- Recolectables que amplíen el farol o la luna llena.
- Opción para desactivar la oscuridad o modo alto contraste.
- Tabla de niveles con carriles distintos y calaveras que se sumergen.
- Mosca bonus, rana dama, cocodrilos y serpiente.
- Animación del salto.
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

Cada uno, si llega, va en su propia spec.
