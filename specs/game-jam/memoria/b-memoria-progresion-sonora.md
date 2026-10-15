# SPEC JAM memoria-B — Memoria con vidas, bonus de reflejos y tonos sintetizados en Next.js

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 13
> **Date:** 2026-10-15
> **Objective:** Crear desde cero un motor TypeScript + Client Component de MEMORIA (Simon de 4 paneles) con 3 vidas, niveles cada 4 rondas, bonus por velocidad de respuesta que desempata el leaderboard y tonos Web Audio silenciables, como fila nueva `memoria` con puntuaciones reales en Supabase.
> **Variante:** B de 3 — difiere de las otras en: curva por niveles con 3 vidas (corazones en el HUD), score con bonus de reflejos que rompe empates, y sonido sintetizado sin assets con indicación visual equivalente.

## Por qué existe esta spec

El catálogo no tiene juego de memoria y solo un PUZZLE jugable (Tetris). Un Simon encaja en el contrato del motor (canvas 800×600, cuatro teclas, `restart()` trivial), pero tiene dos debilidades señaladas por el planner: **empates en el leaderboard** (todos los que llegan a la ronda 15 sacan lo mismo) y **dependencia del audio**. Esta variante ataca ambas: cada pulsación correcta suma un bonus según su rapidez (el score deja de ser función solo de la ronda) y cada panel tiene su tono, generado con Web Audio (`OscillatorNode`), sin archivos de audio, con la tecla `M` para silenciar y la misma información siempre visible en el canvas. Ningún placeholder de SPEC 06 (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) es un juego de memoria: **modo fila nueva** (`insert` + `.cover-memoria`). **No hay prototipo ni assets** en `references/resources/` para Simon: todo se dibuja con primitivas de canvas. Con 3 vidas, la ranura "Vidas" usa corazones (sin `secondaryLabel`), como Asteroids y Arkanoid.

## Scope

**In:**

- Motor `lib/games/memoria/engine.ts` (`MemoriaEngine`) con estas reglas:
  - Canvas 800×600. Cuatro paneles de `PAD_SIZE = 140` px (radio `PAD_RADIUS = 18`) en cruz alrededor de `(400, 300)`: arriba `(400, 150)` cian, derecha `(550, 300)` magenta, abajo `(400, 450)` amarillo, izquierda `(250, 300)` verde. Cada panel lleva un triángulo blanco apuntando a su dirección (▲ ▶ ▼ ◀).
  - Indicador central (círculo de radio `CENTER_R = 56`): `MIRA` durante la espera/reproducción, `TÚ` + progreso `k/n` (pasos acertados / longitud) en el turno del jugador, `✕` en rojo `#ff3b3b` tras un fallo.
  - Secuencia inicial de 1 paso aleatorio; cada ronda superada añade 1 paso al final, sin límite de longitud.
  - Ronda: espera `ROUND_DELAY_MS = 800` → reproducción (`flashMs` encendido, `gapMs = round(flashMs × 0.4)` apagado) → turno del jugador.
  - Niveles: `level = floor(rondasCompletadas / ROUNDS_PER_LEVEL) + 1` con `ROUNDS_PER_LEVEL = 4`. `flashMs = max(MIN_FLASH_MS, BASE_FLASH_MS − (level − 1) × FLASH_STEP_MS)` con `BASE_FLASH_MS = 460`, `FLASH_STEP_MS = 45`, `MIN_FLASH_MS = 160`.
  - Vidas: `INITIAL_LIVES = 3`. Pulsar el panel incorrecto o no pulsar en `INPUT_TIMEOUT_MS = 2500` resta 1 vida: `phase = 'dead'` durante `DEAD_MS = 1200` (el panel correcto parpadea 3 veces y suena el tono de error), después se **repite la misma secuencia** desde el primer paso. Con 0 vidas, tras los 1200 ms → `phase = 'gameover'`.
  - Vida extra: +1 cada `ROUNDS_PER_LIFE = 8` rondas completadas, hasta `MAX_LIVES = 5`.
