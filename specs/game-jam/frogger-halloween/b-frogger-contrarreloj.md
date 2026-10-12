# SPEC JAM frogger-B — Frogger de Halloween contrarreloj con niveles en Next.js

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-10-08
> **Objective:** Crear desde cero un motor TypeScript + Client Component de Frogger de Halloween con reloj global en lugar de vidas y una tabla de 5 niveles, que sustituye el juego simulado `ranaria` (renombrado a `frogger`), con puntuaciones reales en Supabase, añadiendo una entrada al registro de motores.
> **Variante:** B de 3 — difiere de las otras en: no hay vidas sino un reloj global de noche (HUD "Tiempo") que morir recorta y las tumbas recargan, con 5 niveles de diseño distinto, calaveras que se sumergen y puntos multiplicados por nivel.

## Por qué existe esta spec

El catálogo ya tiene `ranaria` (RANARIA, `cover-rana`, ARCADE, green), placeholder temático de Frogger con gameplay simulado. Igual que `rocas` → `asteroids` (SPEC 05), `caida` → `tetris` (SPEC 07), `bloque-buster` → `arkanoid` (SPEC 08) y `serpentina` → `snake` (SPEC 09), se renombra en vez de duplicar. Frogger encaja en Arcade Vault: un canvas, teclado, partidas cortas y un score numérico comparable. El tema Halloween solo cambia la ambientación: rana bruja, camino del cementerio (calabazas rodantes, carrozas fúnebres, escobas), río de niebla (ataúdes y calaveras flotantes) y 5 tumbas abiertas como refugio. Esta variante cambia la curva: la partida es una carrera contra "la noche" (un reloj global), así que la ranura "Vidas" muestra los segundos restantes vía `secondaryLabel: "Tiempo"`, como Tetris con "Líneas" y Snake con "Longitud". **No existe prototipo vanilla ni assets** en `references/resources/` para Frogger: motor desde cero, dibujado con primitivas de canvas y sin sonido. Como Arkanoid (SPEC 08), los niveles viven en un `levels.ts` aparte.

## Scope

**In:**

- `lib/games/frogger/levels.ts`: `BASE_LANES` (10 carriles) y `LEVELS` (5 configuraciones con `speedMul`, `diving` y `laneOverrides`), más `getLevelConfig(level)` que devuelve el nivel 5 escalado para niveles ≥ 6.
- Motor `lib/games/frogger/engine.ts` (`FroggerEngine`) con estas reglas:
  - Canvas 800×600, grid de `COLS = 20` × `ROWS = 15` celdas de `CELL = 40` px.
  - Filas: 0 decorado (luna y cielo), `HOME_ROW = 1` (5 tumbas), 2–6 río de niebla, `MEDIAN_ROW = 7` franja segura, 8–12 camino del cementerio, `START_ROW = 13` salida segura, fila 14 decorado (verja del cementerio).
  - Rana: salta exactamente 1 celda (40 px) por pulsación; aparece en `x = 380`, fila 13. Se limita a `0 ≤ x ≤ W - CELL` y a filas 1–13.
  - Camino: si la caja de la rana (recortada `FROG_INSET = 6` px por lado en horizontal) toca un peligro, la rana muere.
  - Río: la rana debe tener su centro sobre un ataúd o un grupo de calaveras **a flote**; si no, se ahoga. Sobre una plataforma se desplaza con ella. Si su centro sale de `[0, W]`, muere.
  - Calaveras que se sumergen (niveles con `diving = true`, carriles 3 y 6): ciclo de `DIVE_UP = 3.0` s a flote, `DIVE_SINKING = 0.5` s hundiéndose (aún sostienen) y `DIVE_UNDER = 1.5` s bajo la niebla (no sostienen). Cada grupo `i` desfasado `i × 1.25` s.
  - Tumbas: centros `HOME_SLOTS_X = [80, 240, 400, 560, 720]`, tolerancia `HOME_TOLERANCE = 20` px. Entrar en la fila 1 sobre una tumba libre la ocupa; fuera de una tumba o sobre una ocupada, la rana muere.
  - Reloj global: empieza en `START_TIME = 60` s y baja en tiempo real. Ocupar una tumba suma `HOME_TIME_BONUS = 8` s; completar un nivel suma `LEVEL_TIME_BONUS = 15` s; tope `MAX_TIME = 99` s. Morir resta `DEATH_TIME_PENALTY = 5` s.
  - Muerte: `phase = 'dead'` durante `DEATH_DELAY = 0.6` s (reloj detenido) y reaparición en la salida. No hay vidas.
  - Fin: el reloj llega a 0 (por tiempo o por la penalización de una muerte) → `phase = 'gameover'`.
  - Nivel: ocupar las 5 tumbas suma +1 nivel, vacía las tumbas y carga `getLevelConfig(level)`. Sin nivel final: a partir del 6 se repite el 5 con `speedMul = min(MAX_SPEED_MUL = 2.5, 1.6 + 0.1 × (level - 5))`.
