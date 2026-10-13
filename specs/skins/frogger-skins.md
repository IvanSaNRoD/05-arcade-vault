# SPEC SKINS frogger — Skins clásica, neón y retro para Frogger

> **Status:** Borrador
> **Depends on:** `specs/game-jam/frogger/frogger-core.md`, `specs/skins/tetris-skins.md` (implementada)
> **Date:** 2026-10-14
> **Objective:** Añadir a Frogger las skins `clasico` / `neon` / `retro` mediante `lib/games/frogger/skins.ts` y `setSkin()` en `FroggerEngine`, reutilizando el sistema de skins y el selector que ya existen para Tetris y Asteroids.

## Por qué existe esta spec

La auditoría del 2026-10-14 marca Frogger como no conforme: no existe `lib/games/frogger/skins.ts`, `FroggerEngine` no expone `setSkin()`, `FroggerGameHandle` no lo declara (por eso `components/player.tsx` no muestra el selector en `/juegos/frogger/jugar`) y `lib/games/frogger/engine.ts` tiene 26 literales de color repartidos en `CAR_COLORS`, `draw()`, `drawGoals()`, `drawEntity()`, `drawFrogShape()` y `drawHud()`. Frogger no usa sprites PNG: todo son primitivas de canvas. La infraestructura compartida ya está implementada (`lib/games/skins.ts`, `setSkin?` en `GameEngineHandle`, `SkinSelector` en `components/player.tsx`); esta spec solo copia el patrón de Tetris (`TETRIS_SKINS`, `TetrisEngine.setSkin`, `engine.setSkin(readStoredSkin())` en `components/games/tetris-game.tsx`).

## Scope

**In:**

- `lib/games/frogger/skins.ts`: `FroggerPalette extends SkinPalette` y `FROGGER_SKINS: Record<SkinId, FroggerPalette>` con las paletas de la tabla.
- `lib/games/frogger/engine.ts`: campo `palette`, método `setSkin(id)`; se elimina `CAR_COLORS` y cada literal de `draw()`, `drawGoals()`, `drawEntity()`, `drawFrogShape()` y `drawHud()` pasa a un rol de la paleta.
- Estilos de dibujo por skin (`clasico` sin cambios, `neon` contorno + glow, `retro` relleno sólido + coordenadas enteras + contorno de rana 2 px).
- `components/games/frogger-game.tsx`: `setSkin?` en `FroggerGameHandle` y en `useImperativeHandle`; al montar llama `engine.setSkin(readStoredSkin())` antes de `engine.start()`.

**Out of scope (para specs futuras):**

- `lib/games/skins.ts`, `setSkin?` de `GameEngineHandle` y `SkinSelector` de `components/player.tsx`: ya existen y se reutilizan tal cual.
- Corregir el contraste de `clasico` (tronco, tortuga sumergida, rana sobre tortuga; ver Riesgos).
- Skins de Arkanoid y Snake.
- Sprites PNG o fuentes pixel.
- Controles táctiles de Frogger (`touchControls`).
- Cambios de gameplay (hitboxes, velocidades, puntos, temporizador).

## Modelo de datos

```ts
// lib/games/frogger/skins.ts
import type { SkinId, SkinPalette } from "@/lib/games/skins";

export interface FroggerPalette extends SkinPalette {
  // background (SkinPalette) = carretera y fondo general
  river: string;
  safe: string; // filas 7 y 13
  hedge: string; // fila 0 (seto entre bocas)
  laneMark: string; // marcas discontinuas de carretera
  goalSlot: string; // relleno de boca
  goalBorder: string;
  cars: Record<number, string>; // por fila: 9, 10, 12
  carDefault: string; // fallback de `cars[lane.row]`
  windshield: string;
  wheel: string;
  truckTrailer: string;
  truckCab: string;
  log: string;
  logGrain: string;
  turtle: string;
  turtleScales: string;
  turtleSubmerged: string;
  frog: string; // cuerpo, patas e iconos de vida del HUD
  frogOutline: string | null; // contorno 2 px del cuerpo; null = sin contorno
  frogEye: string;
  frogPupil: string;
  hudBand: string;
  hudText: string;
  timerHigh: string; // > 50 %
  timerMid: string; // > 25 %
  timerLow: string;
}

export const FROGGER_SKINS: Record<SkinId, FroggerPalette>;
```

