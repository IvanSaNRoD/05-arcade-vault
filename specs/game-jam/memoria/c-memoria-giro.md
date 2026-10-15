# SPEC JAM memoria-C — Memoria "Giro": los paneles rotan antes de tu turno, en Next.js

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 09, SPEC 13
> **Date:** 2026-10-15
> **Objective:** Crear desde cero un motor TypeScript + Client Component de MEMORIA (Simon de 4 paneles) en el que, a partir del nivel 2, la cruz de paneles gira tras la reproducción y el jugador debe pulsar la posición donde ha quedado cada color, con bonus de tiempo que desempata el leaderboard, como fila nueva `memoria` con puntuaciones reales en Supabase.
> **Variante:** C de 3 — difiere de las otras en: mecánica nueva de rotación de paneles (memorizar colores, no posiciones) y score con bonus por giro y por tiempo de ronda.

## Por qué existe esta spec

El catálogo no tiene juego de memoria y solo un PUZZLE jugable (Tetris). Un Simon encaja en el contrato del motor, pero su versión clásica es una prueba de memoria de posiciones con empates en el leaderboard. El twist sale del propio juego: el Simon asocia color, tono y posición; aquí se **separa el color de la posición**. Tras la reproducción, la cruz de paneles gira 90°, 180° o 270° y el jugador debe seguir los colores hasta sus nuevas posiciones y pulsar las flechas que ahora les corresponden. Cambia cómo se juega (memoria + rastreo espacial) sin salir del contrato: canvas 800×600, cuatro teclas, `restart()` trivial. El score añade un bonus por cada cuarto de giro superado y un bonus por rapidez de la ronda, lo que rompe los empates. Ningún placeholder de SPEC 06 (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) es un juego de memoria: **modo fila nueva** (`insert` + `.cover-memoria`). **No hay prototipo ni assets** en `references/resources/` para Simon: todo con primitivas de canvas, sin sonido. Sin vidas: la ranura "Vidas" muestra la longitud de la secuencia vía `secondaryLabel: "Secuencia"`.

## Scope

**In:**

- Motor `lib/games/memoria/engine.ts` (`MemoriaEngine`) con estas reglas:
  - Canvas 800×600. Cuatro posiciones en cruz sobre un círculo de radio `RING_R = 150` alrededor de `(400, 300)`: arriba `(400, 150)`, derecha `(550, 300)`, abajo `(400, 450)`, izquierda `(250, 300)`. Cada posición la activa su flecha.
  - Cuatro paneles de color de `PAD_SIZE = 140` px (radio `PAD_RADIUS = 18`): cian, magenta, amarillo, verde. Disposición de inicio de cada ronda: cian arriba, magenta derecha, amarillo abajo, verde izquierda.
  - Cada panel lleva un símbolo blanco propio que **viaja con el panel**: cian círculo, magenta cuadrado, amarillo triángulo, verde rombo. Permite seguir el panel sin depender del color.
  - Marcadores fijos de posición (no giran): chevrons `#8a8aa0` de 16 px fuera de la cruz en `(400, 60)` ▲, `(640, 300)` ▶, `(400, 540)` ▼, `(160, 300)` ◀.
  - La secuencia guarda **colores**. Empieza con 1 color aleatorio; cada ronda superada añade 1 al final.
  - Ronda: espera `ROUND_DELAY_MS = 800` (la cruz vuelve a la disposición de inicio al empezarla) → reproducción (`flashMs` encendido, `GAP_MS = 150` apagado) → giro (si toca) → turno del jugador.
  - Niveles: `level = floor(rondasCompletadas / ROUNDS_PER_LEVEL) + 1` con `ROUNDS_PER_LEVEL = 3`, recalculado al empezar cada ronda. `flashMs = max(MIN_FLASH_MS, BASE_FLASH_MS − (level − 1) × FLASH_STEP_MS)` con `BASE_FLASH_MS = 420`, `FLASH_STEP_MS = 40`, `MIN_FLASH_MS = 200`.
  - Giro tras la reproducción (`turns` = cuartos de vuelta):
    - Nivel 1: sin giro (`turns = 0`).
    - Nivel 2: `turns = 1`, horario.
    - Nivel 3: `turns` aleatorio entre 1 y 3, horario.
    - Nivel 4+: `turns` aleatorio entre 1 y 3, sentido aleatorio (horario o antihorario).
    - Cada cuarto de vuelta se anima en `ROTATE_MS = 350` con easing `easeInOutQuad`, con `ROTATE_PAUSE_MS = 120` entre cuartos. Los paneles se desplazan por el círculo `RING_R`; no rotan sobre sí mismos (el símbolo sigue derecho).
  - Turno del jugador: la flecha pulsa la **posición**; es correcta si el color que hay ahora en esa posición es el siguiente de la secuencia. Cada pulsación ilumina el panel de esa posición `PRESS_MS = 180`.
  - Pulsar mal o no pulsar en `INPUT_TIMEOUT_MS = 4000` desde el inicio del turno o la última pulsación → fallo: el panel correcto (en su posición actual) parpadea 3 veces durante `FAIL_MS = 900` y después `phase = 'gameover'`.