- Puntuación (multiplicada por nivel):
  - Avanzar a una fila más alta que la máxima alcanzada por esa rana: `+10 × level`.
  - Ocupar una tumba: `+100 × level`.
  - Completar un nivel: `+500 × level`.
  - Sin bonus por tiempo restante: el tiempo es el recurso, no un premio.
- Estado emitido por callback: `{ score, lives, level, phase }`, con `lives = Math.ceil(timeLeft)`.
- Controles: flechas y WASD saltan (una pulsación = un salto; se ignora `e.repeat`); `P`/`Escape` pausa/reanuda. `preventDefault` en flechas y espacio. Durante `phase = 'dead'` se ignoran los saltos.
- Dibujo con primitivas de canvas y paleta Halloween fija: rana bruja verde con sombrero morado, calabazas naranjas, carrozas fúnebres moradas, escobas marrones, ataúdes marrones, calaveras blancas (alfa 0.5 hundiéndose, contorno alfa 0.15 bajo la niebla), tumbas grises. Sin barra de tiempo en el canvas: el HUD React ya muestra "Tiempo".
- `FroggerEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` vuelve a nivel 1, 60 s, score 0 y tumbas vacías.
- `components/games/frogger-game.tsx` (`"use client"`, `forwardRef<FroggerGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx`.
- `lib/games/registry.ts`: añadir `frogger: { component: FroggerGame, secondaryLabel: "Tiempo" }`.
- Paso en Supabase vía MCP de Supabase: renombrar `ranaria` → `frogger` y actualizar `short`/`long` al tema Halloween. Si el MCP no está conectado al llegar a este paso, el agente se detiene y pide al usuario que lo active.
- Añadir `frogger` a `references/implemented-games.md` (fila del catálogo, detalle por juego y quitar `ranaria` de la lista de placeholders).

**Out of scope (para specs futuras):**

- Nueva portada de Halloween: `cover-rana` se mantiene; no se toca `app/globals.css`.
- Cambios en `components/player.tsx`.
- Sonido (no hay assets de audio).
- Sprites o spritesheet (no hay assets de Frogger en `references/resources/assets/`).
- Vidas o modo híbrido vidas + reloj.
- Mosca bonus, rana dama, cocodrilos y serpiente.
- Selección de nivel inicial.
- Animación del salto.
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

## Modelo de datos

```ts
// lib/games/frogger/levels.ts
export type LaneKind = "road" | "river";
export type HazardShape = "pumpkin" | "hearse" | "broom" | "coffin" | "skulls";

export interface Lane {
  row: number;
  kind: LaneKind;
  shape: HazardShape;
  len: number; // celdas por objeto
  count: number; // objetos en el carril
  speed: number; // px/s antes de speedMul
  dir: 1 | -1;
}

export interface LevelConfig {
  speedMul: number;
  diving: boolean; // calaveras de filas 3 y 6 se sumergen
  laneOverrides: Partial<Record<number, Partial<Pick<Lane, "len" | "count">>>>; // clave = row
}

export const BASE_LANES: Lane[] = [
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

export const LEVELS: LevelConfig[] = [
  { speedMul: 1.0, diving: false, laneOverrides: {} },
  { speedMul: 1.15, diving: true, laneOverrides: {} },
  { speedMul: 1.3, diving: true, laneOverrides: { 10: { count: 4 } } },
  {
    speedMul: 1.45,
    diving: true,
    laneOverrides: { 10: { count: 4 }, 4: { len: 4 } },
  },
  {
    speedMul: 1.6,
    diving: true,
    laneOverrides: { 10: { count: 4 }, 4: { len: 4 }, 2: { count: 3 } },
  },
];

export function getLevelConfig(level: number): LevelConfig; // level ≥ 6 → LEVELS[4] con speedMul escalado
```

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
export const FROG_START_X = 380;
export const FROG_INSET = 6;
export const HOME_SLOTS_X = [80, 240, 400, 560, 720]; // centros en px
export const HOME_TOLERANCE = 20;
export const START_TIME = 60; // s
export const HOME_TIME_BONUS = 8;
export const LEVEL_TIME_BONUS = 15;
export const DEATH_TIME_PENALTY = 5;
export const MAX_TIME = 99;
export const DEATH_DELAY = 0.6; // s
export const DIVE_UP = 3.0;
export const DIVE_SINKING = 0.5;
export const DIVE_UNDER = 1.5;
export const DIVE_GROUP_OFFSET = 1.25;
export const MAX_SPEED_MUL = 2.5;
export const WRAP_MARGIN = 200;
export const STEP_POINTS = 10; // × level
export const HOME_POINTS = 100; // × level
export const LEVEL_CLEAR_POINTS = 500; // × level

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
};