```ts
// lib/games/frogger/engine.ts — API nueva / cambiada
class FroggerEngine {
  private palette: FroggerPalette = FROGGER_SKINS[DEFAULT_SKIN];
  setSkin(id: SkinId): void; // solo cambia this.palette; no toca carriles, rana, score ni estado
}
// CAR_COLORS se elimina: ctx.fillStyle = p.cars[lane.row] ?? p.carDefault
```

```ts
// components/games/frogger-game.tsx
export interface FroggerGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
  setSkin?: (id: SkinId) => void;
}
```

Paleta (rol × skin):

| rol             | clasico                    | neon      | retro     |
| --------------- | -------------------------- | --------- | --------- |
| background      | `#000000`                  | `#0a0a0f` | `#000000` |
| river           | `#06123a`                  | `#0f0f18` | `#0000bc` |
| safe            | `#0f3d1c`                  | `#15151f` | `#940084` |
| hedge           | `#3fa34d`                  | `#15151f` | `#00a800` |
| laneMark        | `#3a3a3a`                  | `#4a4f70` | `#fcfcfc` |
| goalSlot        | `#0b2e14`                  | `#0a0a0f` | `#000000` |
| goalBorder      | `#e6b422`                  | `#00f5ff` | `#fcfcfc` |
| cars[9]         | `#ffd23f`                  | `#f5ff00` | `#fcfcfc` |
| cars[10]        | `#3fa9ff`                  | `#00f5ff` | `#00a800` |
| cars[12]        | `#ff4d5e`                  | `#ff006e` | `#f83800` |
| carDefault      | `#ff4d5e`                  | `#ff006e` | `#f83800` |
| windshield      | `#cfe8ff`                  | `#e6e9ff` | `#000000` |
| wheel           | `#111`                     | `#8a8fb5` | `#fcfcfc` |
| truckTrailer    | `#9aa0a6`                  | `#e6e9ff` | `#fcfcfc` |
| truckCab        | `#ff8c1a`                  | `#ff006e` | `#f83800` |
| log             | `#7a4a1f`                  | `#f5ff00` | `#ac7c00` |
| logGrain        | `#4e2e10`                  | `#8a8fb5` | `#000000` |
| turtle          | `#2ecc71`                  | `#00f5ff` | `#f83800` |
| turtleScales    | `#145a32`                  | `#8a8fb5` | `#000000` |
| turtleSubmerged | `rgba(46, 204, 113, 0.45)` | `#8a8fb5` | `#f83800` |
| frog            | `#39ff14`                  | `#00ff88` | `#b8f818` |
| frogOutline     | `null`                     | `null`    | `#000000` |
| frogEye         | `#ffffff`                  | `#e6e9ff` | `#fcfcfc` |
| frogPupil       | `#000000`                  | `#0a0a0f` | `#000000` |
| hudBand         | `rgba(0, 0, 0, 0.6)`       | `#0a0a0f` | `#000000` |
| hudText         | `#ffffff`                  | `#e6e9ff` | `#fcfcfc` |
| timerHigh       | `#39ff14`                  | `#00ff88` | `#b8f818` |
| timerMid        | `#ffd23f`                  | `#f5ff00` | `#fcfcfc` |
| timerLow        | `#ff4d5e`                  | `#ff006e` | `#f83800` |
| glow            | `0`                        | `12`      | `0`       |

Neon: solo tokens de `app/globals.css` (`--bg #0a0a0f`, `--bg-2 #0f0f18`, `--bg-3 #15151f`, `--ink #e6e9ff`, `--ink-dim #8a8fb5`, `--ink-faint #4a4f70`, `--cyan`, `--magenta`, `--yellow`, `--green`).

Retro: 8 colores de la paleta NES (2C02): `#000000` negro, `#fcfcfc` blanco, `#0000bc` azul (río), `#940084` púrpura (aceras), `#00a800` verde (seto), `#b8f818` lima (rana), `#f83800` rojo (tortugas y coches), `#ac7c00` marrón (troncos). Evoca el Frogger arcade de 1981: río azul, aceras púrpura, tortugas rojas, troncos marrones.