- Puntuación (desempate por reflejos):
  - Pulsación correcta: `10 × level + speedBonus`, con `speedBonus = max(0, floor((REACTION_WINDOW_MS − r) / 25))`, `REACTION_WINDOW_MS = 1500` y `r` = ms desde el inicio del turno (primer paso) o desde la pulsación correcta anterior. Rango del bonus: 0–60.
  - Ronda completada: `+50 × level`.
  - Ronda perfecta (completada sin perder vida en esa ronda): `+25 × level` adicionales.
- Sonido (`lib/games/memoria/audio.ts`, clase `MemoriaAudio` instanciada por el motor):
  - Tono por panel con `OscillatorNode` tipo `triangle`: arriba 415.3 Hz, derecha 310 Hz, abajo 252 Hz, izquierda 209 Hz (frecuencias del Simon original). Duración = `flashMs` en reproducción, `PRESS_MS = 180` al pulsar. Ganancia `TONE_GAIN = 0.12` con rampa de 10 ms de entrada y 40 ms de salida.
  - Tono de error: `square` a 42 Hz durante `ERROR_TONE_MS = 500`.
  - Un solo oscilador activo: un tono nuevo corta el anterior.
  - El `AudioContext` se crea en el primer `keydown` del jugador (política de autoplay). Si `window.AudioContext` no existe, el juego funciona en silencio.
  - `M` alterna silencio. El estado se conserva tras `restart()`, no entre montajes.
  - Indicador en el canvas, abajo a la derecha (`(784, 584)`, alineado a la derecha, 14px monospace, `#8a8aa0`): `♪ SÍ · M`, `♪ NO · M` o `♪ N/D` si no hay Web Audio.
  - `pause()` corta el tono en curso; `destroy()` llama a `AudioContext.close()`.
- Indicación visual equivalente al audio: todo tono coincide con un panel encendido o con el `✕` rojo central; el juego se puede jugar entero en silencio.
- Estado emitido por callback: `{ score, lives, level, phase }` con `lives` = vidas restantes.
- Controles: `↑`/`W`, `→`/`D`, `↓`/`S`, `←`/`A` pulsan el panel de esa dirección; `M` silencio; `P`/`Escape` pausa/reanuda. Se ignoran pulsaciones fuera del turno del jugador y las autorrepeticiones (`e.repeat`). `preventDefault` en flechas y espacio.
- `MemoriaEngine` expone `start()`, `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()`. `restart()` vuelve a nivel 1, 3 vidas, score 0 y una secuencia nueva de 1 paso.
- `components/games/memoria-game.tsx` (`"use client"`, `forwardRef<MemoriaGameHandle, { onStateChange }>`), copia estructural de `components/games/asteroids-game.tsx` sin `setSkin`.
- `lib/games/registry.ts`: añadir `memoria: { component: MemoriaGame }` (tiene vidas → corazones).
- Portada `.cover-memoria` en `app/globals.css` (`@layer components`, junto a `.cover-duelo`): fondo `radial-gradient(circle at 50% 50%, #00202a, #0a0a18)`; `::after` con cuatro cuadrados en cruz (`linear-gradient` sólidos de 18% × 24% en `50% 14%`, `82% 50%`, `50% 86%`, `18% 50%`): cian encendido `var(--cyan)` y los otros atenuados (`#40001c`, `#3d4000`, `#004022`); `filter: drop-shadow(0 0 8px rgba(0,245,255,0.5))`; `::before` con el glifo `?` centrado en `var(--ink)`, 22px.
- Paso en Supabase vía MCP de Supabase: `insert` de la fila `memoria`. Si el MCP no está conectado, el agente se detiene y pide al usuario que lo active.
- Añadir la fila `memoria` a `references/implemented-games.md`.

**Out of scope (para specs futuras):**