export type FroggerPhase = "playing" | "dead" | "gameover" | "paused";

export interface FroggerState {
  score: number;
  lives: number; // Math.ceil(timeLeft) (HUD: "Tiempo")
  level: number;
  phase: FroggerPhase;
}

type DivePhase = "up" | "sinking" | "under";

interface Mover {
  x: number; // borde izquierdo en px
  w: number; // len * CELL
  diveOffset: number; // s; solo calaveras con diving
}

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
frogger: { component: FroggerGame, secondaryLabel: "Tiempo" },
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
- Carriles del nivel = `BASE_LANES` con `laneOverrides` aplicados por `row`. Se reconstruyen los `Mover` al cambiar de nivel y en `restart()`.
- Posición inicial de cada objeto: `x = -WRAP_MARGIN + i * spacing`, con `spacing = (W + 2 * WRAP_MARGIN) / count`. Envoltura: `x = mod(x + WRAP_MARGIN, W + 2 * WRAP_MARGIN) - WRAP_MARGIN`.
- Velocidad efectiva: `lane.speed * speedMul * lane.dir`.
- Fase de inmersión: `t = mod(diveClock + diveOffset, DIVE_UP + DIVE_SINKING + DIVE_UNDER)`; `up` si `t < 3.0`, `sinking` si `t < 3.5`, si no `under`. `diveClock` avanza con `dt` solo en `playing` y `dead`.
- Centro de la rana: `cx = x + CELL / 2`. En el río, soporte si `mover.x ≤ cx ≤ mover.x + mover.w` y el mover no está `under`.
- `minRowReached` por rana; se reinicia a `START_ROW` al reaparecer y al ocupar una tumba.
- `phase = 'paused'` congela la simulación sin cancelar el frame. En `phase = 'dead'` los carriles siguen moviéndose y el reloj global se detiene.

## Plan de implementación

