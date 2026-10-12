# SPEC JAM frogger-C — Frogger navideño con bolas de nieve

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 09
> **Date:** 2026-10-08
> **Objective:** Crear desde cero un motor TypeScript + Client Component de Frogger navideño en el que la rana lanza bolas de nieve que congelan carriles, que sustituye el juego simulado `ranaria` (renombrado a `frogger`) con 3 vidas y puntuaciones reales en Supabase, añadiendo una entrada al registro de motores.
> **Variante:** C de 3 — difiere de las otras en: añade una mecánica nueva del tema (bolas de nieve con munición limitada que congelan un carril 2.5 s), que convierte el cruce en una decisión táctica.

## Por qué existe esta spec

El catálogo ya tiene `ranaria` (RANARIA, `cover-rana`, ARCADE, green), placeholder temático de Frogger con gameplay simulado. Igual que `rocas` → `asteroids` (SPEC 05), `caida` → `tetris` (SPEC 07), `bloque-buster` → `arkanoid` (SPEC 08) y `serpentina` → `snake` (SPEC 09), se renombra en vez de duplicar. Frogger encaja en Arcade Vault: un solo canvas, teclado, partidas cortas y score comparable. El tema navidad aporta la ambientación (rana con gorro rojo, calle nevada con trineos y quitanieves, río helado con troncos de Navidad y témpanos, cinco chimeneas como meta) y el twist: la rana lanza bolas de nieve hacia arriba que congelan el primer carril que golpean. Congelar un carril de calle abre un hueco; congelar uno de río detiene el arrastre. La munición es escasa y la que sobra puntúa al acabar el nivel, así que cada lanzamiento es una apuesta. **No existe prototipo vanilla ni assets** en `references/resources/` para Frogger: se escribe desde cero con primitivas de canvas y sin sonido. Frogger tiene vidas (3), así que mapea a la ranura "Vidas" con corazones, sin `secondaryLabel`. El registro `lib/games/registry.ts` ya existe.

## Scope

**In:**

- Motor `lib/games/frogger/engine.ts` (`FroggerEngine`) con estas reglas:
  - Canvas 800×600. Grid de `COLS = 20` × `GRID_ROWS = 13` celdas de `CELL = 40` px desde `GRID_Y = 40`. Franja superior (0–40 px) decorativa; franja inferior (560–600 px) con barra de tiempo e iconos de munición.
  - Filas: 0 = 5 chimeneas (`HOME_COLS = [1, 5, 9, 13, 17]`, 2 celdas de ancho; resto muro), 1–5 = río helado, 6 = mediana nevada, 7–11 = calle nevada, 12 = salida.
  - Carriles fijos `LANES` (px/s, + = derecha, longitud en celdas):
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
  - La rana empieza en la fila 12, `x = 380`. Cada pulsación salta exactamente 1 celda; se ignora `e.repeat`.
  - Calle: hitbox de la rana (inset `FROG_INSET = 6` px) solapando un vehículo → muere. Río: centro de la rana fuera de toda plataforma → muere; sobre plataforma se desplaza con ella; centro fuera del canvas → muere. Meta: chimenea libre → la ocupa; muro o chimenea ocupada → muere.
  - Tiempo: `TIME_PER_FROG = 30` s por rana; 0 → muere.
  - Vidas: `INITIAL_LIVES = 3`. Al morir: `phase = 'dead'` durante `DEATH_PAUSE = 1` s, luego reaparece o, con `lives = 0`, `phase = 'gameover'`.
  - **Bolas de nieve (twist):**
    - `Espacio` lanza una bola si `snowballs > 0`, no hay otra en vuelo y `phase = 'playing'`. Sale del centro de la rana hacia arriba a `SNOWBALL_SPEED = 600` px/s.
    - En cada frame se calcula la fila de la bola; si es un carril (1–5 o 7–11) y algún objeto del carril contiene la `x` de la bola, ese carril queda congelado `FREEZE_TIME = 2.5` s y la bola desaparece. Cruza la mediana sin efecto y desaparece al llegar a la fila 0.
    - Carril congelado: sus objetos no se mueven. Los vehículos congelados siguen matando; las plataformas congeladas siguen siendo plataformas (la rana no se desplaza sobre ellas). Congelar un carril ya congelado reinicia su tiempo a 2.5 s.
    - Munición: `SNOWBALLS_START = 3` al empezar la partida; `+1` por chimenea ocupada; máximo `MAX_SNOWBALLS = 5`; morir no la reduce. Al empezar cada nivel: `snowballs = max(snowballs, 3)`.
  - Puntuación: `+10` por fila nueva alcanzada en el trayecto; `+50 + 10 × floor(tiempo restante)` por chimenea; al ocupar las 5: `+1000 + 100 × snowballs` (bolas sin usar tras sumar la de la 5ª chimenea, antes de la recarga del nivel siguiente).
  - Nivel: ocupar las 5 chimeneas sube `level` +1, vacía las chimeneas, descongela todos los carriles y aplica `speedMul = min(1 + 0.15 × (level − 1), 2.5)`.