Estilo de dibujo por skin:

| elemento        | clasico (actual)                                               | neon                                                                                                           | retro                                                                                                                    |
| --------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| zonas y marcas  | `fillRect` por zona, marcas 20×2 px                            | igual, colores de paleta, sin glow                                                                             | igual, colores de paleta                                                                                                 |
| coche           | carrocería `fillRect`, parabrisas `fillRect`, ruedas `arc` r4  | carrocería `strokeRect` 2 px, `shadowBlur = 12`, `shadowColor` = color del coche; parabrisas y ruedas sin glow | carrocería `fillRect` con `x = Math.round(e.col * CELL)`; ruedas `fillRect` 6×6 centradas, coordenadas enteras           |
| camión          | remolque y cabina `fillRect`                                   | ambos `strokeRect` 2 px, glow 12 con `shadowColor` = color de cada parte                                       | ambos `fillRect`, `x` redondeada                                                                                         |
| tronco          | `fillRect` + vetas 2 px                                        | `strokeRect` 2 px glow 12 `shadowColor = log`; vetas 2 px `logGrain` sin glow                                  | `fillRect`, `x` redondeada; vetas 2 px `logGrain`                                                                        |
| tortuga visible | `arc` r15 relleno + escamas 2 px                               | `arc` r15 `stroke` 2 px glow 12 `shadowColor = turtle`; escamas 2 px sin glow                                  | `arc` r15 relleno con centro `Math.round`; escamas 2 px                                                                  |
| tortuga hundida | `arc` r15 `stroke` 2 px `turtleSubmerged`                      | `arc` r15 `stroke` 2 px, sin glow                                                                              | `arc` r15 `stroke` 2 px, centro redondeado                                                                               |
| rana            | patas `stroke` 4 px `round`, cuerpo `ellipse` relleno, ojos    | patas 4 px y cuerpo `ellipse` `stroke` 3 px (sin relleno), glow 12 `shadowColor = frog`; ojos sin glow         | `translate(Math.round(cx), Math.round(cy))`, patas 4 px `lineCap = "butt"`, cuerpo relleno + `stroke` 2 px `frogOutline` |
| boca            | relleno `goalSlot` + borde 2 px `goalBorder`                   | igual, borde con glow 12 `shadowColor = goalBorder`                                                            | igual                                                                                                                    |
| HUD             | banda 22 px, `bold 16px monospace`, vidas `arc` r6, barra 4 px | igual, sin glow                                                                                                | igual; barra con ancho `Math.round(CANVAS_W * frac)`; vidas `fillRect` 12×12 centradas                                   |

Contraste (WCAG; cada rol se mide contra la zona donde se dibuja; `rgba` mezclado sobre su fondo: tortuga hundida `clasico` ≈ `#186653` sobre el río, banda HUD `clasico` ≈ `#19411f` sobre el seto):

