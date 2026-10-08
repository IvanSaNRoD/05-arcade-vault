# SPEC JAM frogger-B — Frogger contrarreloj de Nochebuena

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-10-08
> **Objective:** Crear desde cero un motor TypeScript + Client Component de Frogger navideño en modo contrarreloj, con reloj global en la ranura "Tiempo" del HUD, tabla de 5 niveles con témpanos que se hunden y carbón en las chimeneas, que sustituye el juego simulado `ranaria` (renombrado a `frogger`) con puntuaciones reales en Supabase.
> **Variante:** B de 3 — difiere de las otras en: sin vidas, un reloj global de 60 s que sube al llegar a una chimenea y baja al morir, con curva de dificultad por tabla de niveles y puntuación con racha.

## Por qué existe esta spec

El catálogo ya tiene `ranaria` (RANARIA, `cover-rana`, ARCADE, green), placeholder temático de Frogger con gameplay simulado. Igual que `rocas` → `asteroids` (SPEC 05), `caida` → `tetris` (SPEC 07), `bloque-buster` → `arkanoid` (SPEC 08) y `serpentina` → `snake` (SPEC 09), se renombra en vez de duplicar. Frogger encaja en Arcade Vault: un solo canvas, teclado, partidas cortas y score comparable. El tema navidad es la ambientación: una rana con gorro rojo cruza una calle nevada con trineos y quitanieves y un río helado sobre troncos de Navidad y témpanos, hasta cinco chimeneas, en una carrera contra el reloj de Nochebuena. Esta variante cambia la progresión: no hay vidas, la partida dura lo que dure el reloj, y la ranura "Vidas" del HUD muestra los segundos restantes vía `secondaryLabel: "Tiempo"`, como Tetris con "Líneas" y Snake con "Longitud". **No existe prototipo vanilla ni assets** en `references/resources/` para Frogger: se escribe desde cero con primitivas de canvas y sin sonido. El registro `lib/games/registry.ts` ya existe.

## Scope

**In:**

- `lib/games/frogger/levels.ts`: `LANES` (10 carriles base) y `LEVELS` (5 niveles), sin estado mutable.
- Motor `lib/games/frogger/engine.ts` (`FroggerEngine`) con estas reglas:
  - Canvas 800×600. Grid de `COLS = 20` × `GRID_ROWS = 13` celdas de `CELL = 40` px desde `GRID_Y = 40`. Franjas superior e inferior de 40 px decorativas (guirnalda y nieve).
  - Filas: 0 = 5 chimeneas (`HOME_COLS = [1, 5, 9, 13, 17]`, 2 celdas de ancho; resto muro), 1–5 = río helado, 6 = mediana nevada, 7–11 = calle nevada, 12 = salida.
  - Carriles base (`LANES`, px/s, + = derecha, longitud en celdas):
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
  - Tabla `LEVELS` (`speedMul`, `sinking`, `coal`):
    - Nivel 1: `1.0`, no, no.
    - Nivel 2: `1.15`, sí, no.
    - Nivel 3: `1.3`, sí, no.
    - Nivel 4: `1.45`, sí, sí.
    - Nivel 5: `1.6`, sí, sí.
    - Nivel 6+: `min(1.6 + 0.1 × (level − 5), 2.5)`, sí, sí.
  - Témpanos que se hunden (`sinking`): en cada carril de témpanos, el objeto de índice 0 cicla `SINK_FLOAT = 3` s flotando, `SINK_WARN = 0.6` s agrietado (parpadea, sigue siendo seguro) y `SINK_UNDER = 1.2` s hundido (no es plataforma).
  - Carbón (`coal`): una chimenea libre aleatoria tiene carbón durante `COAL_ON = 4` s, luego `COAL_OFF = 3` s sin carbón, y se repite en otra chimenea libre. Saltar a la chimenea con carbón → muere.
  - La rana empieza en la fila 12, `x = 380`. Cada pulsación salta exactamente 1 celda; se ignora `e.repeat`.
  - Muerte (vehículo, agua, témpano hundido, salir del canvas, muro, chimenea ocupada o con carbón): `phase = 'dead'` durante `DEATH_PAUSE = 0.6` s, `−TIME_PENALTY = 5` s al reloj (mínimo 0), racha a 0, reaparece en la salida.
  - Reloj global: empieza en `START_TIME = 60` s; `+TIME_BONUS_HOME = 8` s por chimenea ocupada; `+TIME_BONUS_LEVEL = 15` s al ocupar las 5; tope `MAX_TIME = 99` s. No corre durante `'dead'`. Al llegar a 0 → `phase = 'gameover'`.
  - Puntuación: `+10 × level` por fila nueva alcanzada en el trayecto; chimenea `+100 × level + 50 × (racha − 1)` (racha = chimeneas seguidas sin morir, incluida esta); `+500 × level` al ocupar las 5.
  - Nivel: ocupar las 5 chimeneas sube `level` +1, vacía las chimeneas y aplica la fila de `LEVELS` correspondiente.
