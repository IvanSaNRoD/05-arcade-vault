# SPEC SKINS tetris — Sistema de skins compartido + skins de Tetris

> **Status:** Borrador
> **Depends on:** SPEC 07
> **Date:** 2026-10-09
> **Objective:** Crear el sistema de skins compartido (`lib/games/skins.ts`, `setSkin?` en `GameEngineHandle`, selector CLÁSICO / NEÓN / RETRO persistido en `components/player.tsx`) y las tres skins de Tetris como implementación de referencia.

## Por qué existe esta spec

Todo juego implementado debe ofrecer tres skins (`clasico` por defecto, `neon`, `retro`) legibles sobre la UI oscura del sitio. La auditoría del 2026-10-09 encontró que ningún juego cumple: no existe `lib/games/skins.ts`, ningún motor expone `setSkin()` y `components/player.tsx` no tiene selector. Tetris es el piloto: esta spec construye la infraestructura común y la aplica a Tetris. Las specs de skins del resto de juegos (`specs/skins/<id>-skins.md`) dependen de esta y solo añaden `lib/games/<id>/skins.ts` + cambios de motor.

## Scope

**In:**

- `lib/games/skins.ts`: `SkinId`, `SKIN_IDS`, `DEFAULT_SKIN`, `SKIN_LABELS`, `SKIN_STORAGE_KEY`, tipo base `SkinPalette`, `isSkinId`, y helpers de persistencia `readStoredSkin` / `writeStoredSkin` / `subscribeSkin` (localStorage en try/catch, fallback `clasico`).
- `lib/games/registry.ts`: método **opcional** `setSkin?(id: SkinId): void` en `GameEngineHandle`. Asteroids, Arkanoid y Snake compilan sin cambios hasta su propia spec.
- `components/player.tsx`: selector de 3 botones (CLÁSICO / NEÓN / RETRO) en `.hud-actions` y repetido dentro del overlay de pausa. Solo se muestra si el handle del motor expone `setSkin`. Cambiar de skin no reinicia la partida.
- `lib/games/tetris/skins.ts`: `TetrisPalette` y `TETRIS_SKINS` con las paletas de la tabla de abajo.
- `lib/games/tetris/engine.ts`: `setSkin(id)`, campo `palette`; todos los literales de color (`BG_COLOR`, `GRID_COLOR`, `COLORS`, `rgba(255,255,255,0.12)`, `rgba(255,255,255,0.65)`) pasan a roles de la paleta. Estilos de bloque por skin (`clasico` sin cambios, `neon` contorno + glow, `retro` relleno sólido con hueco de 2 px).
- `components/games/tetris-game.tsx`: el handle expone `setSkin`; al montar aplica `readStoredSkin()`.

**Out of scope (para specs futuras):**

- Skins de Asteroids, Arkanoid y Snake (cada una en `specs/skins/<id>-skins.md`).
- Skins por juego (una preferencia distinta por juego): la clave es global.
- Cambiar el CSS del sitio, el CRT o el HUD de React según la skin.
- Nuevos assets o fuentes pixel en el canvas.
- Arreglar el contraste del fantasma `clasico` (ver Riesgos).
- Selector de skin en `/juegos/[id]` (detalle).

## Modelo de datos

```ts
// lib/games/skins.ts
export type SkinId = "clasico" | "neon" | "retro";
export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];
export const DEFAULT_SKIN: SkinId = "clasico";
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
export const SKIN_STORAGE_KEY = "arcade-vault:skin";

/** Base común: cada juego la extiende con sus roles. */
export interface SkinPalette {
  id: SkinId;
  background: string; // fondo del canvas
  glow: number; // shadowBlur de elementos; 0 = sin glow
}

export function isSkinId(v: unknown): v is SkinId;
export function readStoredSkin(): SkinId; // try/catch → DEFAULT_SKIN
export function writeStoredSkin(id: SkinId): void; // try/catch + dispatch Event(SKIN_STORAGE_KEY)
export function subscribeSkin(cb: () => void): () => void; // "storage" + Event(SKIN_STORAGE_KEY)
```