- Archivos de audio (MP3/WAV): el sonido es solo síntesis Web Audio.
- Persistir la preferencia de silencio (`localStorage`) o un control de volumen.
- Botón de silencio en la UI React de `player.tsx`.
- Límite de longitud o pantalla de victoria.
- Ratón, clic en paneles y controles táctiles (`touchControls`).
- Skins (`setSkin`): las cubre `skin-designer`.
- Cambios en `components/player.tsx`.

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
export const BASE_FLASH_MS = 460;
export const FLASH_STEP_MS = 45;
export const MIN_FLASH_MS = 160;
export const GAP_RATIO = 0.4;
export const PRESS_MS = 180;
export const INPUT_TIMEOUT_MS = 2500;
export const DEAD_MS = 1200;
export const ROUNDS_PER_LEVEL = 4;
export const INITIAL_LIVES = 3;
export const MAX_LIVES = 5;
export const ROUNDS_PER_LIFE = 8;
export const REACTION_WINDOW_MS = 1500;
export const SPEED_BONUS_DIV = 25; // bonus 0..60
export const STEP_POINTS = 10; // × level
export const ROUND_POINTS = 50; // × level
export const PERFECT_POINTS = 25; // × level

// "dead" = pausa de 1200 ms tras perder una vida (sin efecto en player.tsx)
export type MemoriaPhase = "playing" | "dead" | "gameover" | "paused";

export interface MemoriaState {
  score: number;
  lives: number; // vidas restantes 0..5 (HUD: corazones)
  level: number;
  phase: MemoriaPhase;
}

type Pad = 0 | 1 | 2 | 3;
type Mode = "delay" | "show" | "input"; // subestado interno de "playing"

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
// lib/games/memoria/audio.ts
export const PAD_FREQ = [415.3, 310, 252, 209] as const; // Hz, por Pad
export const ERROR_FREQ = 42;
export const ERROR_TONE_MS = 500;
export const TONE_GAIN = 0.12;