- Estado emitido por callback: `{ score, lives, level, phase }` con `lives = Math.ceil(timeLeft)`.
- Controles: flechas y WASD saltan; `P`/`Escape` pausa/reanuda. `preventDefault` en flechas y espacio.
- `FroggerEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` vuelve a nivel 1, 60 s, score 0, racha 0, chimeneas vacías.
- `components/games/frogger-game.tsx` (`"use client"`, `forwardRef<FroggerGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx`.
- `lib/games/registry.ts`: añadir `frogger: { component: FroggerGame, secondaryLabel: "Tiempo" }`.
- Paso en Supabase vía MCP de Supabase: `update games set id = 'frogger', title = 'FROGGER', short = …, long = … where id = 'ranaria'`. Si el MCP no está conectado al llegar a este paso, el agente se detiene y pide al usuario que lo active.
- Añadir la fila de `frogger` a `references/implemented-games.md` (tabla y detalle por juego).

**Out of scope (para specs futuras):**

- Nueva portada: `cover-rana` se mantiene; no se toca `app/globals.css`.
- Cambios en `components/player.tsx`.
- Vidas (esta variante no tiene).
- Barra de tiempo dentro del canvas: el reloj vive en el HUD.
- Sonido y sprites PNG (no hay assets).
- Rana bonus, moscas bonus, enemigos en el río (nutrias, serpientes).
- Niveles definidos más allá del 5 con elementos nuevos (del 6 en adelante solo sube la velocidad).
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

## Modelo de datos

```ts
// lib/games/frogger/levels.ts
export type LaneKind = "road" | "river";
export type LaneSprite =
  "trineo" | "quitanieves" | "camion" | "santa" | "tronco" | "tempano";

export interface LaneDef {
  row: number;
  kind: LaneKind;
  sprite: LaneSprite;
  speed: number; // px/s base, + = derecha
  len: number; // celdas
  count: number;
}

export interface LevelDef {
  speedMul: number;
  sinking: boolean;
  coal: boolean;
}

export const LANES: LaneDef[]; // los 10 carriles del Scope
export const LEVELS: LevelDef[]; // 5 entradas del Scope
export function levelDef(level: number): LevelDef; // nivel ≥ 6 → fórmula del Scope
```

```ts
// lib/games/frogger/engine.ts
export const W = 800;
export const H = 600;
export const CELL = 40;
export const COLS = 20;
export const GRID_ROWS = 13;
export const GRID_Y = 40;
export const HOME_COLS = [1, 5, 9, 13, 17];
export const START_ROW = 12;
export const START_X = 380;
export const FROG_INSET = 6;
export const LOOP_W = 1000;
export const DEATH_PAUSE = 0.6; // s
export const START_TIME = 60; // s
export const MAX_TIME = 99;
export const TIME_PENALTY = 5;
export const TIME_BONUS_HOME = 8;
export const TIME_BONUS_LEVEL = 15;
export const SINK_FLOAT = 3;
export const SINK_WARN = 0.6;
export const SINK_UNDER = 1.2;
export const COAL_ON = 4;
export const COAL_OFF = 3;

export type FroggerPhase = "playing" | "dead" | "gameover" | "paused";

export interface FroggerState {
  score: number;
  lives: number; // segundos restantes, Math.ceil(timeLeft) (HUD: "Tiempo")
  level: number;
  phase: FroggerPhase;
}

type Dir = { x: -1 | 0 | 1; y: -1 | 0 | 1 };
type MovingObj = { x: number; w: number; sinks: boolean };

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
-- Sin cambios: category 'ARCADE', cover 'cover-rana', color 'green',
-- best_seed 18900, plays_seed '6.4K' (valores del seed según references/resources/templates/data.jsx).
update games
set id = 'frogger',
    title = 'FROGGER',
    short = 'Nochebuena contrarreloj: cruza la nevada.',
    long = 'Una rana con gorro rojo corre contra el reloj de Nochebuena entre trineos, quitanieves, troncos y témpanos. Cada chimenea suma segundos; cada caída los resta. Cuidado con el hielo que se hunde y el carbón.'
where id = 'ranaria';
```

Convenciones:

- Origen arriba-izquierda. Fila `r` en px: `y = GRID_Y + r * CELL`. Rana con `x` en px (continuo) y `row` entero.
- Salto horizontal `x ± CELL` con clamp a `[0, W − CELL]`; vertical `row ± 1` con clamp a `[0, START_ROW]`.
- Saltos encolados en `pendingHop: Dir | null` desde `keydown`, aplicados en `update()`; descartados fuera de `'playing'`.
- Carriles: avance `speed × speedMul × dt`; envoltura con `LOOP_W` (si `speed > 0` y `x > W` → `x −= LOOP_W`; si `speed < 0` y `x + w < 0` → `x += LOOP_W`). Objeto `i` arranca en `i × LOOP_W / count`.
- Ciclo de hundimiento: un acumulador por carril, en segundos, módulo `SINK_FLOAT + SINK_WARN + SINK_UNDER` (4.8 s).
- Chimenea alcanzada si el centro de la rana está en `[col × CELL, (col + 2) × CELL]`.
- `dt` en segundos, `Math.min(dt, 0.05)`. Los carriles y el ciclo de carbón siguen durante `'dead'`; el reloj no.
- `phase = 'paused'` congela la simulación sin cancelar el frame, igual que el resto de motores.
- Sin barra de tiempo en el canvas: el HUD React muestra "Tiempo".
- Paleta: río `#0b2a4a`, calle `#1c1c2a`, nieve `#e8f4ff`, ladrillo `#7a2e1f`, rana `#00ff88`, gorro `#e0262f`, troncos `#6b3f1d`, témpanos `#bfe9ff` (agrietado: líneas `#5a8fb0`), carbón `#222` con brasas `#ff6a00`.

## Plan de implementación

1. Crear `lib/games/frogger/levels.ts`: tipos `LaneDef`/`LevelDef`, `LANES`, `LEVELS` y `levelDef(level)` con los valores del Scope. Verificar: `npx tsc --noEmit` sin errores nuevos.
2. Crear `lib/games/frogger/engine.ts` (parte 1): constantes, tipos, clase `FroggerEngine` con campos de instancia (`frog { x, row }`, `maxRowReached`, `lanes`, `homes: boolean[5]`, `coalHome: number | null`, `coalTimer`, `sinkTimer`, `timeLeft`, `streak`, `score`, `level`, `state`, `paused`, `deathTimer`, `pendingHop`, `rafId`, `lastTime`), constructor que obtiene el contexto 2D (lanza si es null) y llama a `reset()`. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. `engine.ts` (parte 2): `update(dt)` — carriles, ciclo de hundimiento, ciclo de carbón, `deathTimer`, reloj global (0 → `gameover`), `pendingHop` (+10 × level por fila nueva), colisiones de calle, río (incluido témpano hundido), salida lateral, meta (libre: +100 × level + 50 × (racha − 1) y +8 s; muro/ocupada/carbón: muerte con −5 s), 5 chimeneas → +500 × level, +15 s, `level++`, `levelDef`. Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `engine.ts` (parte 3): `draw()` — guirnalda, chimeneas (ocupadas, con carbón), río, troncos, témpanos (agrietados parpadeando, hundidos como sombra), mediana, calle, vehículos, salida, rana con gorro (aplastada en `'dead'`), nieve decorativa. Sin score/tiempo/nivel en el canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
5. `engine.ts` (parte 4): loop e input. `start()` idempotente; `keydown` en `window` como arrow class field (flechas + WASD encolan salto si `!e.repeat`; `P`/`Escape` alternan pausa; `preventDefault` en flechas/espacio). Loop: `if (!paused) update(dt)`, siempre `draw()` y `emitState()` con `lives = Math.ceil(timeLeft)`. Añadir `pause`, `resume`, `forceGameOver`, `restart` y `destroy`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
6. Crear `components/games/frogger-game.tsx`, espejo de `asteroids-game.tsx`: callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
7. Añadir `frogger: { component: FroggerGame, secondaryLabel: "Tiempo" }` a `GAME_ENGINES` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores.
8. Supabase vía MCP. **Precondición:** si el MCP de Supabase no está conectado/disponible al llegar aquí, el agente **se detiene y pide al usuario que lo active**, sin continuar ni caer a un paso manual. Con MCP: comprobar que `select count(*) from scores where game_id = 'ranaria'` devuelve 0 (la FK `scores.game_id` no tiene `on update cascade`); ejecutar el `update` del Modelo de datos. Verificar: `select id, title, cover, color from games where id = 'frogger'` devuelve `frogger | FROGGER | cover-rana | green`.
9. Añadir `frogger` a `references/implemented-games.md`: fila en la tabla Catalog (`ARCADE`, `green`, `cover-rana`, seeds, `Tiempo`, spec final) y bloque "Per-game details"; quitar `ranaria` de la nota de placeholders. Verificar: el archivo lista 5 juegos jugables y 3 placeholders.
10. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/juegos` muestra la card "FROGGER" con `cover-rana` y ya no muestra "RANARIA".
- [ ] `/juegos/frogger` carga mostrando "Mejor global" y "Partidas".
- [ ] `/juegos/frogger/jugar` renderiza el canvas con calle nevada, río helado y 5 chimeneas, no el `.game-arena` simulado.
- [ ] El HUD muestra "Tiempo" con número (no corazones), empieza en 60 y baja 1 por segundo.
- [ ] Cada pulsación de flecha o WASD mueve la rana exactamente una celda; mantener la tecla no encadena saltos.
- [ ] En nivel 1, avanzar a una fila nueva suma exactamente 10 puntos; en nivel 2, 20.
- [ ] Morir resta exactamente 5 s al reloj y la rana reaparece en la salida tras ~0.6 s.
- [ ] La primera chimenea en nivel 1 suma 100 puntos y 8 s; la segunda seguida sin morir suma 150.
- [ ] Ocupar las 5 chimeneas en nivel 1 suma 500 y 15 s además de lo que da la 5ª chimenea y el HUD pasa a Nivel 02.
- [ ] El reloj nunca supera 99.
- [ ] En nivel 1 ningún témpano se hunde; desde nivel 2 un témpano por carril parpadea y se hunde, y estar sobre él al hundirse mata.
- [ ] Desde nivel 4 aparece carbón en una chimenea; saltar a ella mata y resta 5 s.
- [ ] Con el reloj a 0 se abre el modal de fin de partida sin pulsar FIN.
- [ ] Flechas y espacio no hacen scroll de la página mientras se juega.
- [ ] PAUSA congela el juego y el reloj; REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo.
- [ ] FIN abre el modal con la puntuación real.
- [ ] JUGAR DE NUEVO empieza en nivel 1, 60 s, score 0 y chimeneas vacías.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'frogger'` visible en `/juegos/frogger` y `/salon?juego=frogger`; si falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando igual.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado.
- [ ] SALIR y volver a entrar no duplica input ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal.

## Decisiones

- **Sí:** renombrar `ranaria` → `frogger` en Supabase. Mismo precedente que SPEC 05/07/08/09; evita dos Froggers.
- **No:** fila nueva `frogger` junto a `ranaria`. Duplicaría el juego.
- **Sí:** mantener `cover-rana`, `ARCADE`, `green` y seeds. La portada ya dibuja carriles y una rana. (decisión del agente, revisar)
- **Sí:** reescribir `short` y `long` con texto navideño y contrarreloj. El texto actual (coches, nenúfares, sin reloj global) dejaría de describir el juego. (decisión del agente, revisar)
- **Sí:** `id = 'frogger'`, `title = 'FROGGER'`. El tema es ambientación. (decisión del agente, revisar)
- **Sí:** reloj global en `lives` con `secondaryLabel: "Tiempo"`. Patrón Tetris/Snake; no se edita `player.tsx` y el tiempo, central en esta variante, queda en el HUD. (decisión del agente, revisar)
- **No:** 3 vidas además del reloj. Dos recursos de fallo compiten y el HUD solo tiene una ranura secundaria.
- **No:** temporizador por rana. El reloj global lo sustituye y premia la eficiencia de toda la partida.
- **Sí:** 60 s iniciales, +8 s por chimenea, +15 s por nivel, −5 s por muerte, tope 99. Una partida sin errores se alarga; una partida torpe dura ~1 min. Valores a ajustar tras jugar. (decisión del agente, revisar)
- **Sí:** tabla `LEVELS` explícita de 5 niveles en `levels.ts`. Hace visible la curva de dificultad y es editable sin tocar el motor. (decisión del agente, revisar)
- **Sí:** témpanos que se hunden desde nivel 2 y carbón desde nivel 4. Equivalen a las tortugas que bucean y al cocodrilo en la meta del original, con ambientación navideña. (decisión del agente, revisar)
- **Sí:** puntuación escalada por nivel y bonus de racha. Premia jugar limpio a alta velocidad. (decisión del agente, revisar)
- **Sí:** el reloj no corre durante `'dead'`. La penalización ya es de 5 s; descontar también la animación sería doble castigo.
- **Sí:** reloj a 0 → `gameover` directo, sin `'dead'`. No hay reaparición posible.
- **Sí:** ignorar `e.repeat` y encolar saltos en `pendingHop`. Un salto por pulsación; colisiones en un único sitio.
- **Sí:** persistencia real vía `saveScore`. Todo juego con motor guarda desde SPEC 07.
- **No:** sonido ni sprites PNG. No hay assets de Frogger en `references/resources/`.
- **No:** controles táctiles. Merecen su propia spec.

## Riesgos

| Riesgo                                                                                                        | Mitigación                                                                            |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| El `update` de `games.id` falla si hay filas en `scores` con `game_id = 'ranaria'` (FK sin cascade)           | El paso 8 comprueba el `count` antes; si no es 0, borrar o migrar esas filas primero. |
| `/juegos/ranaria` queda en 404 tras el rename                                                                 | Aceptado; sin redirección, igual que los renames anteriores.                          |
| Existe otra variante temática de Frogger (`specs/game-jam/frogger-halloween/`) que también renombra `ranaria` | Solo se puede adoptar una; la segunda necesitaría fila nueva y portada propia.        |
| `player.tsx` arranca con `lives = 3` y muestra "Tiempo 3" un frame antes del primer `emitState`               | El motor emite en el primer frame; efecto imperceptible (igual que Tetris).           |
| Con racha y bonus de tiempo, un jugador experto podría alargar la partida indefinidamente                     | Tope `MAX_TIME = 99` y velocidad creciente hasta ×2.5 acotan la duración.             |
| Un témpano se hunde justo cuando la rana aterriza y se percibe injusto                                        | Fase de aviso `SINK_WARN = 0.6` s con parpadeo, en la que el témpano aún es seguro.   |
| Los seeds reales de `ranaria` en Supabase difieren de `data.jsx`                                              | El `update` no toca seeds; la verificación del paso 8 no los comprueba.               |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena                                    | Riesgo preexistente; frogger puede no salir en la home. No se corrige aquí.           |

## Lo que **no** está en esta spec

- Nueva portada para frogger (`cover-rana` se mantiene).
- Cambios en `components/player.tsx`.
- Vidas y barra de tiempo en el canvas.
- Sonido y sprites PNG.
- Rana bonus, moscas bonus, enemigos en el río.
- Elementos nuevos más allá del nivel 5.
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

Cada uno, si llega, va en su propia spec.