```ts
// lib/games/registry.ts — cambio
export interface GameEngineHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void;
  restart(): void;
  setSkin?(id: SkinId): void; // opcional hasta que cada juego tenga su spec
}
```

```ts
// lib/games/tetris/skins.ts
import type { SkinId, SkinPalette } from "@/lib/games/skins";

export interface TetrisPalette extends SkinPalette {
  grid: string | null; // null = sin grid
  frame: string | null; // borde del tablero; null = sin borde
  pieces: readonly (string | null)[]; // índice 0 = null, 1..8 = I O T S Z J L N
  highlight: string | null; // banda superior de 4 px del bloque
  label: string; // texto "SIGUIENTE"
  previewBorder: string;
}

export const TETRIS_SKINS: Record<SkinId, TetrisPalette>;
```

```ts
// lib/games/tetris/engine.ts — API nueva
setSkin(id: SkinId): void; // this.palette = TETRIS_SKINS[id]; no toca board/score/estado
```

Paleta (role × skin):

| rol           | clasico                  | neon               | retro            |
| ------------- | ------------------------ | ------------------ | ---------------- |
| background    | `#1a1a25`                | `#0a0a0f`          | `#000000`        |
| grid          | `#22222e` (0.5 px)       | `#4a4f70` (0.5 px) | `null`           |
| frame         | `null`                   | `null`             | `#7c7c7c` (2 px) |
| I (1)         | `#4dd0e1`                | `#00f5ff`          | `#fcfcfc`        |
| O (2)         | `#ffd54f`                | `#f5ff00`          | `#fcfcfc`        |
| T (3)         | `#ba68c8`                | `#ff006e`          | `#fcfcfc`        |
| S (4)         | `#81c784`                | `#00ff88`          | `#0058f8`        |
| Z (5)         | `#e57373`                | `#ff006e`          | `#3cbcfc`        |
| J (6)         | `#90caf9`                | `#00f5ff`          | `#0058f8`        |
| L (7)         | `#ffb74d`                | `#f5ff00`          | `#3cbcfc`        |
| N (8, tuerca) | `#9e9e9e`                | `#e6e9ff`          | `#fcfcfc`        |
| highlight     | `rgba(255,255,255,0.12)` | `null`             | `null`           |
| label         | `rgba(255,255,255,0.65)` | `#8a8fb5`          | `#fcfcfc`        |
| previewBorder | `#22222e`                | `#4a4f70`          | `#7c7c7c`        |
| glow          | `0`                      | `10`               | `0`              |

Estilo de bloque por skin (`drawBlock`):

- `clasico`: idéntico al actual. `fillRect(px+1, py+1, size-2, size-2)` + banda `highlight` de 4 px. Fantasma = mismo bloque con `globalAlpha = 0.2`.
- `neon`: relleno `globalAlpha = 0.2` en `(px+1, py+1, size-2, size-2)`, luego `strokeRect(px+2, py+2, size-4, size-4)` a `lineWidth = 2` en color pleno con `shadowBlur = 10` y `shadowColor` = color de la pieza. Fantasma = solo contorno `lineWidth = 2`, `setLineDash([4, 4])`, color pleno, sin glow.
- `retro`: `fillRect(px+2, py+2, size-4, size-4)` sólido (hueco negro de 2 px entre bloques), sin highlight ni glow. Fantasma = `strokeRect(px+3, py+3, size-6, size-6)` a `lineWidth = 2`, color pleno. Sin grid; borde del tablero `strokeRect(BOARD_X-2, BOARD_Y, COLS*BLOCK+4, ROWS*BLOCK)` a 2 px en `frame`.

Retro: paleta NES de 5 colores (`#000000`, `#fcfcfc`, `#3cbcfc`, `#0058f8`, `#7c7c7c`), inspirada en Tetris de NES nivel 0 (I/O/T en blanco, J/S en azul, Z/L en azul claro), más gris para el borde.

Contraste (WCAG, fondo = `background` de cada skin; colores con alfa se miden mezclados sobre el fondo):