1. Crear `lib/games/frogger/levels.ts`: tipos `LaneKind`, `HazardShape`, `Lane`, `LevelConfig`, `BASE_LANES`, `LEVELS` y `getLevelConfig(level)`. Verificar: `npx tsc --noEmit` sin errores nuevos.
2. Crear `lib/games/frogger/engine.ts` (parte 1): constantes, `COLORS`, tipos y clase `FroggerEngine` con campos de instancia (`frog`, `lanes`, `movers: Mover[][]`, `homes: boolean[]`, `minRowReached`, `timeLeft`, `diveClock`, `deadTimer`, `score`, `level`, `config`, `state`, `paused`, `rafId`, `lastTime`), constructor que obtiene el contexto 2D (lanza si es null) y llama a `reset()`, y `loadLevel(level)` que aplica `getLevelConfig` y reconstruye los carriles. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. `engine.ts` (parte 2): `update(dt)` — mover y envolver objetos, avanzar `diveClock`; en `dead`, descontar `deadTimer` y reaparecer; en `playing`, descontar `timeLeft` (a 0 → `gameover`), arrastrar la rana, colisiones de camino, ahogamiento (incluido `under`) y salida lateral. `kill()` resta 5 s y pasa a `dead` o, si el reloj queda ≤ 0, a `gameover`. Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `engine.ts` (parte 3): `hop(dx, dy)` — mover 1 celda con límites, `+10 × level` al superar `minRowReached`, resolución de la fila 1 (tumba libre: `+100 × level`, +8 s con tope 99; 5 tumbas: `+500 × level`, +15 s, `loadLevel(level + 1)`; fuera de tumba u ocupada: `kill()`). Verificar: `npx tsc --noEmit` sin errores nuevos.
5. `engine.ts` (parte 4): `draw()` — cielo y luna, tumbas (ocupadas con rana dentro), río, franja, camino, objetos por `shape` (calaveras con alfa según `DivePhase`), verja en fila 14 y rana bruja (o una cruz en `dead`). Sin HUD ni overlays de texto en el canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
6. `engine.ts` (parte 5): loop e input. `start()` idempotente; `keydown` en `window` como arrow class field (flechas + WASD llaman a `hop`, ignorando `e.repeat` y `dead`; `P`/`Escape` alternan pausa; `preventDefault` en flechas/espacio). Loop: `if (!paused) update(dt)`, siempre `draw()` y `emitState()` con `lives = Math.ceil(timeLeft)`. Añadir `pause`, `resume`, `forceGameOver` (`state = 'gameover'`), `restart` (nivel 1, 60 s, score 0) y `destroy` (cancela RAF, quita el listener). Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
7. Crear `components/games/frogger-game.tsx`, espejo de `asteroids-game.tsx`: callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
8. Añadir `frogger: { component: FroggerGame, secondaryLabel: "Tiempo" }` a `GAME_ENGINES` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores.
9. Supabase vía MCP de Supabase: el agente ejecuta el SQL con las herramientas del MCP. **Precondición:** si el MCP de Supabase no está conectado/disponible al llegar aquí, el agente **se detiene y pide al usuario que lo active**, sin continuar ni caer a un paso manual. Con el MCP conectado: comprobar que `select count(*) from scores where game_id = 'ranaria'` devuelve 0 (la FK `scores.game_id` no tiene `on update cascade`); ejecutar el `update` del Modelo de datos. Verificar: `select id, title, cover, color from games where id = 'frogger'` devuelve `frogger | FROGGER | cover-rana | green`.
10. Añadir `frogger` a `references/implemented-games.md`: fila en "Catalog (playable)" (`frogger | FROGGER | ARCADE | green | cover-rana | 18900 | 6.4K | Tiempo | SPEC NN`), bloque "Per-game details" con los nuevos `short`/`long`, y quitar `ranaria` de la nota de placeholders. Verificar: el archivo lista 5 juegos jugables y 3 placeholders.
11. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/juegos` muestra la card "FROGGER" con `cover-rana` y ya no muestra "RANARIA".
- [ ] `/juegos/frogger` carga mostrando "Mejor global", "Partidas" y el nuevo texto de Halloween.
- [ ] `/juegos/frogger/jugar` renderiza el canvas con la rana bruja, 5 carriles de camino, 5 de río y 5 tumbas, no el `.game-arena` simulado.
- [ ] El HUD muestra "Tiempo 60" al empezar (sin corazones), nivel 1 y score 0, y el tiempo baja 1 por segundo.
- [ ] Cada pulsación de flecha o WASD mueve la rana exactamente 1 celda; mantener la tecla pulsada no encadena saltos.
- [ ] En nivel 1, subir a una fila nueva suma exactamente 10 puntos; en nivel 2 suma exactamente 20.
- [ ] Tocar un peligro del camino resta exactamente 5 s del "Tiempo" y la rana reaparece en la salida tras 0.6 s.
- [ ] Saltar al agua sin plataforma debajo resta 5 s; si el ataúd saca a la rana por el borde, también.
- [ ] En nivel 1 ninguna calavera se sumerge; desde el nivel 2 las calaveras de las filas 3 y 6 se vuelven translúcidas y luego desaparecen bajo la niebla, y estar encima en ese momento resta 5 s.
- [ ] Ocupar una tumba libre en nivel 1 suma exactamente 100 puntos y 8 s de tiempo (sin pasar de 99).
- [ ] Saltar a la fila de tumbas fuera de una tumba o sobre una ocupada resta 5 s.
- [ ] Ocupar las 5 tumbas en nivel 1 suma 500, añade 15 s, el nivel pasa a 2 y las tumbas se vacían.
- [ ] El nivel 3 tiene 4 escobas en la fila 10; el nivel 4 tiene ataúdes de 4 celdas en la fila 4.
- [ ] Al llegar el "Tiempo" a 0 se abre el modal de fin de partida sin pulsar FIN.
- [ ] Morir con menos de 5 s restantes abre el modal de fin de partida.
- [ ] Flechas y espacio no hacen scroll de la página mientras se juega.
- [ ] PAUSA congela el juego y el reloj, y REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo.
- [ ] FIN abre el modal con la puntuación real.
- [ ] JUGAR DE NUEVO empieza en nivel 1, "Tiempo 60", score 0 y tumbas vacías.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'frogger'` visible en `/juegos/frogger` y `/salon?juego=frogger`; si falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando igual.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado.
- [ ] SALIR y volver a entrar no duplica input ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal.

## Decisiones