- Estado emitido por callback: `{ score, lives, level, phase }`.
- Controles: flechas y WASD saltan; `Espacio` lanza bola de nieve; `P`/`Escape` pausa/reanuda. `preventDefault` en flechas y espacio.
- `FroggerEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` vuelve a nivel 1, 3 vidas, 3 bolas, score 0, chimeneas vacías, sin carriles congelados.
- `components/games/frogger-game.tsx` (`"use client"`, `forwardRef<FroggerGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx`.
- `lib/games/registry.ts`: añadir `frogger: { component: FroggerGame }` (sin `secondaryLabel`: tiene vidas → corazones).
- Paso en Supabase vía MCP de Supabase: `update games set id = 'frogger', title = 'FROGGER', short = …, long = … where id = 'ranaria'`. Si el MCP no está conectado al llegar a este paso, el agente se detiene y pide al usuario que lo active.
- Añadir la fila de `frogger` a `references/implemented-games.md` (tabla y detalle por juego).

**Out of scope (para specs futuras):**

- Nueva portada: `cover-rana` se mantiene; no se toca `app/globals.css`.
- Cambios en `components/player.tsx` (la munición no va al HUD React).
- Lanzar en otras direcciones que no sean hacia arriba.
- Recoger bolas de nieve del suelo o power-ups.
- Témpanos que se hunden, peligros en la meta, rana y moscas bonus.
- Sonido y sprites PNG (no hay assets).
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

## Modelo de datos

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
export const TIME_PER_FROG = 30; // s
export const DEATH_PAUSE = 1; // s
export const INITIAL_LIVES = 3;
export const SPEED_STEP = 0.15;
export const MAX_SPEED_MUL = 2.5;
export const LOOP_W = 1000;
export const SNOWBALL_SPEED = 600; // px/s
export const SNOWBALL_R = 6; // px, radio
export const FREEZE_TIME = 2.5; // s
export const SNOWBALLS_START = 3;
export const MAX_SNOWBALLS = 5;
export const SNOWBALL_BONUS = 100;

export type LaneKind = "road" | "river";
export type LaneSprite =
  "trineo" | "quitanieves" | "camion" | "santa" | "tronco" | "tempano";

interface LaneDef {
  row: number;
  kind: LaneKind;
  sprite: LaneSprite;
  speed: number;
  len: number;
  count: number;
}

export const LANES: LaneDef[]; // los 10 carriles del Scope

export type FroggerPhase = "playing" | "dead" | "gameover" | "paused";

export interface FroggerState {
  score: number;
  lives: number;
  level: number;
  phase: FroggerPhase;
}

type Dir = { x: -1 | 0 | 1; y: -1 | 0 | 1 };
type MovingObj = { x: number; w: number };
type Lane = { def: LaneDef; objs: MovingObj[]; frozen: number }; // frozen = s restantes
type Snowball = { x: number; y: number } | null;

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
    short = 'Congela el tráfico de Nochebuena a bolazos.',
    long = 'Una rana con gorro rojo cruza la calle nevada y el río helado hasta las cinco chimeneas. Lanza bolas de nieve para congelar trineos y troncos unos segundos, pero guárdalas: las que te sobren puntúan al final de cada nivel.'
where id = 'ranaria';
```

Convenciones:

- Origen arriba-izquierda. Fila `r` en px: `y = GRID_Y + r * CELL`; fila de la bola: `floor((y − GRID_Y) / CELL)`. Rana con `x` en px (continuo) y `row` entero.
- Salto horizontal `x ± CELL` con clamp a `[0, W − CELL]`; vertical `row ± 1` con clamp a `[0, START_ROW]`.
- Saltos encolados en `pendingHop: Dir | null` y lanzamiento en `pendingThrow: boolean`, ambos desde `keydown` y aplicados en `update()`; descartados fuera de `'playing'`.
- Carriles: si `lane.frozen > 0` se descuenta `dt` y los objetos no avanzan; si no, avance `speed × speedMul × dt` con envoltura `LOOP_W`. Objeto `i` arranca en `i × LOOP_W / count`.
- `dt` en segundos, `Math.min(dt, 0.05)`. Los carriles siguen durante `'dead'`; el tiempo de la rana no corre y la bola en vuelo desaparece al morir.
- `phase = 'paused'` congela la simulación sin cancelar el frame, igual que el resto de motores.
- Barra de tiempo e iconos de munición (círculos blancos de radio 8 px) en la franja inferior: son elementos de juego, no HUD; score, vidas y nivel solo en el HUD React.
- Paleta: río `#0b2a4a`, calle `#1c1c2a`, nieve `#e8f4ff`, ladrillo `#7a2e1f`, rana `#00ff88`, gorro `#e0262f`, troncos `#6b3f1d`, témpanos `#bfe9ff`, bola `#ffffff`, escarcha de carril congelado `rgba(159, 216, 255, 0.35)`.

## Plan de implementación

1. Crear `lib/games/frogger/engine.ts` (parte 1): constantes, `LANES`, tipos, clase `FroggerEngine` con campos de instancia (`frog { x, row }`, `maxRowReached`, `lanes: Lane[]`, `homes: boolean[5]`, `snowball: Snowball`, `snowballs`, `timeLeft`, `lives`, `score`, `level`, `state`, `paused`, `deathTimer`, `pendingHop`, `pendingThrow`, `rafId`, `lastTime`), constructor que obtiene el contexto 2D (lanza si es null) y llama a `reset()`. Verificar: `npx tsc --noEmit` sin errores nuevos.
2. `engine.ts` (parte 2a): `update(dt)` base — carriles con `frozen`, `deathTimer`, `pendingHop` (+10 por fila nueva), tiempo, colisiones de calle, río, salida lateral, meta (+50 + 10 × tiempo, +1 bola con tope 5), 5 chimeneas → +1000 + 100 × bolas, `level++`, descongelar, `snowballs = max(snowballs, 3)`. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. `engine.ts` (parte 2b): bolas de nieve — `pendingThrow` crea la bola si hay munición y no hay otra en vuelo (`snowballs--`); avance a 600 px/s; detección por fila contra los objetos del carril; congelar 2.5 s; desaparecer en la fila 0 o al morir. Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `engine.ts` (parte 3): `draw()` — guirnalda, chimeneas, río, plataformas, mediana, calle, vehículos, escarcha sobre carriles congelados, bola en vuelo, salida, rana con gorro (aplastada en `'dead'`), barra de tiempo e iconos de munición. Sin score/vidas/nivel en el canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
5. `engine.ts` (parte 4): loop e input. `start()` idempotente; `keydown` en `window` como arrow class field (flechas + WASD encolan salto si `!e.repeat`; `Espacio` marca `pendingThrow` si `!e.repeat`; `P`/`Escape` alternan pausa; `preventDefault` en flechas/espacio). Loop: `if (!paused) update(dt)`, siempre `draw()` y `emitState()`. Añadir `pause`, `resume`, `forceGameOver`, `restart` y `destroy`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
6. Crear `components/games/frogger-game.tsx`, espejo de `asteroids-game.tsx`: callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
7. Añadir `frogger: { component: FroggerGame }` a `GAME_ENGINES` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores.
8. Supabase vía MCP. **Precondición:** si el MCP de Supabase no está conectado/disponible al llegar aquí, el agente **se detiene y pide al usuario que lo active**, sin continuar ni caer a un paso manual. Con MCP: comprobar que `select count(*) from scores where game_id = 'ranaria'` devuelve 0 (la FK `scores.game_id` no tiene `on update cascade`); ejecutar el `update` del Modelo de datos. Verificar: `select id, title, cover, color from games where id = 'frogger'` devuelve `frogger | FROGGER | cover-rana | green`.
9. Añadir `frogger` a `references/implemented-games.md`: fila en la tabla Catalog (`ARCADE`, `green`, `cover-rana`, seeds, `— (lives / hearts)`, spec final) y bloque "Per-game details"; quitar `ranaria` de la nota de placeholders. Verificar: el archivo lista 5 juegos jugables y 3 placeholders.
10. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/juegos` muestra la card "FROGGER" con `cover-rana` y ya no muestra "RANARIA".
- [ ] `/juegos/frogger` carga mostrando "Mejor global" y "Partidas".
- [ ] `/juegos/frogger/jugar` renderiza el canvas con calle nevada, río helado, 5 chimeneas y 3 iconos de munición, no el `.game-arena` simulado.
- [ ] El HUD muestra "Vidas" con 3 corazones, nivel 01 y score 0.
- [ ] Cada pulsación de flecha o WASD mueve la rana exactamente una celda; mantener la tecla no encadena saltos.
- [ ] Avanzar a una fila nueva suma exactamente 10 puntos; retroceder y volver no suma.
- [ ] `Espacio` lanza una bola hacia arriba y resta un icono de munición; con 0 bolas no lanza nada.
- [ ] Una bola que alcanza un vehículo detiene todo su carril durante 2.5 s, con escarcha visible; después el carril vuelve a moverse.
- [ ] Tocar un vehículo congelado quita una vida.
- [ ] Sobre un tronco congelado la rana no se desplaza.
- [ ] Una bola que no golpea nada desaparece al llegar a la fila de chimeneas.
- [ ] Ocupar una chimenea con 20 s restantes suma exactamente 250 puntos y +1 bola (sin pasar de 5).
- [ ] Si tras ocupar la 5ª chimenea (y recibir su bola) quedan 2 bolas, el bonus de nivel suma exactamente 1200 además de los puntos de esa chimenea, el HUD pasa a Nivel 02 y la munición queda en 3.
- [ ] Vehículos, agua, muro, chimenea ocupada y tiempo agotado quitan una vida; con 0 vidas se abre el modal de fin de partida sin pulsar FIN.
- [ ] Flechas y espacio no hacen scroll de la página mientras se juega.
- [ ] PAUSA congela el juego (incluida la bola y los carriles congelados) y REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo.
- [ ] FIN abre el modal con la puntuación real.
- [ ] JUGAR DE NUEVO empieza en nivel 1, 3 vidas, 3 bolas, score 0 y chimeneas vacías.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'frogger'` visible en `/juegos/frogger` y `/salon?juego=frogger`; si falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` siguen funcionando igual.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado.
- [ ] SALIR y volver a entrar no duplica input ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal.

## Decisiones

- **Sí:** renombrar `ranaria` → `frogger` en Supabase. Mismo precedente que SPEC 05/07/08/09; evita dos Froggers.
- **No:** fila nueva `frogger` junto a `ranaria`. Duplicaría el juego.
- **Sí:** mantener `cover-rana`, `ARCADE`, `green` y seeds. La portada ya dibuja carriles y una rana. (decisión del agente, revisar)
- **Sí:** reescribir `short` y `long` mencionando las bolas de nieve. El texto actual no describe la mecánica principal de esta variante. (decisión del agente, revisar)
- **Sí:** `id = 'frogger'`, `title = 'FROGGER'`. El tema es ambientación; el juego sigue siendo Frogger. (decisión del agente, revisar)
- **Sí:** twist de bolas de nieve que congelan un carril entero. Sale del tema navidad/invierno y cambia la forma de jugar (abrir huecos, frenar el arrastre) sin salir del contrato del motor. (decisión del agente, revisar)
- **No:** congelar solo el vehículo golpeado. Los demás del carril lo atravesarían o chocarían; congelar el carril es más simple y legible.
- **Sí:** vehículos congelados siguen siendo letales. Congelar abre tiempo, no camino libre; mantiene la tensión. (decisión del agente, revisar)
- **Sí:** lanzar solo hacia arriba, una bola en vuelo a la vez, 600 px/s. Un único control nuevo (`Espacio`) y una sola entidad extra. (decisión del agente, revisar)
- **Sí:** munición 3 inicial, +1 por chimenea, tope 5, y bonus de 100 por bola sin usar al cerrar el nivel. Crea la tensión usar/guardar que da profundidad al twist. (decisión del agente, revisar)
- **Sí:** munición dibujada en la franja inferior del canvas. El HUD React solo tiene score, vidas y nivel; ampliarlo exigiría editar `player.tsx`.
- **No:** munición en `lives` con `secondaryLabel`. Se perderían las vidas, que esta variante conserva.
- **Sí:** resto de reglas clásicas (3 vidas, 30 s por rana, puntuación y velocidad de la variante clásica). Aísla el twist como única diferencia de diseño.
- **Sí:** ignorar `e.repeat` en saltos y lanzamientos; encolar en `pendingHop`/`pendingThrow`. Un efecto por pulsación; lógica en `update()`.
- **Sí:** persistencia real vía `saveScore`. Todo juego con motor guarda desde SPEC 07.
- **No:** sonido ni sprites PNG. No hay assets de Frogger en `references/resources/`.
- **No:** controles táctiles. Merecen su propia spec.

## Riesgos

| Riesgo                                                                                                        | Mitigación                                                                              |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| El `update` de `games.id` falla si hay filas en `scores` con `game_id = 'ranaria'` (FK sin cascade)           | El paso 8 comprueba el `count` antes; si no es 0, borrar o migrar esas filas primero.   |
| `/juegos/ranaria` queda en 404 tras el rename                                                                 | Aceptado; sin redirección, igual que los renames anteriores.                            |
| Existe otra variante temática de Frogger (`specs/game-jam/frogger-halloween/`) que también renombra `ranaria` | Solo se puede adoptar una; la segunda necesitaría fila nueva y portada propia.          |
| Congelar carriles trivializa el juego                                                                         | Munición limitada (tope 5), vehículos congelados letales y bonus por no usar las bolas. |
| `Espacio` también activa botones enfocados de la página                                                       | `preventDefault` en espacio dentro del handler del motor, como el resto de motores.     |
| La bola cruza un carril en 1 frame a dt alto y no detecta el objeto                                           | Con `dt ≤ 0.05` avanza ≤ 30 px por frame, menos que `CELL = 40`; ninguna fila se salta. |
| Los seeds reales de `ranaria` en Supabase difieren de `data.jsx`                                              | El `update` no toca seeds; la verificación del paso 8 no los comprueba.                 |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena                                    | Riesgo preexistente; frogger puede no salir en la home. No se corrige aquí.             |

## Lo que **no** está en esta spec

- Nueva portada para frogger (`cover-rana` se mantiene).
- Cambios en `components/player.tsx`.
- Lanzamientos en otras direcciones, recogida de bolas o power-ups.
- Témpanos que se hunden, peligros en la meta, rana y moscas bonus.
- Sonido y sprites PNG.
- Controles táctiles.
- Redirección desde `/juegos/ranaria`.

Cada uno, si llega, va en su propia spec.