| rol                       | clasico (`#1a1a25`)                       | neon (`#0a0a0f`)      | retro (`#000000`)     |
| ------------------------- | ----------------------------------------- | --------------------- | --------------------- |
| I                         | `#4dd0e1` 9.38                            | `#00f5ff` 14.58       | `#fcfcfc` 20.47       |
| O                         | `#ffd54f` 12.21                           | `#f5ff00` 18.05       | `#fcfcfc` 20.47       |
| T                         | `#ba68c8` 4.84                            | `#ff006e` 5.15        | `#fcfcfc` 20.47       |
| S                         | `#81c784` 8.57                            | `#00ff88` 14.73       | `#0058f8` 3.75        |
| Z                         | `#e57373` 5.77                            | `#ff006e` 5.15        | `#3cbcfc` 9.79        |
| J                         | `#90caf9` 9.85                            | `#00f5ff` 14.58       | `#0058f8` 3.75        |
| L                         | `#ffb74d` 9.96                            | `#f5ff00` 18.05       | `#3cbcfc` 9.79        |
| N                         | `#9e9e9e` 6.43                            | `#e6e9ff` 16.43       | `#fcfcfc` 20.47       |
| fantasma                  | pieza al 20 % 1.31–1.67 **falla**         | contorno pleno ≥ 5.15 | contorno pleno ≥ 3.75 |
| frame                     | —                                         | —                     | `#7c7c7c` 5.03        |
| label "SIGUIENTE" (texto) | `rgba(255,255,255,0.65)` ≈ `#afafb3` 7.87 | `#8a8fb5` 6.28        | `#fcfcfc` 20.47       |
| grid                      | decorativo                                | decorativo            | —                     |
| previewBorder             | decorativo                                | decorativo            | decorativo            |
| highlight                 | decorativo                                | —                     | —                     |

Convenciones:

- La skin activa vive en `this.palette`; `draw()` la lee en cada frame. Como el loop dibuja también en pausa, `setSkin` se ve al instante sin reanudar.
- Ningún literal de color queda en `engine.ts`: todos salen de `TETRIS_SKINS`.
- Todo `shadowBlur` > 0 se resetea a 0 tras dibujar (o va dentro de `save()/restore()`).
- `localStorage[SKIN_STORAGE_KEY]` guarda el id en texto plano (`"neon"`); valor inválido → `DEFAULT_SKIN`.

## Plan de implementación

