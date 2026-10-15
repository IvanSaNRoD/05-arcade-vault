# SPEC JAM memoria-A — Memoria clásica (Simon fiel) en Next.js

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 09
> **Date:** 2026-10-15
> **Objective:** Crear desde cero un motor TypeScript + Client Component de MEMORIA, un Simon clásico de 4 paneles de neón con un solo error = fin de partida, como fila nueva `memoria` del catálogo con puntuaciones reales en Supabase y una entrada en el registro de motores.
> **Variante:** A de 3 — difiere de las otras en: reglas mínimas de Simon (sin vidas, sin bonus de tiempo, sin sonido), coste de implementación más bajo y empates aceptados en el leaderboard.

## Por qué existe esta spec

El catálogo no tiene ningún juego de memoria y solo un PUZZLE jugable (Tetris). MEMORIA (Simon) encaja en el contrato del motor: un canvas 800×600, cuatro teclas, partidas cortas, score numérico creciente y `restart()` trivial. Ningún placeholder simulado de SPEC 06 (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) describe un juego de memoria, así que va en **modo fila nueva**: `insert` en `games` más una portada `.cover-memoria` en `app/globals.css`. **No hay prototipo vanilla ni assets** en `references/resources/` para Simon: se construye desde cero, todo dibujado con primitivas de canvas y sin sonido. Simon no tiene vidas: la ranura "Vidas" muestra la longitud de la secuencia actual vía `secondaryLabel: "Secuencia"` (patrón Tetris "Líneas" / Snake "Longitud"); "Nivel" muestra el tramo de velocidad 1–4.

## Scope

**In:**

- Motor `lib/games/memoria/engine.ts` (`MemoriaEngine`) con estas reglas:
  - Canvas 800×600. Cuatro paneles cuadrados de `PAD_SIZE = 140` px y esquinas de radio `PAD_RADIUS = 18`, en cruz alrededor del centro `(400, 300)`: arriba `(400, 150)` cian, derecha `(550, 300)` magenta, abajo `(400, 450)` amarillo, izquierda `(250, 300)` verde (centros).
  - Cada panel lleva dentro un triángulo blanco apuntando a su dirección (▲ ▶ ▼ ◀), para que el panel no se identifique solo por color.
  - Indicador central: círculo de radio `CENTER_R = 56` en `(400, 300)` con el texto `MIRA` (reproducción), `TÚ` (turno del jugador) o `✕` (fallo).
  - La partida empieza con una secuencia de 1 paso aleatorio (`Math.floor(Math.random() * 4)`). Cada ronda superada añade 1 paso aleatorio al final; la secuencia previa no cambia.
  - Ronda: espera `ROUND_DELAY_MS = 800` → reproducción (cada paso iluminado `flashMs`, separado por `GAP_MS = 150`) → turno del jugador.
  - Velocidad por tramos de longitud de secuencia (fiel a Simon): longitud 1–5 → `flashMs = 420`; 6–9 → `320`; 10–13 → `250`; 14+ → `190`. El tramo es `level` (1–4).
  - Turno del jugador: cada pulsación ilumina su panel `PRESS_MS = 180`. Pulsar el panel correcto avanza; completar la secuencia suma puntos e inicia la ronda siguiente.
  - Pulsar un panel incorrecto o no pulsar nada en `INPUT_TIMEOUT_MS = 3000` desde el inicio del turno o la última pulsación → fallo: el panel correcto parpadea 3 veces durante `FAIL_MS = 900` y después `phase = 'gameover'`.
  - Completar una secuencia de `MAX_LENGTH = 31` pasos → `phase = 'gameover'` con el score final (victoria de Simon, mapeada a gameover como el `win` de SPEC 08).