export class MemoriaAudio {
  readonly available: boolean; // false si no hay window.AudioContext
  muted: boolean;
  ensure(): void; // crea el AudioContext en el primer gesto del jugador
  tone(pad: 0 | 1 | 2 | 3, ms: number): void;
  error(): void;
  stop(): void;
  toggleMute(): void;
  close(): void;
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
memoria: { component: MemoriaGame }, // tiene vidas → corazones, sin secondaryLabel
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

- Paneles por índice `Pad` (0 arriba, 1 derecha, 2 abajo, 3 izquierda), igual que la tecla que los activa.
- Tiempos en ms con temporizador de modo: `modeTimer += dt * 1000`; `dt` clampeado a 0.05 s.
- Paso `i` de la reproducción encendido en `[i × (flashMs + gapMs), i × (flashMs + gapMs) + flashMs)` desde el inicio de `show`; el tono se lanza una vez al encender cada paso.
- `reactionTimer` (para `r`) e `idleTimer` (para el timeout) solo corren en `input`; ambos se reinician en cada pulsación correcta.
- `level` se recalcula al empezar cada ronda; los puntos de una ronda usan el `level` con el que empezó.
- `roundHadError` se pone a `true` al perder una vida y a `false` al empezar una ronda nueva; decide el bonus de ronda perfecta.
- Panel encendido: relleno `PAD_LIT[i]` + anillo exterior de 3 px a 8 px del borde. Apagado: `PAD_DIM[i]`. Sin `shadowBlur` (SPEC 13).
- `phase = 'paused'` congela la simulación y corta el tono sin cancelar el frame.
- Sin assets: no hay carpeta `public/games/memoria/`.

## Plan de implementación

1. Crear `lib/games/memoria/audio.ts`: constantes de frecuencia y clase `MemoriaAudio` (sin estado a nivel de módulo; `available` según `typeof window.AudioContext`; `ensure()` crea el contexto una vez; `tone`/`error` cortan el oscilador anterior y crean uno nuevo con su `GainNode` y rampas; `tone`/`error` no hacen nada si `muted` o sin contexto; `close()` cierra el contexto). Verificar: `npx tsc --noEmit` sin errores nuevos.
2. Crear `lib/games/memoria/engine.ts` (parte 1): constantes, tipos, clase `MemoriaEngine` con campos (`sequence: Pad[]`, `inputIndex`, `mode`, `modeTimer`, `idleTimer`, `reactionTimer`, `pressed`, `pressTimer`, `roundsCompleted`, `roundHadError`, `score`, `lives`, `level`, `state`, `deadTimer`, `paused`, `audio`, `rafId`, `lastTime`) y constructor que obtiene el contexto 2D (lanza si es null), instancia `MemoriaAudio` y llama a `reset()`. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. `engine.ts` (parte 2): `update(dt)` — modos `delay → show → input`; `level`/`flashMs`/`gapMs`; pulsación correcta (`10 × level + speedBonus`), ronda completada (`+50 × level`, `+25 × level` si perfecta, vida extra cada 8 rondas hasta 5, nuevo paso); fallo o timeout de 2500 ms (vida −1, `state = 'dead'` 1200 ms, luego repetir secuencia o `gameover`). Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `engine.ts` (parte 3): `draw()` — fondo `#0a0a18`, paneles con triángulo, encendidos por reproducción/pulsación/parpadeo de fallo, indicador central (`MIRA`, `TÚ k/n`, `✕` rojo), indicador de sonido abajo a la derecha. Sin score/vidas/nivel en el canvas. Verificar: `npx tsc --noEmit` sin errores nuevos.
5. `engine.ts` (parte 4): loop e input. `start()` idempotente; `keydown` en `window` como arrow class field (`audio.ensure()` en cada keydown; flechas + WASD por `e.code`; `KeyM` → `audio.toggleMute()`; ignora `e.repeat` y pulsaciones fuera de `input`; `P`/`Escape` alternan pausa salvo en `gameover`; `preventDefault` en flechas/espacio). Loop: `if (!paused) update(dt)`, siempre `draw()` y `emitState()`. `pause` (+ `audio.stop()`), `resume`, `forceGameOver`, `restart` (`reset()`, conserva `muted`), `destroy` (cancela RAF, quita listener, `audio.close()`). Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
6. Crear `components/games/memoria-game.tsx`, espejo de `asteroids-game.tsx` (sin `setSkin`): callback en ref, estado local reenviado por efecto, montaje con deps `[]` y `destroy()` en el cleanup, `useImperativeHandle` con los cuatro métodos, `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
7. Añadir `memoria: { component: MemoriaGame }` a `GAME_ENGINES` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores.
8. Añadir `.cover-memoria` (base, `::after`, `::before`) en `app/globals.css` dentro de `@layer components`, junto a `.cover-duelo`. Verificar: `npm run build` sin errores.
9. Supabase vía MCP. **Precondición:** si el MCP de Supabase no está conectado/disponible, el agente **se detiene y pide al usuario que lo active**, sin caer a un paso manual. Con MCP: comprobar que `select count(*) from games where id = 'memoria'` devuelve 0; ejecutar el `insert` del Modelo de datos. Verificar: `select id, title, category, cover, color from games where id = 'memoria'` devuelve `memoria | MEMORIA | PUZZLE | cover-memoria | cyan`.
10. Añadir `memoria` a `references/implemented-games.md`: fila (`memoria | MEMORIA | PUZZLE | cyan | cover-memoria | 2400 | 2.1K | — (lives / hearts) | SPEC NN`) y sección "memoria — MEMORIA". Verificar: el archivo incluye la fila nueva.
11. Gate: `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [ ] `npx tsc --noEmit`, `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/juegos` muestra la card "MEMORIA" con `cover-memoria` y categoría PUZZLE; la portada se lee en 4/3, 16/10 y 1/1.
- [ ] `/juegos/memoria` carga mostrando "Mejor global" y "Partidas".
- [ ] `/juegos/memoria/jugar` renderiza el canvas con los cuatro paneles, no el `.game-arena` simulado.
- [ ] Al empezar, el HUD muestra 3 corazones, "Nivel 1" y puntuación 0.
- [ ] Una pulsación correcta en nivel 1 hecha 1500 ms o más después de la anterior suma exactamente 10 puntos.
- [ ] Una pulsación correcta en nivel 1 hecha 500 ms después de la anterior suma exactamente 50 puntos (10 + 40 de bonus).
- [ ] Completar la ronda 1 sin fallo y con la pulsación a 1500 ms o más deja el score en exactamente 85 (10 + 50 + 25).
- [ ] Dos partidas que llegan a la misma ronda con tiempos de respuesta distintos terminan con scores distintos.
- [ ] Tras 4 rondas completadas el HUD muestra "Nivel 2" y los destellos duran 415 ms.
- [ ] Un fallo resta 1 corazón, hace parpadear el panel correcto y repite la misma secuencia desde el primer paso.
- [ ] No pulsar nada durante 2,5 s en el turno del jugador resta 1 corazón.
- [ ] Una ronda en la que se perdió vida no suma los `25 × level` de ronda perfecta.
- [ ] Tras 8 rondas completadas el HUD gana 1 corazón; nunca muestra más de 5.
- [ ] Perder la tercera vida abre el modal de fin de partida sin pulsar FIN.
- [ ] Cada panel suena con su propio tono al reproducirse y al pulsarse; un fallo suena con el tono grave de error.
- [ ] `M` silencia y reactiva el sonido, y el indicador del canvas cambia entre `♪ SÍ · M` y `♪ NO · M`.
- [ ] Con el sonido silenciado la partida se juega entera: cada paso se ve como panel encendido y cada fallo como `✕` rojo.
- [ ] Sin Web Audio disponible el juego arranca sin errores y muestra `♪ N/D`.
- [ ] Pulsar teclas durante la reproducción no cuenta como respuesta; mantener una flecha cuenta como una sola pulsación.
- [ ] Flechas y espacio no hacen scroll de la página mientras se juega.
- [ ] PAUSA congela el juego (incluido el timeout y el bonus de reflejos), corta el tono en curso, y REANUDAR continúa sin perder estado; `P`/`Escape` hacen lo mismo.
- [ ] FIN abre el modal con la puntuación real.
- [ ] JUGAR DE NUEVO empieza en nivel 1, 3 corazones, score 0 y secuencia nueva, conservando el silencio elegido.
- [ ] GUARDAR PUNTUACIÓN inserta una fila con `game_id = 'memoria'` visible en `/juegos/memoria` y `/salon?juego=memoria`; si falla, el modal muestra el error y permite reintentar.
- [ ] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar`, `/juegos/snake/jugar` y `/juegos/frogger/jugar` siguen funcionando igual.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado.
- [ ] SALIR y volver a entrar no duplica input ni sonido ni deja errores en consola (incluido Strict Mode en `npm run dev`).
- [ ] A 400px de ancho el canvas se escala dentro de `.crt-screen` sin scroll horizontal.

## Decisiones

- **Sí:** fila nueva `memoria` con `insert`. Ningún placeholder de SPEC 06 es un juego de memoria. (decisión del agente, revisar)
- **Sí:** `category = 'PUZZLE'`, `color = 'cyan'`. Juego de memoria; Tetris, el otro PUZZLE, ya es magenta. (decisión del agente, revisar)
- **Sí:** `best_seed = 2400`, `plays_seed = '2.1K'`. Valor común a las tres variantes del jam; con esta tabla equivale a ~10 rondas con reflejos medios. (decisión del agente, revisar)
- **Sí:** bonus de reflejos 0–60 por pulsación. Hace que el score dependa de la velocidad además de la ronda: resuelve los empates del leaderboard. (decisión del agente, revisar)
- **No:** desempate por timestamp de envío o por duración total de partida. `scores` solo guarda un número; el desempate tiene que vivir en el score.
- **Sí:** 3 vidas con corazones y repetir la misma secuencia tras un fallo. Partidas algo más largas y una curva menos punitiva; usa la otra ranura del HUD. (decisión del agente, revisar)
- **Sí:** vida extra cada 8 rondas, máximo 5. Recompensa progresar sin hacer la partida infinita. (decisión del agente, revisar)
- **Sí:** niveles cada 4 rondas con destellos de 460 ms a 160 ms en pasos de 45 ms. Curva continua frente a los 4 tramos fijos del Simon original. (decisión del agente, revisar)
- **Sí:** `10 × level` por paso + `50 × level` por ronda + `25 × level` por ronda perfecta. Escala con la dificultad y premia no fallar. (decisión del agente, revisar)
- **Sí:** sonido sintetizado con Web Audio, sin archivos. El Simon depende del tono por panel y no hay assets de audio en el repo; sintetizar no inventa assets. Se aparta del "sin sonido" por defecto de los juegos desde cero. (decisión del agente, revisar)
- **Sí:** frecuencias 415.3 / 310 / 252 / 209 Hz y error a 42 Hz. Son las del Simon original. (decisión del agente, revisar)
- **Sí:** `AudioContext` creado en el primer `keydown`. La política de autoplay lo bloquea sin gesto del usuario.
- **Sí:** `M` para silenciar con indicador en el canvas. El indicador no es HUD de score/vidas/nivel; no exige tocar `player.tsx`. (decisión del agente, revisar)
- **No:** persistir el silencio en `localStorage`. Más superficie para una preferencia menor; queda fuera.
- **Sí:** toda señal sonora tiene su equivalente visual. El juego debe funcionar en silencio, sin altavoces o sin Web Audio.
- **Sí:** un solo oscilador activo. Evita acumulación de nodos en ráfagas (anti-patrón de fugas de SPEC 13).
- **Sí:** paneles en cruz con triángulo de dirección. La posición coincide con la flecha y el triángulo evita depender solo del color. (decisión del agente, revisar)
- **No:** `shadowBlur` para el brillo. Anti-patrón de SPEC 13; se usa un anillo exterior.
- **Sí:** `dead` durante los 1200 ms tras perder vida. Da al contrato un uso real, como el respawn de Asteroids.
- **No:** ratón ni táctil. El contrato es teclado; móvil va en su propia spec.
- **Sí:** persistencia real vía `saveScore`. Todo juego con motor guarda desde SPEC 07.

## Riesgos

| Riesgo                                                                        | Mitigación                                                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Política de autoplay: el primer tono de la reproducción inicial no suena      | `ensure()` en cada `keydown`; la primera reproducción puede ir muda, la información visual es la misma. |
| Strict Mode monta dos motores y deja un `AudioContext` abierto                | `destroy()` llama a `audio.close()`; criterio de aceptación de "sin sonido duplicado" tras SALIR.       |
| Cortes o clics audibles al encadenar tonos rápidos en niveles altos           | Rampas de 10 ms / 40 ms en el `GainNode`; un tono nuevo corta el anterior.                              |
| El bonus de reflejos favorece machacar teclas                                 | Una pulsación incorrecta cuesta una vida; el bonus solo cuenta en pulsaciones correctas.                |
| Jugadores con daltonismo confunden paneles                                    | Triángulo de dirección en cada panel y posición fija por tecla.                                         |
| `best_seed = 2400` puede quedar bajo frente a scores reales de esta tabla     | Solo se muestra hasta que haya filas reales en `scores`; `lib/games.ts` calcula `best` en vivo.         |
| El `insert` falla si ya existe una fila `memoria`                             | El paso 9 comprueba el `count` antes de insertar.                                                       |
| `app/page.tsx` muestra solo los 6 primeros juegos y `getGames()` no ordena    | Riesgo preexistente (BACKLOG #3); memoria puede no salir en la home. No se corrige aquí.                |
| `npm run lint` falla por errores preexistentes en `app/page.tsx` (BACKLOG #2) | Si siguen ahí, el gate exige "sin errores nuevos" en los archivos de esta spec.                         |

## Lo que **no** está en esta spec

- Archivos de audio.
- Preferencia de silencio persistente o control de volumen.
- Botón de silencio en `player.tsx`.
- Límite de longitud o pantalla de victoria.
- Ratón, clic en paneles y controles táctiles.
- Skins.
- Cambios en `components/player.tsx`.

Cada uno, si llega, va en su propia spec.