1. Crear `lib/games/skins.ts` con tipos, constantes y helpers del Modelo de datos. `readStoredSkin` devuelve `DEFAULT_SKIN` si `typeof window === "undefined"`, si `getItem` lanza o si el valor no pasa `isSkinId`. `writeStoredSkin` envuelve `setItem` en try/catch y despacha `new Event(SKIN_STORAGE_KEY)` en `window`. Verificar: `npx tsc --noEmit` sin errores nuevos.
2. Añadir `setSkin?(id: SkinId): void` a `GameEngineHandle` en `lib/games/registry.ts`. Verificar: `npx tsc --noEmit` sin errores; los cuatro bridges compilan sin tocarlos.
3. Crear `lib/games/tetris/skins.ts` con `TetrisPalette` y `TETRIS_SKINS` copiando la tabla de paleta. `clasico` usa los literales actuales tal cual (mismas cadenas). Verificar: `npx tsc --noEmit` sin errores nuevos.
4. `lib/games/tetris/engine.ts` (parte 1): añadir `private palette: TetrisPalette = TETRIS_SKINS[DEFAULT_SKIN]` y `setSkin(id)`. Borrar `BG_COLOR`, `GRID_COLOR` y `COLORS`; `draw()`, `drawGrid()`, `drawPreview()` y `drawBlock()` leen de `this.palette` con el estilo `clasico`. Verificar: `npx tsc --noEmit` sin errores y, en `npm run dev`, `/juegos/tetris/jugar` se ve igual que antes.
5. `engine.ts` (parte 2): `drawBlock(px, py, colorIndex, size, ghost = false)` ramifica por `this.palette.id` según "Estilo de bloque por skin"; el parámetro `alpha` actual pasa a `ghost` (en `clasico` `ghost` ⇒ `globalAlpha = 0.2`). `drawGrid()` retorna si `grid === null`; `draw()` dibuja `frame` si no es null. Verificar: `npx tsc --noEmit` sin errores; llamando `setSkin("neon")` / `setSkin("retro")` desde la consola de React DevTools el tablero cambia.
6. `components/games/tetris-game.tsx`: tras `new TetrisEngine(...)` llamar `engine.setSkin(readStoredSkin())` antes de `start()`; añadir `setSkin: (id) => engineRef.current?.setSkin(id)` a `TetrisGameHandle` y a `useImperativeHandle`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
7. `components/player.tsx` (parte 1, estado): `const skin = useSyncExternalStore(subscribeSkin, readStoredSkin, () => DEFAULT_SKIN)`. Estado `skinsAvailable` (inicial `false`) que `handleEngineState` actualiza con `setSkinsAvailable(typeof engineRef.current?.setSkin === "function")`. `changeSkin(id)` = `writeStoredSkin(id)` + `engineRef.current?.setSkin?.(id)`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
8. `components/player.tsx` (parte 2, UI, diseñada con `/frontend-design`): componente local `SkinSelector` con `role="group"` `aria-label="Skin"` y 3 `<button>` de `SKIN_IDS` con texto `SKIN_LABELS[id]`, clase `btn yellow` si activo y `btn ghost` si no, `aria-pressed`, y `e.currentTarget.blur()` tras el click. Se renderiza en `.hud-actions` antes de PAUSA y dentro del overlay `paused`, solo si `skinsAvailable`. Verificar: en `/juegos/tetris/jugar` aparecen los 3 botones; en `/juegos/snake/jugar` no.
9. Gate: `npx tsc --noEmit`, `npm run lint` (salvo los errores preexistentes de `app/page.tsx`, BACKLOG #2) y `npm run build`.

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores; `npm run lint` no añade errores nuevos.
- [ ] Con `clasico`, captura de `/juegos/tetris/jugar` idéntica a la actual (fondo `#1a1a25`, grid, colores de pieza, banda de brillo, fantasma al 20 %, "SIGUIENTE").
- [ ] `lib/games/tetris/engine.ts` no contiene ningún literal `#hex`, `rgb(`/`rgba(` ni nombre de color.
- [ ] El HUD de Tetris muestra los botones CLÁSICO / NEÓN / RETRO; el activo se distingue visualmente y tiene `aria-pressed="true"`.
- [ ] Pulsar NEÓN cambia el canvas a fondo `#0a0a0f`, piezas con contorno de 2 px y glow.
- [ ] Pulsar RETRO cambia el canvas a fondo negro, bloques sólidos con hueco de 2 px, sin grid, borde gris del tablero y sin glow.
- [ ] Cambiar de skin en pausa no reinicia la partida: score, líneas, nivel y tablero se mantienen y el canvas se redibuja con la skin nueva.
- [ ] Cambiar de skin durante la partida no reinicia ni pausa el juego.
- [ ] El overlay "EN PAUSA" muestra también el selector y funciona.
- [ ] Recargar la página conserva la skin elegida (`localStorage["arcade-vault:skin"]`).
- [ ] Con `localStorage` bloqueado (p. ej. `setItem` lanza) el juego arranca en `clasico` sin errores en consola.
- [ ] Un valor inválido en `arcade-vault:skin` arranca en `clasico`.
- [ ] `/juegos/asteroids/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` funcionan igual y no muestran selector.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) sigue mostrando el `.game-arena` simulado sin selector.
- [ ] Tras pulsar un botón de skin, `Espacio` hace hard drop y no vuelve a pulsar el botón.
- [ ] No hay hydration warnings en consola al cargar con una skin no por defecto guardada.

## Decisiones