- **Sí:** renombrar `ranaria` → `frogger` en Supabase. Mismo precedente que SPEC 05/07/08/09; evita dos Froggers en la Biblioteca.
- **No:** fila nueva `frogger` junto a `ranaria`. Duplicaría el juego.
- **Sí:** id `frogger` y título `FROGGER`, sin sufijo de tema. El tema es ambientación, no otro juego. (decisión del agente, revisar)
- **Sí:** actualizar también `short` y `long` en el mismo `update`. Los textos de `ranaria` hablan de coches, troncos y nenúfares y contradirían la ambientación. (decisión del agente, revisar)
- **Sí:** mantener `cover-rana`, `ARCADE` y `green`. La portada ya describe un Frogger; una de Halloween va en otra spec. (decisión del agente, revisar)
- **Sí:** reloj global en vez de vidas, con `lives = Math.ceil(timeLeft)` y `secondaryLabel: "Tiempo"`. Patrón Tetris/Snake; no se edita `player.tsx`. Convierte la partida en una carrera contra la noche. (decisión del agente, revisar)
- **No:** 3 vidas con corazones. Es el eje de las variantes A y C.
- **No:** vidas + reloj a la vez. El HUD solo tiene una ranura secundaria; habría que editar `player.tsx`.
- **Sí:** 60 s iniciales, +8 s por tumba, +15 s por nivel, −5 s por muerte, tope 99. Una tumba bien hecha (~6–8 s de cruce) es neutra en tiempo; morir siempre sale caro. (decisión del agente, revisar)
- **Sí:** reloj detenido durante `dead`. La penalización ya son los 5 s; contar también la animación castigaría dos veces. (decisión del agente, revisar)
- **Sí:** puntos multiplicados por nivel y sin bonus por tiempo restante. Premia avanzar de nivel; el tiempo ya se reinvierte como recurso. (decisión del agente, revisar)
- **Sí:** 5 niveles en `levels.ts` y bucle escalado a partir del 6 con tope 2.5×. Separar datos de lógica como Arkanoid (SPEC 08); sin final, el score no tiene techo artificial. (decisión del agente, revisar)
- **Sí:** calaveras que se sumergen desde el nivel 2. Es la mecánica clásica de las tortugas de Frogger y la principal novedad de curva. (decisión del agente, revisar)
- **No:** barra de tiempo en el canvas. El HUD React ya muestra "Tiempo"; duplicarlo sería ruido.
- **Sí:** salto instantáneo e ignorar `e.repeat`. Evita saltos encadenados involuntarios. (decisión del agente, revisar)
- **Sí:** dibujo con primitivas de canvas. No hay prototipo ni assets de Frogger en `references/resources/`.
- **No:** sonido. No hay assets de audio.
- **No:** mosca bonus, cocodrilos y serpiente. Más estado sin cambiar el eje de esta variante.
- **Sí:** flechas + WASD, `P`/`Escape` para pausa.
- **Sí:** rename vía MCP de Supabase ejecutado por el agente, como SPEC 08/09.
- **Sí:** persistencia real vía `saveScore`. Todo juego con motor guarda desde SPEC 07.
- **No:** controles táctiles. Merecen su propia spec.

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                        |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| El `update` de `games.id` falla si hay filas en `scores` con `game_id = 'ranaria'` (FK sin cascade) | El paso 9 comprueba el `count` antes; si no es 0, borrar o migrar esas filas primero.             |
| `/juegos/ranaria` queda en 404 tras el rename                                                       | Aceptado; sin redirección, igual que los renames anteriores.                                      |
| "Tiempo" en la ranura de vidas puede confundir si el HUD muestra corazones                          | `secondaryLabel` sustituye corazones por etiqueta + número, como "Líneas" y "Longitud".           |
| El balance de tiempo deja partidas eternas o imposibles                                             | Valores aislados en constantes (`START_TIME`, `HOME_TIME_BONUS`, …); ajustables sin tocar lógica. |
| Calaveras que se hunden bajo la rana se sienten injustas                                            | Fase `sinking` de 0.5 s visible (alfa 0.5) que aún sostiene, como aviso.                          |
| La rana sobre un ataúd queda desalineada y no encaja en una tumba                                   | Tolerancia de 20 px sobre el centro; al ocuparla se ajusta `x` al centro.                         |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena                          | Riesgo preexistente (BACKLOG #3); frogger puede no salir en la home. No se corrige aquí.          |
| `npm run lint` falla por errores preexistentes en `app/page.tsx`                                    | Riesgo preexistente (BACKLOG #2); el gate exige "sin errores nuevos" si sigue sin resolverse.     |

## Lo que **no** está en esta spec

- Nueva portada de Halloween (`cover-rana` se mantiene).
- Cambios en `components/player.tsx`.
- Sonido.
- Sprites o spritesheet.
- Vidas o modo híbrido vidas + reloj.
- Mosca bonus, rana dama, cocodrilos y serpiente.
- Selección de nivel inicial.
- Animación del salto.
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

Cada uno, si llega, va en su propia spec.