- Indicador central (círculo de radio `CENTER_R = 56` en `(400, 300)`): `MIRA` (espera/reproducción), `GIRA` + `↻`/`↺` según el sentido (giro), `TÚ` (turno), `✕` en `#ff3b3b` (fallo).
- Puntuación (desempate por tiempo):
  - Pulsación correcta: `+10 × level`.
  - Ronda completada: `+50 × level × (1 + turns)`.
  - Bonus de tiempo al completar la ronda: `max(0, floor((n × ALLOWANCE_MS − inputMs) / 20))`, con `ALLOWANCE_MS = 1000`, `n` = longitud de la secuencia e `inputMs` = ms desde el inicio del turno hasta la última pulsación. Rango: 0 a `50 × n`.
- Estado emitido por callback: `{ score, lives, level, phase }`, con `lives = longitud de la secuencia actual`.
- Controles: `↑`/`W`, `→`/`D`, `↓`/`S`, `←`/`A` pulsan la posición de esa dirección; `P`/`Escape` pausa/reanuda. Se ignoran pulsaciones durante espera, reproducción, giro y fallo, y las autorrepeticiones (`e.repeat`). `preventDefault` en flechas y espacio.
- `MemoriaEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` vuelve a nivel 1, score 0, disposición de inicio y una secuencia nueva de 1 color.
- `components/games/memoria-game.tsx` (`"use client"`, `forwardRef<MemoriaGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx` sin `setSkin`.
- `lib/games/registry.ts`: añadir `memoria: { component: MemoriaGame, secondaryLabel: "Secuencia" }`.
- Portada `.cover-memoria` en `app/globals.css` (`@layer components`, junto a `.cover-duelo`): fondo `radial-gradient(circle at 50% 50%, #00202a, #0a0a18)`; `::after` con cuatro cuadrados en cruz (`linear-gradient` sólidos de 18% × 24% en `50% 14%`, `82% 50%`, `50% 86%`, `18% 50%`): cian encendido `var(--cyan)` y los otros atenuados (`#40001c`, `#3d4000`, `#004022`); `filter: drop-shadow(0 0 8px rgba(0,245,255,0.5))`; `::before` con el glifo `↻` centrado en `var(--ink)`, 22px.
- Paso en Supabase vía MCP de Supabase: `insert` de la fila `memoria`. Si el MCP no está conectado, el agente se detiene y pide al usuario que lo active.
- Añadir la fila `memoria` a `references/implemented-games.md`.

**Out of scope (para specs futuras):**

- Sonido (no hay assets de audio y el juego se construye desde cero sin sonido).
- Vidas o segundas oportunidades.
- Otros twists: espejo (intercambio de posiciones opuestas), secuencia inversa, quinto panel.
- Rotación durante la reproducción o paneles que giran sobre sí mismos.
- Ratón, clic en paneles y controles táctiles (`touchControls`).
- Skins (`setSkin`): las cubre `skin-designer`.
- Cambios en `components/player.tsx`.

## Modelo de datos

```ts
// lib/games/memoria/engine.ts
export const W = 800;
export const H = 600;
export const CX = 400;
export const CY = 300;
export const RING_R = 150;
export const PAD_SIZE = 140;
export const PAD_RADIUS = 18;
export const CENTER_R = 56;
// Posiciones (índice = tecla): 0 arriba, 1 derecha, 2 abajo, 3 izquierda.
// Ángulo de la posición p: -90° + p × 90°.
export const PAD_LIT = ["#00f5ff", "#ff006e", "#f5ff00", "#00ff88"] as const; // por color
export const PAD_DIM = ["#003d40", "#40001c", "#3d4000", "#004022"] as const;
export const PAD_SYMBOL = ["circle", "square", "triangle", "diamond"] as const;
export const ROUND_DELAY_MS = 800;
export const BASE_FLASH_MS = 420;
export const FLASH_STEP_MS = 40;
export const MIN_FLASH_MS = 200;
export const GAP_MS = 150;
export const ROTATE_MS = 350; // por cuarto de vuelta
export const ROTATE_PAUSE_MS = 120;
export const PRESS_MS = 180;
export const INPUT_TIMEOUT_MS = 4000;
export const FAIL_MS = 900;
export const ROUNDS_PER_LEVEL = 3;
export const STEP_POINTS = 10; // × level
export const ROUND_POINTS = 50; // × level × (1 + turns)
export const ALLOWANCE_MS = 1000; // por paso, para el bonus de tiempo
export const TIME_BONUS_DIV = 20;

// "dead" no se usa en la variante C; se mantiene por contrato con player.tsx
export type MemoriaPhase = "playing" | "dead" | "gameover" | "paused";

export interface MemoriaState {
  score: number;
  lives: number; // longitud de la secuencia actual (HUD: "Secuencia")
  level: number;
  phase: MemoriaPhase;
}

type Color = 0 | 1 | 2 | 3; // cian, magenta, amarillo, verde
type Pos = 0 | 1 | 2 | 3; // arriba, derecha, abajo, izquierda
type Mode = "delay" | "show" | "rotate" | "input" | "fail";

export class MemoriaEngine {
  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: MemoriaState) => void,
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
// components/games/memoria-game.tsx
export interface MemoriaGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}
```

```ts
// lib/games/registry.ts — entrada nueva
memoria: { component: MemoriaGame, secondaryLabel: "Secuencia" },
```

```sql
-- Fila nueva del catálogo (vía MCP de Supabase).
insert into games (id, title, short, long, category, cover, color, best_seed, plays_seed)
values (
  'memoria',
  'MEMORIA',
  'Repite la secuencia de luces sin fallar.',
  'Cuatro paneles de neón se encienden en orden. Memoriza la secuencia y repítela con las flechas: cada ronda añade un paso y acelera el ritmo. ¿Hasta dónde llega tu memoria?',
  'PUZZLE',
  'cover-memoria',
  'cyan',
  2400,
  '2.1K'
);
```

Convenciones:

- `layout: Color[4]` indexado por posición (`layout[pos] = color`). Disposición de inicio `[0, 1, 2, 3]`.
- Un cuarto de vuelta horario: `next[(p + 1) % 4] = layout[p]`; antihorario: `next[(p + 3) % 4] = layout[p]`. `layout` se actualiza al terminar cada cuarto; durante la animación el panel se dibuja en el ángulo `base(p) ± t × 90°` con `t = easeInOutQuad(rotTimer / ROTATE_MS)`.
- Pulsar la posición `p` es correcto si `layout[p] === sequence[inputIndex]`.
- La reproducción siempre ocurre en la disposición de inicio; el giro solo ocurre entre reproducción y turno.
- Tiempos en ms con temporizador de modo: `modeTimer += dt * 1000`; `dt` clampeado a 0.05 s. `idleTimer` e `inputMs` solo corren en `input`.
- `turns` y su sentido se sortean al empezar la ronda, con el `level` de esa ronda.
- Panel encendido: relleno `PAD_LIT[color]` + anillo exterior de 3 px a 8 px del borde. Apagado: `PAD_DIM[color]`. Sin `shadowBlur` (SPEC 13).
- `phase = 'paused'` congela la simulación (incluida la animación de giro) sin cancelar el frame.
- Sin assets: no hay carpeta `public/games/memoria/`.

## Plan de implementación

1. Crear `lib/games/memoria/engine.ts` (parte 1): constantes, tipos, clase `MemoriaEngine` con campos (`sequence: Color[]`, `layout: Color[]`, `inputIndex`, `mode`, `modeTimer`, `idleTimer`, `inputMs`, `turns`, `turnsDone`, `turnDir: 1 | -1`, `rotTimer`, `pressed: Pos | null`, `pressTimer`, `roundsCompleted`, `score`, `level`, `state`, `paused`, `rafId`, `lastTime`) y constructor que obtiene el contexto 2D (lanza si es null) y llama a `reset()`. Verificar: `npx tsc --noEmit` sin errores nuevos.
2. `engine.ts` (parte 2): `update(dt)` — modos `delay → show → rotate → input → (delay | fail)`; `level`/`flashMs`; sorteo de `turns` y sentido por nivel; animación de giro con actualización de `layout` por cuarto; pulsación correcta (`+10 × level`); ronda completada (`+50 × level × (1 + turns)` + bonus de tiempo, nuevo color, `delay`); fallo o timeout de 4000 ms → `fail` → `gameover`. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. `engine.ts` (parte 3): `draw()` — fondo `#0a0a18`, chevrons fijos de posición, paneles en su ángulo actual con su símbolo, encendidos por reproducción/pulsación/parpadeo de fallo, indicador central (`MIRA`, `GIRA ↻/↺`, `TÚ`, `✕`). Sin score/secuencia/nivel en el canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `engine.ts` (parte 4): loop e input. `start()` idempotente; `keydown` en `window` como arrow class field (flechas + WASD por `e.code`; ignora `e.repeat` y pulsaciones fuera de `input`; `P`/`Escape` alternan pausa salvo en `gameover`; `preventDefault` en flechas/espacio). Loop: `if (!paused) update(dt)`, siempre `draw()` y `emitState()`. `pause`, `resume`, `forceGameOver` (`state = 'gameover'`), `restart` (`reset()`), `destroy` (cancela RAF, quita listener). Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
5. Crear `components/games/memoria-game.tsx`, espejo de `asteroids-game.tsx` (sin `setSkin`): callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
6. Añadir `memoria: { component: MemoriaGame, secondaryLabel: "Secuencia" }` a `GAME_ENGINES` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores.
7. Añadir `.cover-memoria` (base, `::after`, `::before`) en `app/globals.css` dentro de `@layer components`, junto a `.cover-duelo`. Verificar: `npm run build` sin errores.
8. Supabase vía MCP. **Precondición:** si el MCP de Supabase no está conectado/disponible, el agente **se detiene y pide al usuario que lo active**, sin caer a un paso manual. Con MCP: comprobar que `select count(*) from games where id = 'memoria'` devuelve 0; ejecutar el `insert` del Modelo de datos. Verificar: `select id, title, category, cover, color from games where id = 'memoria'` devuelve `memoria | MEMORIA | PUZZLE | cover-memoria | cyan`.
9. Añadir `memoria` a `references/implemented-games.md`: fila (`memoria | MEMORIA | PUZZLE | cyan | cover-memoria | 2400 | 2.1K | Secuencia | SPEC NN`) y sección "memoria — MEMORIA". Verificar: el archivo incluye la fila nueva.
10. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/juegos` muestra la card "MEMORIA" con `cover-memoria` y categoría PUZZLE; la portada se lee en 4/3, 16/10 y 1/1.
- [ ] `/juegos/memoria` carga mostrando "Mejor global" y "Partidas".
- [ ] `/juegos/memoria/jugar` renderiza el canvas con los cuatro paneles, sus símbolos y los chevrons de posición, no el `.game-arena` simulado.
- [ ] Al empezar, el HUD muestra "Secuencia 1", "Nivel 1" y puntuación 0.
- [ ] En nivel 1 (rondas 1–3) la cruz no gira y el indicador pasa de `MIRA` a `TÚ`.
- [ ] Completar la ronda 1 con la pulsación a 200 ms del inicio del turno deja el score en exactamente 100 (10 + 50 + 40).
- [ ] Completar la ronda 1 con la pulsación a 1000 ms o más deja el score en exactamente 60.
- [ ] Dos partidas que llegan a la misma ronda con tiempos de respuesta distintos terminan con scores distintos.
- [ ] En la ronda 4 el HUD muestra "Nivel 2" y, tras la reproducción, la cruz gira exactamente un cuarto de vuelta en sentido horario con el indicador `GIRA ↻`.
- [ ] Tras un cuarto de vuelta horario, el color cian queda a la derecha y se responde con `→`.
- [ ] Completar una ronda con `turns = 2` suma `50 × level × 3` como bonus de ronda (más el de tiempo).
- [ ] En nivel 3 el giro es de 1, 2 o 3 cuartos; en nivel 4+ aparecen también giros antihorarios con `GIRA ↺`.
- [ ] Cada panel conserva su símbolo durante el giro; los chevrons de posición no se mueven.
- [ ] Cada ronda nueva empieza con la disposición de inicio (cian arriba) y reproduce la secuencia anterior más 1 color.
- [ ] Pulsar la posición equivocada hace parpadear el panel correcto en su posición actual y abre el modal de fin de partida sin pulsar FIN.
- [ ] No pulsar nada durante 4 s en el turno del jugador abre el modal de fin de partida.
- [ ] Pulsar teclas durante la reproducción o el giro no cuenta como respuesta; mantener una flecha cuenta como una sola pulsación.
- [ ] Flechas y espacio no hacen scroll de la página mientras se juega.
- [ ] PAUSA congela el juego (incluido el giro a medias y el timeout) y REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo.
- [ ] FIN abre el modal con la puntuación real.
- [ ] JUGAR DE NUEVO empieza con "Secuencia 1", nivel 1, score 0, cian arriba y secuencia nueva.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'memoria'` visible en `/juegos/memoria` y `/salon?juego=memoria`; si falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar`, `/juegos/snake/jugar` y `/juegos/frogger/jugar` siguen funcionando igual.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado.
- [ ] SALIR y volver a entrar no duplica input ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal.

## Decisiones

- **Sí:** fila nueva `memoria` con `insert`. Ningún placeholder de SPEC 06 es un juego de memoria. (decisión del agente, revisar)
- **Sí:** `category = 'PUZZLE'`, `color = 'cyan'`. Juego de memoria; Tetris, el otro PUZZLE, ya es magenta. (decisión del agente, revisar)
- **Sí:** `best_seed = 2400`, `plays_seed = '2.1K'`. Valor común a las tres variantes del jam. (decisión del agente, revisar)
- **Sí:** twist "Giro": la cruz rota entre reproducción y turno. Separa color de posición y convierte la memoria de posiciones en memoria de colores + rastreo espacial. (decisión del agente, revisar)
- **No:** twist de secuencia inversa. Cambia poco la sensación de juego y es fácil de memorizar en bloque.
- **No:** quinto panel. No hay quinta flecha; rompería el mapeo directo tecla ↔ posición.
- **Sí:** reproducción siempre en la disposición de inicio y giro solo después. El jugador memoriza en un marco estable; la dificultad está en el rastreo. (decisión del agente, revisar)
- **Sí:** reiniciar la disposición al empezar cada ronda. Evita acumular giros entre rondas, que harían la reproducción ilegible. (decisión del agente, revisar)
- **Sí:** curva de giro 0 → 1 horario → 1–3 horario → 1–3 en ambos sentidos, cada 3 rondas. Introduce la mecánica de forma gradual. (decisión del agente, revisar)
- **Sí:** símbolo propio por color que viaja con el panel, y chevrons fijos por posición. El jugador distingue "qué panel" de "qué tecla" sin depender del color. (decisión del agente, revisar)
- **Sí:** bonus de ronda `50 × level × (1 + turns)` y bonus de tiempo con 1 s por paso. Premia los giros difíciles y la rapidez; rompe los empates del leaderboard. (decisión del agente, revisar)
- **Sí:** timeout de 4000 ms. Seguir un giro de 270° requiere más tiempo que el Simon clásico (3000 ms). (decisión del agente, revisar)
- **Sí:** un solo error termina la partida. Mantiene las partidas cortas; la dificultad extra la aporta el giro. (decisión del agente, revisar)
- **Sí:** `lives` = longitud de la secuencia con `secondaryLabel: "Secuencia"`. Sin vidas; patrón Tetris/Snake sin editar `player.tsx`. (decisión del agente, revisar)
- **No:** sonido. No hay assets de audio y el juego se construye desde cero; toda la información es visual (panel encendido, símbolo, indicador central).
- **No:** `shadowBlur` para el brillo. Anti-patrón de SPEC 13; se usa un anillo exterior.
- **Sí:** ignorar `e.repeat` y pulsaciones fuera del turno. Evita respuestas dobles y fallos durante el giro.
- **No:** ratón ni táctil. El contrato es teclado; móvil va en su propia spec.
- **Sí:** persistencia real vía `saveScore`. Todo juego con motor guarda desde SPEC 07.

## Riesgos

| Riesgo                                                                            | Mitigación                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| El giro de 270° resulta confuso (parece 90° antihorario)                          | Animación por cuartos con pausa de 120 ms entre ellos e indicador `GIRA ↻/↺` con el sentido real. |
| La mecánica es demasiado difícil y las partidas acaban en la ronda 4              | Nivel 1 sin giro (3 rondas de calentamiento) y un solo cuarto horario en nivel 2.                 |
| Jugadores con daltonismo confunden paneles al girar                               | Símbolo propio por color que gira con el panel.                                                   |
| Pausar a mitad de giro deja la cruz en ángulo intermedio                          | Aceptado: es el último frame bajo el overlay; `resume()` continúa la animación desde `rotTimer`.  |
| `layout` desincronizado del dibujo si se actualiza antes de terminar la animación | `layout` solo cambia al completar cada cuarto; el dibujo usa `layout` + ángulo interpolado.       |
| El `insert` falla si ya existe una fila `memoria`                                 | El paso 8 comprueba el `count` antes de insertar.                                                 |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena        | Riesgo preexistente (BACKLOG #3); memoria puede no salir en la home. No se corrige aquí.          |
| `npm run lint` falla por errores preexistentes en `app/page.tsx` (BACKLOG #2)     | Si siguen ahí, el gate exige "sin errores nuevos" en los archivos de esta spec.                   |

## Lo que **no** está en esta spec

- Sonido.
- Vidas o segundas oportunidades.
- Otros twists (espejo, secuencia inversa, quinto panel).
- Rotación durante la reproducción.
- Ratón, clic en paneles y controles táctiles.
- Skins.
- Cambios en `components/player.tsx`.

Cada uno, si llega, va en su propia spec.