| rol                                   | clasico                       | neon                          | retro                         |
| ------------------------------------- | ----------------------------- | ----------------------------- | ----------------------------- |
| cars[9] / carretera                   | `#ffd23f` 14.54               | `#f5ff00` 18.05               | `#fcfcfc` 20.47               |
| cars[10] / carretera                  | `#3fa9ff` 8.33                | `#00f5ff` 14.58               | `#00a800` 6.60                |
| cars[12] / carretera                  | `#ff4d5e` 6.48                | `#ff006e` 5.15                | `#f83800` 5.56                |
| truckTrailer / carretera              | `#9aa0a6` 7.95                | `#e6e9ff` 16.43               | `#fcfcfc` 20.47               |
| truckCab / carretera                  | `#ff8c1a` 9.02                | `#ff006e` 5.15                | `#f83800` 5.56                |
| log / río                             | `#7a4a1f` **2.45 falla**      | `#f5ff00` 17.41               | `#ac7c00` 3.27                |
| turtle / río                          | `#2ecc71` 8.65                | `#00f5ff` 14.07               | `#f83800` 3.22                |
| turtleSubmerged / río                 | ≈`#186653` **2.65 falla**     | `#8a8fb5` 6.06                | `#f83800` 3.22                |
| frog / peor zona (acera)              | `#39ff14` 9.09                | `#00ff88` 13.51               | `#b8f818` 6.37                |
| frog / río                            | 13.41                         | 14.21                         | 9.56                          |
| frog sobre tronco (solape)            | 5.48                          | — (tronco en contorno)        | contorno `#000000` 2 px       |
| frog sobre tortuga (solape)           | **1.55 falla**                | — (tortuga en contorno)       | contorno `#000000` 2 px       |
| boca / seto                           | `goalSlot` 4.63               | `goalBorder` `#00f5ff` 13.38  | `goalSlot` 6.60               |
| goalBorder / boca                     | `#e6b422` 7.71                | `#00f5ff` 14.58               | `#fcfcfc` 20.47               |
| frog en boca ocupada                  | 10.95                         | 14.73                         | 16.51                         |
| hudText (texto) / banda               | `#ffffff` 11.56               | `#e6e9ff` 16.43               | `#fcfcfc` 20.47               |
| vidas (`frog`) / banda                | 8.52                          | 14.73                         | 16.51                         |
| timerHigh / banda                     | 8.52                          | 14.73                         | 16.51                         |
| timerMid / banda                      | 8.00                          | 18.05                         | 20.47                         |
| timerLow / banda                      | 3.56                          | 5.15                          | 5.56                          |
| laneMark                              | decorativo                    | decorativo                    | decorativo                    |
| logGrain, turtleScales                | decorativo (detalle interior) | decorativo (detalle interior) | decorativo (detalle interior) |
| windshield, wheel, frogEye, frogPupil | decorativo (detalle interior) | decorativo (detalle interior) | decorativo (detalle interior) |

Retro con contorno: rana `#b8f818` vs contorno `#000000` 16.51; contorno vs tronco `#ac7c00` 5.64; contorno vs tortuga `#f83800` 5.56. `neon` y `retro` pasan todos los roles (elementos ≥ 3:1, texto ≥ 4.5:1). `clasico` falla en tronco, tortuga hundida y rana sobre tortuga; no se cambia (cero cambio visual).

Convenciones:

- `clasico` guarda los literales actuales como cadenas idénticas (`"#111"`, `"rgba(46, 204, 113, 0.45)"`, `"rgba(0, 0, 0, 0.6)"`, etc.).
- Estilo ramificado por `p.id` (`"clasico" | "neon" | "retro"`), igual que `TetrisEngine`.
- Todo `shadowBlur` > 0 va dentro de `ctx.save()/ctx.restore()`; `drawFrogShape` ya usa `save/restore`.
- Las vidas del HUD usan `p.frog` (hoy comparten `#39ff14` con la rana).
- El loop de `FroggerEngine.start()` llama `draw()` en cada frame también en pausa y en game over: `setSkin` se ve al instante sin tocar `update()`.

## Plan de implementación