- Puntuación: completar una ronda de longitud `n` suma exactamente `10 × n`. Las pulsaciones sueltas no suman. Máximo teórico `10 × (1 + … + 31) = 4960`.
- Estado emitido por callback: `{ score, lives, level, phase }`, con `lives = longitud de la secuencia actual` y `level = tramo de velocidad`.
- Controles: `↑`/`W` panel de arriba, `→`/`D` derecha, `↓`/`S` abajo, `←`/`A` izquierda. `P`/`Escape` pausa/reanuda. Se ignoran pulsaciones durante la espera, la reproducción y el fallo, y las autorrepeticiones (`e.repeat`). `preventDefault` en flechas y espacio.
- `MemoriaEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` genera una secuencia nueva de 1 paso, score 0, nivel 1.
- `components/games/memoria-game.tsx` (`"use client"`, `forwardRef<MemoriaGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx` sin `setSkin`.
- `lib/games/registry.ts`: añadir `memoria: { component: MemoriaGame, secondaryLabel: "Secuencia" }`.
- Portada `.cover-memoria` en `app/globals.css` (`@layer components`, junto a `.cover-duelo`): fondo `radial-gradient(circle at 50% 50%, #00202a, #0a0a18)`; `::after` con cuatro cuadrados en cruz (`linear-gradient` sólidos de 18% × 24% en `50% 14%`, `82% 50%`, `50% 86%`, `18% 50%`): cian encendido `var(--cyan)` y los otros tres atenuados (`#40001c`, `#3d4000`, `#004022`); `filter: drop-shadow(0 0 8px rgba(0,245,255,0.5))`; `::before` con el glifo `?` centrado en `var(--ink)`, 22px.
- Paso en Supabase vía MCP de Supabase: `insert` de la fila `memoria` (ver Modelo de datos). Si el MCP no está conectado al llegar a este paso, el agente se detiene y pide al usuario que lo active.
- Añadir la fila `memoria` a `references/implemented-games.md` (tabla y sección por juego).

**Out of scope (para specs futuras):**

- Sonido (no hay assets de audio y el juego se construye desde cero sin sonido).
- Vidas, bonus por velocidad o cualquier desempate de score: dos jugadores que llegan a la misma ronda empatan.
- Ratón, clic sobre los paneles y controles táctiles (`touchControls`).
- Skins (`setSkin`, `clasico`/`neon`/`retro`): las cubre `skin-designer`.
- Modos de Simon original (Player 2, "Choose your color").
- Cambios en `components/player.tsx`.
- Persistencia de récord local o estadísticas por jugador.

## Modelo de datos

```ts
// lib/games/memoria/engine.ts
export const W = 800;
export const H = 600;
export const PAD_SIZE = 140;
export const PAD_RADIUS = 18;
export const CENTER_R = 56;
export const PAD_CENTERS = [
  { x: 400, y: 150 }, // 0 arriba — cian
  { x: 550, y: 300 }, // 1 derecha — magenta
  { x: 400, y: 450 }, // 2 abajo — amarillo
  { x: 250, y: 300 }, // 3 izquierda — verde
] as const;
export const PAD_LIT = ["#00f5ff", "#ff006e", "#f5ff00", "#00ff88"] as const;
export const PAD_DIM = ["#003d40", "#40001c", "#3d4000", "#004022"] as const;
export const ROUND_DELAY_MS = 800;
export const GAP_MS = 150;
export const PRESS_MS = 180;
export const INPUT_TIMEOUT_MS = 3000;
export const FAIL_MS = 900;
export const MAX_LENGTH = 31;
// tramo = level; índice por longitud: 1–5, 6–9, 10–13, 14+
export const FLASH_MS_BY_LEVEL = [420, 320, 250, 190] as const;
export const POINTS_PER_STEP = 10; // ronda de longitud n → 10 × n

// "dead" no se usa en la variante A; se mantiene por contrato con player.tsx
export type MemoriaPhase = "playing" | "dead" | "gameover" | "paused";

export interface MemoriaState {
  score: number;
  lives: number; // longitud de la secuencia actual (HUD: "Secuencia")
  level: number; // tramo de velocidad 1..4
  phase: MemoriaPhase;
}

type Pad = 0 | 1 | 2 | 3;
type Mode = "delay" | "show" | "input" | "fail"; // subestado interno de "playing"

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

- Coordenadas del canvas: origen arriba-izquierda; los paneles se identifican por índice `Pad` (0 arriba, 1 derecha, 2 abajo, 3 izquierda), igual que la tecla que los activa.
- Todos los tiempos en ms con un temporizador de modo: `modeTimer += dt * 1000`. `dt` clampeado a 0.05 s.
- `level = 1` si longitud ≤ 5, `2` si ≤ 9, `3` si ≤ 13, `4` en otro caso; `flashMs = FLASH_MS_BY_LEVEL[level - 1]`.
- Reproducción: el paso `i` está encendido durante `[i × (flashMs + GAP_MS), i × (flashMs + GAP_MS) + flashMs)` medido desde el inicio de `show`.
- El temporizador de inactividad (`idleTimer`) solo corre en `input` y se reinicia en cada pulsación correcta.
- Panel encendido: relleno `PAD_LIT[i]` + anillo exterior de 3 px en `PAD_LIT[i]` a 8 px del borde. Apagado: relleno `PAD_DIM[i]`. Sin `shadowBlur` (anti-patrón de SPEC 13).
- `phase = 'paused'` congela la simulación sin cancelar el frame, igual que asteroids/tetris/arkanoid/snake.
- Sin assets: no hay carpeta `public/games/memoria/`.

## Plan de implementación

1. Crear `lib/games/memoria/engine.ts` (parte 1): constantes, tipos `MemoriaPhase`/`MemoriaState`/`Pad`/`Mode`, clase `MemoriaEngine` con campos de instancia (`sequence: Pad[]`, `inputIndex`, `mode`, `modeTimer`, `idleTimer`, `pressed: Pad | null`, `pressTimer`, `score`, `level`, `state`, `paused`, `rafId`, `lastTime`) y constructor que obtiene el contexto 2D (lanza si es null) y llama a `reset()` (secuencia de 1 paso, `mode = 'delay'`). Verificar: `npx tsc --noEmit` sin errores nuevos.
2. `engine.ts` (parte 2): `update(dt)` — máquina de modos `delay → show → input → (delay | fail)`; cálculo de `level`/`flashMs` por longitud; pulsación correcta/incorrecta; timeout de 3000 ms; ronda completa (`+10 × n`, añadir paso, `delay`); longitud 31 completada → `gameover`; fin de `fail` → `gameover`. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. `engine.ts` (parte 3): `draw()` — fondo `#0a0a18`, cuatro paneles con su triángulo de dirección, panel encendido según reproducción/pulsación/parpadeo de fallo, indicador central (`MIRA` / `TÚ` / `✕`). Sin HUD de score/vidas/nivel en el canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `engine.ts` (parte 4): loop e input. `start()` idempotente; `keydown` en `window` como arrow class field (mapa de flechas + WASD por `e.code`, ignora `e.repeat` y pulsaciones fuera de `input`; `P`/`Escape` alternan pausa salvo en `gameover`; `preventDefault` en flechas/espacio). Loop: `if (!paused) update(dt)`, siempre `draw()` y `emitState()`. Añadir `pause`, `resume`, `forceGameOver` (`state = 'gameover'`), `restart` (`reset()`) y `destroy` (cancela RAF, quita listener). Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
5. Crear `components/games/memoria-game.tsx`, espejo de `asteroids-game.tsx` (sin `setSkin`): callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
6. Añadir `memoria: { component: MemoriaGame, secondaryLabel: "Secuencia" }` a `GAME_ENGINES` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores.
7. Añadir `.cover-memoria` (base, `::after`, `::before`) en `app/globals.css` dentro de `@layer components`, junto a `.cover-duelo`. Verificar: `npm run build` sin errores y la clase existe en el CSS generado.
8. Supabase vía MCP. **Precondición:** si el MCP de Supabase no está conectado/disponible, el agente **se detiene y pide al usuario que lo active**, sin caer a un paso manual. Con MCP: comprobar que `select count(*) from games where id = 'memoria'` devuelve 0; ejecutar el `insert` del Modelo de datos. Verificar: `select id, title, category, cover, color from games where id = 'memoria'` devuelve `memoria | MEMORIA | PUZZLE | cover-memoria | cyan`.
9. Añadir `memoria` a `references/implemented-games.md`: fila en la tabla (`memoria | MEMORIA | PUZZLE | cyan | cover-memoria | 2400 | 2.1K | Secuencia | SPEC NN`) y sección "memoria — MEMORIA" con short, long, engine, bridge, registry y spec. Verificar: el archivo lista 5 motores con la fila nueva.
10. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/juegos` muestra la card "MEMORIA" con `cover-memoria` y categoría PUZZLE.
- [ ] `.cover-memoria` se ve con sus cuatro paneles en la card 4/3, el hero 16/10 y la mini-card 1/1.
- [ ] `/juegos/memoria` carga mostrando "Mejor global" y "Partidas".
- [ ] `/juegos/memoria/jugar` renderiza el canvas con los cuatro paneles en cruz, no el `.game-arena` simulado.
- [ ] Al empezar, el HUD muestra "Secuencia 1", "Nivel 1" y puntuación 0.
- [ ] Tras 800 ms se ilumina exactamente 1 panel y el indicador central pasa de `MIRA` a `TÚ`.
- [ ] Cada flecha (y su tecla WASD) ilumina el panel de su dirección durante el turno del jugador.
- [ ] Repetir bien la ronda 1 suma exactamente 10 puntos y el HUD pasa a "Secuencia 2".
- [ ] Superar las rondas 1, 2 y 3 deja la puntuación en exactamente 60.
- [ ] Cada ronda nueva reproduce la secuencia anterior sin cambios más 1 paso al final.
- [ ] Con secuencia de 6 pasos el HUD muestra "Nivel 2" y los destellos duran 320 ms (más rápidos que en nivel 1).
- [ ] Pulsar un panel incorrecto hace parpadear el correcto y abre el modal de fin de partida sin pulsar FIN.
- [ ] No pulsar nada durante 3 s en el turno del jugador abre el modal de fin de partida.
- [ ] Pulsar teclas durante la reproducción no cuenta como respuesta.
- [ ] Mantener una flecha pulsada cuenta como una sola pulsación.
- [ ] Flechas y espacio no hacen scroll de la página mientras se juega.
- [ ] PAUSA congela el juego (incluido el timeout de 3 s) y REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo.
- [ ] FIN abre el modal con la puntuación real.
- [ ] JUGAR DE NUEVO empieza con "Secuencia 1", nivel 1, score 0 y una secuencia nueva.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'memoria'` visible en `/juegos/memoria` y `/salon?juego=memoria`; si falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar`, `/juegos/snake/jugar` y `/juegos/frogger/jugar` siguen funcionando igual.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado.
- [ ] SALIR y volver a entrar no duplica input ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal.

## Decisiones

- **Sí:** fila nueva `memoria` con `insert`. Ningún placeholder de SPEC 06 es un juego de memoria; renombrar uno mezclaría temas. (decisión del agente, revisar)
- **Sí:** `category = 'PUZZLE'`. Es un juego de memoria/lógica, como Tetris. (decisión del agente, revisar)
- **Sí:** `color = 'cyan'`. Tetris, el otro PUZZLE, ya usa magenta; cian diferencia la categoría en la Biblioteca. (decisión del agente, revisar)
- **Sí:** `best_seed = 2400`, `plays_seed = '2.1K'`. 2400 equivale a superar ~21 rondas, una partida buena pero alcanzable. (decisión del agente, revisar)
- **Sí:** reglas mínimas de Simon: un error o 3 s de inactividad terminan la partida. Es la variante fiel y la de menor coste. (decisión del agente, revisar)
- **Sí:** tramos de velocidad 420/320/250/190 ms en longitudes 6, 10 y 14. Reproducen la aceleración del Simon original y dan sentido al campo "Nivel". (decisión del agente, revisar)
- **Sí:** `MAX_LENGTH = 31` y victoria → `phase = 'gameover'`. Es el límite del Simon original; respeta el contrato sin añadir `'win'` (precedente SPEC 08). (decisión del agente, revisar)
- **Sí:** `+10 × n` al completar una ronda de longitud `n`. Premia más las rondas largas sin introducir tablas extra. (decisión del agente, revisar)
- **No:** desempate por tiempo o bonus de velocidad. Fuera de la variante fiel; los empates en la misma ronda se aceptan. (decisión del agente, revisar)
- **Sí:** `lives` = longitud de la secuencia con `secondaryLabel: "Secuencia"`. Simon no tiene vidas; patrón Tetris/Snake sin editar `player.tsx`. (decisión del agente, revisar)
- **No:** 3 vidas con corazones. Se aleja del Simon original.
- **Sí:** paneles en cruz con triángulo de dirección. La posición coincide con la flecha que lo activa y el triángulo evita depender solo del color. (decisión del agente, revisar)
- **No:** paneles en cuadrantes 2×2 como el Simon físico. Las diagonales no se mapean de forma natural a las flechas.
- **Sí:** el panel correcto parpadea 900 ms antes del gameover. Feedback de por qué se perdió, como el Simon original. (decisión del agente, revisar)
- **Sí:** ignorar `e.repeat` y pulsaciones fuera del turno. Evita respuestas dobles y fallos accidentales.
- **Sí:** flechas + WASD, `P`/`Escape` para pausa. Mismo esquema que Snake.
- **No:** sonido. No hay assets de audio y el juego se construye desde cero; la indicación es 100% visual (panel encendido + indicador central).
- **No:** `shadowBlur` para el brillo. Anti-patrón de rendimiento de SPEC 13; se usa un anillo exterior.
- **No:** ratón ni táctil. El contrato es teclado; móvil va en su propia spec.
- **Sí:** persistencia real vía `saveScore`. Todo juego con motor guarda desde SPEC 07.

## Riesgos

| Riesgo                                                                        | Mitigación                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Leaderboard con muchos empates: el score depende solo de la ronda alcanzada   | Aceptado en esta variante; un desempate por tiempo queda fuera de scope.                      |
| Sin sonido el Simon pierde una ayuda de memorización                          | Triángulos de dirección + contraste fuerte encendido/apagado + indicador central `MIRA`/`TÚ`. |
| El jugador pulsa durante la reproducción y cree que el juego no responde      | Indicador central `MIRA` visible durante `delay` y `show`; `TÚ` solo en `input`.              |
| Autorrepetición del teclado registra varias pulsaciones                       | `keydown` ignora `e.repeat`.                                                                  |
| `.cover-memoria` se deforma en 16/10 o 1/1                                    | Tamaños en % del contenedor; criterio de aceptación en las tres proporciones.                 |
| El `insert` falla si ya existe una fila `memoria`                             | El paso 8 comprueba el `count` antes de insertar.                                             |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena    | Riesgo preexistente (BACKLOG #3); memoria puede no salir en la home. No se corrige aquí.      |
| `npm run lint` falla por errores preexistentes en `app/page.tsx` (BACKLOG #2) | Si siguen ahí, el gate exige "sin errores nuevos" en los archivos de esta spec.               |

## Lo que **no** está en esta spec

- Sonido.
- Vidas, bonus de velocidad o desempate de score.
- Ratón, clic en paneles y controles táctiles.
- Skins.
- Modos alternativos del Simon original.
- Cambios en `components/player.tsx`.
- Récord local o estadísticas por jugador.

Cada uno, si llega, va en su propia spec.