- **Sí:** tres skins fijas `clasico` / `neon` / `retro` con un `SkinId` común. Mismo vocabulario en todos los juegos. (decisión del agente, revisar)
- **Sí:** `setSkin?` opcional en `GameEngineHandle`. Los juegos sin spec de skins siguen compilando. (decisión del agente, revisar)
- **Sí:** una sola clave global `arcade-vault:skin`. Más simple que una por juego; la preferencia estética suele ser del usuario, no del juego. (decisión del agente, revisar)
- **No:** clave por juego (`arcade-vault:skin:<id>`). Complejidad sin beneficio claro hoy.
- **Sí:** `useSyncExternalStore` para leer la skin en `player.tsx`. Evita hydration mismatch (snapshot de servidor = `clasico`) y evita `setState` dentro de un efecto. (decisión del agente, revisar)
- **Sí:** `skinsAvailable` se calcula en `handleEngineState` leyendo el handle. Cumple "visible solo si el motor expone `setSkin`" sin duplicar un flag en el registro. (decisión del agente, revisar)
- **No:** flag `skins: true` en `GameEngineEntry`. Duplica información que ya da el handle.
- **Sí:** el bridge aplica `readStoredSkin()` al montar. La skin se ve desde el primer frame, sin esperar a `player.tsx`. (decisión del agente, revisar)
- **Sí:** `id` en `SkinPalette`. El motor ramifica el estilo de dibujo (`palette.id === "retro"`) sin guardar un segundo campo. (decisión del agente, revisar)
- **Sí:** `clasico` copia los literales actuales como cadenas idénticas (`rgba(255,255,255,0.12)`, etc.). Garantiza cero cambio visual.
- **Sí:** neon mapea las 8 piezas a 5 colores del sitio (T y Z magenta, I y J cian, O y L amarillo, N `--ink`). La regla neon solo admite la paleta del sitio. (decisión del agente, revisar)
- **Sí:** retro con paleta NES de Tetris nivel 0 (3 colores de pieza + gris de borde). Las piezas se reconocen por forma, como en NES. (decisión del agente, revisar)
- **No:** paleta Game Boy. Sus 4 verdes no superan 3:1 entre tonos oscuros sobre `#0f380f`.
- **Sí:** retro sin grid y con borde de tablero de 2 px. Sin grid el tablero no tendría límites visibles; NES tampoco tiene grid. (decisión del agente, revisar)
- **Sí:** fantasma neon/retro como contorno a color pleno. Al 20 % de alfa no pasaría 3:1. (decisión del agente, revisar)
- **Sí:** glow neon `shadowBlur = 10`. Dentro del rango 8–16; más alto emborrona bloques de 30 px. (decisión del agente, revisar)
- **Sí:** selector con clases `.btn` existentes. Sin CSS nuevo. (decisión del agente, revisar)
- **No:** selector en `<select>`. Tres opciones caben como botones y se ven en el HUD.
- **No:** sincronizar el CSS del sitio con la skin. Las skins son solo del canvas.

## Riesgos

| Riesgo                                                                                    | Mitigación                                                                                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| El fantasma `clasico` (pieza al 20 %) tiene contraste 1.31–1.67 sobre `#1a1a25`, bajo 3:1 | No se cambia (`clasico` = cero cambio visual). Se reporta al usuario para decidir si va a `specs/BACKLOG.md`. |
| `shadowBlur` sin resetear contamina el dibujo de la skin siguiente o de otros elementos   | Resetear `shadowBlur = 0` y `setLineDash([])` al final de cada bloque neon.                                   |
| Glow neon en 200 celdas por frame baja FPS en móviles                                     | `shadowBlur` 10 (no 16); verificar 60 FPS en `npm run dev` con tablero casi lleno.                            |
| Un botón de skin con foco se reactiva con `Espacio`                                       | `e.currentTarget.blur()` tras el click.                                                                       |
| `localStorage` lanza en modo privado o con cookies bloqueadas                             | Todo acceso en try/catch; fallback `clasico`.                                                                 |
| Hydration mismatch si el botón activo se calcula en el servidor con otra skin             | `getServerSnapshot` devuelve `DEFAULT_SKIN`; el selector solo se muestra tras el primer `handleEngineState`.  |
| Azul retro `#0058f8` queda justo sobre el mínimo (3.75)                                   | Aceptado; supera 3:1. Si se percibe oscuro, subir a `#3cbcfc` en S/J en otra spec.                            |

## Lo que **no** está en esta spec

- Skins de Asteroids, Arkanoid y Snake.
- Preferencia de skin por juego.
- Cambios de CSS del sitio, CRT o HUD según la skin.
- Assets o fuentes nuevas.
- Corrección del contraste del fantasma `clasico`.
- Selector en la página de detalle del juego.

Cada uno, si llega, va en su propia spec.