1. Crear `lib/games/frogger/skins.ts` con `FroggerPalette` y `FROGGER_SKINS` copiando la tabla de paleta. Verificar: `npx tsc --noEmit` sin errores nuevos.
2. `lib/games/frogger/engine.ts` (parte 1, `clasico`): importar `DEFAULT_SKIN`, `SkinId` y `FROGGER_SKINS`; añadir `private palette = FROGGER_SKINS[DEFAULT_SKIN]` y `setSkin(id) { this.palette = FROGGER_SKINS[id]; }`; eliminar `CAR_COLORS`; sustituir cada literal de `draw()`, `drawGoals()`, `drawEntity()`, `drawFrogShape()` y `drawHud()` por su rol (`p.cars[lane.row] ?? p.carDefault`, `p.river`, `p.timerHigh`…). Solo estilo `clasico`. Verificar: `npx tsc --noEmit` sin errores y `/juegos/frogger/jugar` se ve igual que antes.
3. `engine.ts` (parte 2, `neon`): si `p.id === "neon"`, coches, camiones, troncos y tortugas visibles con `strokeRect`/`stroke` 2 px y `shadowBlur = p.glow` + `shadowColor` del rol dentro de `save()/restore()`; rana con cuerpo `stroke` 3 px y glow; borde de boca con glow. Verificar: `npx tsc --noEmit` sin errores.
4. `engine.ts` (parte 3, `retro`): si `p.id === "retro"`, `x` de entidades con `Math.round`, ruedas y vidas como `fillRect` cuadrados, centro de tortugas y rana redondeado, rana con `stroke` 2 px `frogOutline` tras el relleno y `lineCap = "butt"`, barra de tiempo con ancho redondeado. Verificar: `npx tsc --noEmit` sin errores.
5. `components/games/frogger-game.tsx`: importar `readStoredSkin` y `SkinId` de `@/lib/games/skins`; tras `new FroggerEngine(...)` llamar `engine.setSkin(readStoredSkin())` antes de `engine.start()`; añadir `setSkin?` a `FroggerGameHandle` y `setSkin: (id) => engineRef.current?.setSkin(id)` a `useImperativeHandle`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos; `/juegos/frogger/jugar` muestra el selector CLÁSICO / NEÓN / RETRO.
6. Gate: `npx tsc --noEmit`, `npm run lint` (salvo los errores preexistentes de `app/page.tsx`, BACKLOG #2) y `npm run build`. Verificar: los tres terminan sin errores nuevos.

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores; `npm run lint` no añade errores nuevos.
- [ ] Con `clasico`, captura de `/juegos/frogger/jugar` idéntica a la actual (carretera negra, río azul marino, aceras verde oscuro, seto verde, coches amarillo/azul/rojo, troncos marrones, tortugas verdes, rana `#39ff14`, HUD con banda translúcida).
- [ ] `lib/games/frogger/engine.ts` no contiene ningún literal `#hex`, `rgb(`/`rgba(` ni nombre de color, y no existe `CAR_COLORS`.
- [ ] El HUD de `/juegos/frogger/jugar` y el overlay de pausa muestran el selector CLÁSICO / NEÓN / RETRO.
- [ ] Con `neon`: fondo `#0a0a0f`, vehículos, troncos y tortugas en contorno con glow, rana verde `#00ff88` con glow, bocas con borde cian.
- [ ] Con `retro`: río `#0000bc`, aceras `#940084`, seto `#00a800`, tortugas rojas y troncos marrones rellenos, rana lima con contorno negro de 2 px, sin glow, solo los 8 colores NES.
- [ ] Cambiar de skin en pausa no reinicia la partida: score, vidas, nivel, temporizador, bocas ocupadas y posiciones se mantienen y el canvas se redibuja con la skin nueva.
- [ ] Cambiar de skin durante la partida no reinicia ni pausa el juego.
- [ ] La skin elegida en Tetris o Asteroids se aplica también al abrir Frogger (clave global `arcade-vault:skin`).
- [ ] La tortuga sumergida se distingue de la visible en las tres skins.
- [ ] Hitboxes, velocidades, temporizador y puntuación no cambian en ninguna skin.
- [ ] `/juegos/tetris/jugar`, `/juegos/asteroids/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` funcionan igual.

## Decisiones

- **Sí:** reutilizar `lib/games/skins.ts`, `setSkin?` de `GameEngineHandle` y `SkinSelector` de `components/player.tsx` sin cambios. Patrón único para todos los juegos.
- **Sí:** `palette` como campo de `FroggerEngine`. Todo el dibujo vive en métodos del motor (no hay clases de entidad como en Asteroids), así que basta `this.palette`.
- **Sí:** `setSkin?` opcional en `FroggerGameHandle`, igual que `TetrisGameHandle` y `AsteroidsGameHandle`.
- **Sí:** `cars: Record<number, string>` + `carDefault`. Mantiene la indexación por fila actual y el fallback `?? "#ff4d5e"` sin literal. (decisión del agente, revisar)
- **Sí:** medir contraste contra el fondo de la zona donde se dibuja cada rol (carretera, río, acera, seto, banda HUD). Frogger tiene fondo por zonas; medir solo contra `background` falsearía troncos y tortugas. (decisión del agente, revisar)
- **Sí:** parabrisas, ruedas, vetas, escamas y ojos como detalle interior decorativo. El elemento se identifica por su silueta, que sí se mide. (decisión del agente, revisar)
- **Sí:** neon con zonas en `--bg`/`--bg-2`/`--bg-3`. Separa carretera, río y aceras sin salir de los tokens del sitio. (decisión del agente, revisar)
- **Sí:** neon con troncos y tortugas en contorno. Además de seguir la regla neon, deja la rana sobre el fondo del río y elimina el solape de baja legibilidad de `clasico`. (decisión del agente, revisar)
- **Sí:** neon rana verde, troncos amarillos, tortugas cian, coches amarillo/cian/magenta, cabinas magenta. Verde = jugador, magenta = peligro. (decisión del agente, revisar)
- **Sí:** glow neon `shadowBlur = 12` en vehículos, troncos, tortugas visibles, rana y bordes de boca; sin glow en marcas, detalles, texto ni barra de tiempo. Dentro de 8–16, igual que Asteroids. (decisión del agente, revisar)
- **Sí:** retro con 8 colores NES evocando el Frogger arcade. Consistente con la paleta NES de `TETRIS_SKINS.retro`. (decisión del agente, revisar)
- **No:** acera verde `#00a800` en retro. La rana lima sobre ella queda en 2.50:1; el púrpura `#940084` da 6.37:1 y es el color de las aceras del arcade.
- **Sí:** contorno negro de 2 px en la rana retro. Separa la rana de troncos (2.93:1) y tortugas (2.97:1) al solaparse. (decisión del agente, revisar)
- **Sí:** coche de la fila 10 en verde `#00a800` en retro. Dentro de las 8 de la paleta; se distingue de la rana lima por tono y forma. (decisión del agente, revisar)
- **No:** amarillo en retro. Excedería 8 colores; la barra de tiempo media usa blanco.
- **No:** corregir tronco, tortuga hundida ni rana sobre tortuga en `clasico`. Cero cambio visual; se reporta para decidir si va a `specs/BACKLOG.md`.
- **No:** sprites PNG. Frogger no tiene assets y no se inventan.

## Riesgos

| Riesgo                                                                              | Mitigación                                                                                        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `clasico` falla contraste: tronco `#7a4a1f` sobre río 2.45:1                        | No se cambia (cero cambio visual). Se reporta al usuario para decidir si va a `specs/BACKLOG.md`. |
| `clasico` falla contraste: tortuga hundida ≈`#186653` sobre río 2.65:1              | Igual que arriba. `neon` y `retro` la dibujan a ≥ 3:1.                                            |
| `clasico` rana `#39ff14` sobre tortuga `#2ecc71` 1.55:1 (solape)                    | Igual que arriba. `neon` usa tortugas en contorno y `retro` contorno negro en la rana.            |
| `shadowBlur` sin resetear tiñe marcas, HUD o texto                                  | Todo dibujo con glow dentro de `save()/restore()`.                                                |
| Glow en ~30 entidades por frame baja FPS                                            | `shadowBlur` 12 solo en siluetas; verificar 60 FPS en nivel 5+ en `npm run dev`.                  |
| Troncos neon en contorno parecen huecos y confunden dónde se puede pisar            | Contorno amarillo con glow + vetas; verificar en `npm run dev` que se lee como plataforma.        |
| Coches en contorno neon y entidades redondeadas en retro desplazan el dibujo ≤ 1 px | Aceptado; colisiones usan `covers()` sobre `col`, no el dibujo.                                   |
| Ruedas `#111` de `clasico` casi invisibles sobre carretera negra (1.11:1)           | Detalle decorativo; no se cambia en `clasico`.                                                    |

## Lo que **no** está en esta spec

- Sistema de skins compartido y selector (ya implementados por la spec de skins de Tetris).
- Corrección de contraste de `clasico`.
- Skins de Arkanoid y Snake.
- Sprites PNG o fuentes nuevas.
- Controles táctiles de Frogger.
- Cambios de gameplay.

Cada uno, si llega, va en su propia spec.
