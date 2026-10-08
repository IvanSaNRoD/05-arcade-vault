# SPEC SKINS asteroids — Skins clásica, neón y retro para Asteroids

> **Status:** Borrador
> **Depends on:** SPEC 05, `specs/skins/tetris-skins.md`
> **Date:** 2026-10-09
> **Objective:** Añadir a Asteroids las skins `clasico` / `neon` / `retro` mediante `lib/games/asteroids/skins.ts` y `setSkin()` en `AsteroidsEngine`, reutilizando el sistema de skins y el selector creados por la spec de skins de Tetris.

## Por qué existe esta spec

La auditoría del 2026-10-09 marca Asteroids como no conforme: no existe `lib/games/asteroids/skins.ts`, `AsteroidsEngine` no expone `setSkin()` y `lib/games/asteroids/engine.ts` tiene los colores fijos en cada `draw()` (`#fff`, `#0ff`, `#000`, `rgba(255, 130, 0, 0.85)`, `rgba(255,255,255,…)`). Asteroids no usa sprites PNG: todo son primitivas de canvas. Esta spec copia el patrón de Tetris (`TETRIS_SKINS`, `setSkin`, `readStoredSkin` en el bridge) y no toca la infraestructura compartida.

## Scope

**In:**

- `lib/games/asteroids/skins.ts`: `AsteroidsPalette extends SkinPalette` y `ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette>` con las paletas de la tabla.
- `lib/games/asteroids/engine.ts`: campo `palette`, método `setSkin(id)`; los `draw()` de `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y `drawOverlay()` / `draw()` del motor reciben la paleta y no contienen literales de color.
- Estilos de dibujo por skin (`clasico` sin cambios, `neon` contorno + glow, `retro` relleno sólido + coordenadas enteras).
- `components/games/asteroids-game.tsx`: `setSkin` en `AsteroidsGameHandle` y en `useImperativeHandle`; al montar llama `engine.setSkin(readStoredSkin())`.

**Out of scope (para specs futuras):**

- `lib/games/skins.ts`, `setSkin?` en `GameEngineHandle` y el selector de `components/player.tsx`: los crea la spec de skins de Tetris y aquí se reutilizan tal cual.
- Skins de Arkanoid y Snake.
- Sprites PNG para la nave o los asteroides.
- Fuentes pixel en el canvas.
- Cambios de gameplay (hitboxes, velocidades, puntos).

## Modelo de datos

```ts
// lib/games/asteroids/skins.ts
import type { SkinId, SkinPalette } from "@/lib/games/skins";

export interface AsteroidsPalette extends SkinPalette {
  ship: string;
  thruster: string;
  asteroid: string;
  bullet: string;
  powerUp: string; // rombo
  powerUpText: string; // "3x"
  particle: string;
  overlayTitle: string; // "GAME OVER"
  overlaySub: string; // "PUNTAJE: … — ESPACIO PARA REINICIAR"
  lineWidth: number; // nave y asteroides
}

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsPalette>;
```

```ts
// lib/games/asteroids/engine.ts — API nueva / cambiada
class AsteroidsEngine {
  private palette: AsteroidsPalette; // = ASTEROIDS_SKINS[DEFAULT_SKIN]
  setSkin(id: SkinId): void; // solo cambia this.palette; no toca entidades, score ni estado
}
// Cada entidad: draw(ctx: CanvasRenderingContext2D, p: AsteroidsPalette)
```

```ts
// components/games/asteroids-game.tsx
export interface AsteroidsGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
  setSkin: (id: SkinId) => void;
}
```

Paleta (role × skin):

| rol          | clasico                   | neon                        | retro                |
| ------------ | ------------------------- | --------------------------- | -------------------- |
| background   | `#000`                    | `#0a0a0f`                   | `#000000`            |
| ship         | `#fff`                    | `#00f5ff`                   | `#55ffff`            |
| thruster     | `rgba(255, 130, 0, 0.85)` | `#f5ff00`                   | `#ff5555`            |
| asteroid     | `#fff`                    | `#ff006e`                   | `#ff55ff`            |
| bullet       | `#fff`                    | `#f5ff00`                   | `#ffffff`            |
| powerUp      | `#0ff`                    | `#00ff88`                   | `#ffff55`            |
| powerUpText  | `#0ff`                    | `#00ff88`                   | `#ffff55`            |
| particle     | `#fff` (alfa `ttl/life`)  | `#e6e9ff` (alfa `ttl/life`) | `#aaaaaa` (sin alfa) |
| overlayTitle | `#fff`                    | `#e6e9ff`                   | `#ffffff`            |
| overlaySub   | `rgba(255,255,255,0.65)`  | `#8a8fb5`                   | `#aaaaaa`            |
| lineWidth    | `1.5`                     | `2`                         | `2`                  |
| glow         | `0`                       | `12`                        | `0`                  |

Retro: 7 colores del CGA de 16 colores (`#000000`, `#ffffff`, `#aaaaaa`, `#55ffff`, `#ff55ff`, `#ffff55`, `#ff5555`). Nave cian y rocas magenta evocan la paleta 1 de alta intensidad del modo 4 de CGA.

Estilo de dibujo por skin:

| elemento  | clasico (actual)                         | neon                                                                       | retro                                                                                              |
| --------- | ---------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| nave      | contorno 1.5 px, `lineJoin = "round"`    | contorno 2 px, `shadowBlur = 12`, `shadowColor = ship`                     | relleno sólido del mismo polígono, `lineJoin = "miter"`, `translate(Math.round(x), Math.round(y))` |
| llama     | contorno 1.5 px `thruster`               | contorno 2 px, `shadowBlur = 12`, `shadowColor = thruster`                 | contorno 2 px, sin glow                                                                            |
| asteroide | contorno 1.5 px                          | contorno 2 px, `shadowBlur = 12`, `shadowColor = asteroid`                 | relleno sólido del polígono, `translate` redondeado                                                |
| bala      | `arc` radio 2 relleno                    | `arc` radio 2 relleno, `shadowBlur = 12`, `shadowColor = bullet`           | `fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4)`                                             |
| power-up  | rombo 2 px + texto `bold 12px monospace` | rombo 2 px + texto, `shadowBlur = 12`, `shadowColor = powerUp`             | rombo 2 px, centro redondeado, sin glow                                                            |
| partícula | línea 1 px, alfa `ttl/life`              | línea 1 px, alfa `ttl/life`, sin glow                                      | `fillRect(Math.round(x), Math.round(y), 2, 2)`, alfa 1                                             |
| overlay   | `bold 46px` + `18px monospace`           | mismas fuentes, título con `shadowBlur = 12`, `shadowColor = overlayTitle` | mismas fuentes, sin glow, coordenadas enteras                                                      |

Contraste (WCAG, fondo = `background` de cada skin; colores con alfa medidos mezclados sobre el fondo):

| rol                  | clasico (`#000000`)                       | neon (`#0a0a0f`) | retro (`#000000`) |
| -------------------- | ----------------------------------------- | ---------------- | ----------------- |
| ship                 | `#ffffff` 21.00                           | `#00f5ff` 14.58  | `#55ffff` 17.13   |
| thruster             | `rgba(255,130,0,0.85)` ≈ `#d96f00` 6.20   | `#f5ff00` 18.05  | `#ff5555` 6.68    |
| asteroid             | `#ffffff` 21.00                           | `#ff006e` 5.15   | `#ff55ff` 8.00    |
| bullet               | `#ffffff` 21.00                           | `#f5ff00` 18.05  | `#ffffff` 21.00   |
| powerUp              | `#00ffff` 16.75                           | `#00ff88` 14.73  | `#ffff55` 19.69   |
| powerUpText (texto)  | `#00ffff` 16.75                           | `#00ff88` 14.73  | `#ffff55` 19.69   |
| overlayTitle (texto) | `#ffffff` 21.00                           | `#e6e9ff` 16.43  | `#ffffff` 21.00   |
| overlaySub (texto)   | `rgba(255,255,255,0.65)` ≈ `#a6a6a6` 8.60 | `#8a8fb5` 6.28   | `#aaaaaa` 9.04    |
| particle             | decorativo                                | decorativo       | decorativo        |

Todos los roles pasan (elementos ≥ 3:1, texto ≥ 4.5:1) en las tres skins.

Convenciones:

- `clasico` guarda los literales actuales como cadenas idénticas (`"#fff"`, `"#0ff"`, `"#000"`, `"rgba(255, 130, 0, 0.85)"`, `"rgba(255,255,255,0.65)"`).
- Partícula `clasico`/`neon`: `strokeStyle = particle` + `globalAlpha = Number((ttl / life).toFixed(2))`, restaurado a 1 después. Para `#fff` es equivalente píxel a píxel al `rgba(255,255,255,a)` actual.
- Todo `shadowBlur` > 0 va dentro de `ctx.save()/ctx.restore()` o se resetea a 0 tras el trazo.
- Estilo ramificado por `p.id` (`"clasico" | "neon" | "retro"`), igual que Tetris.
- Como el loop de `AsteroidsEngine.start()` llama `draw()` también en pausa, `setSkin` se ve al instante.

## Plan de implementación

1. Crear `lib/games/asteroids/skins.ts` con `AsteroidsPalette` y `ASTEROIDS_SKINS` copiando la tabla de paleta. Verificar: `npx tsc --noEmit` sin errores nuevos.
2. `lib/games/asteroids/engine.ts` (parte 1, `clasico`): añadir `private palette = ASTEROIDS_SKINS[DEFAULT_SKIN]` y `setSkin(id)`. Cambiar la firma de cada `draw(ctx)` de entidad a `draw(ctx, p)` y sustituir cada literal por su rol (`Bullet` → `bullet`, `Asteroid` → `asteroid`, `PowerUp` → `powerUp`/`powerUpText`, `Ship` → `ship`/`thruster`, `Particle` → `particle` + `globalAlpha`, fondo → `background`, `drawOverlay` → `overlayTitle`/`overlaySub`, `lineWidth` 1.5 → `p.lineWidth`). Solo estilo `clasico`. Verificar: `npx tsc --noEmit` sin errores y `/juegos/asteroids/jugar` se ve igual que antes.
3. `engine.ts` (parte 2, `neon`): en cada `draw`, si `p.id === "neon"`, envolver en `save()/restore()` con `shadowBlur = p.glow` y `shadowColor` = color del rol (partículas sin glow). Verificar: `npx tsc --noEmit` sin errores.
4. `engine.ts` (parte 3, `retro`): si `p.id === "retro"`, nave y asteroides con `fill()` en vez de `stroke()`, `translate(Math.round(x), Math.round(y))`, balas `fillRect` 4×4, partículas `fillRect` 2×2 sin alfa, llama y rombo a `lineWidth = 2`. Verificar: `npx tsc --noEmit` sin errores.
5. `components/games/asteroids-game.tsx`: tras `new AsteroidsEngine(...)` llamar `engine.setSkin(readStoredSkin())` antes de `start()`; añadir `setSkin` a `AsteroidsGameHandle` y a `useImperativeHandle` (`setSkin: (id) => engineRef.current?.setSkin(id)`). Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos; `/juegos/asteroids/jugar` muestra el selector CLÁSICO / NEÓN / RETRO.
6. Gate: `npx tsc --noEmit`, `npm run lint` (salvo los errores preexistentes de `app/page.tsx`, BACKLOG #2) y `npm run build`.

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores; `npm run lint` no añade errores nuevos.
- [ ] Con `clasico`, captura de `/juegos/asteroids/jugar` idéntica a la actual (fondo negro, nave/rocas/balas blancas a 1.5 px, power-up cian, llama naranja, partículas blancas que se desvanecen).
- [ ] `lib/games/asteroids/engine.ts` no contiene ningún literal `#hex`, `rgb(`/`rgba(` ni nombre de color.
- [ ] El HUD de Asteroids muestra el selector CLÁSICO / NEÓN / RETRO de la spec de Tetris.
- [ ] Con `neon`: fondo `#0a0a0f`, nave cian, rocas magenta, balas y llama amarillas, power-up verde, todos con glow.
- [ ] Con `retro`: fondo negro, nave cian y rocas magenta rellenas, balas cuadradas blancas 4×4, partículas cuadradas grises, sin glow.
- [ ] Cambiar de skin en pausa no reinicia la partida: score, vidas, nivel y posiciones se mantienen y el canvas se redibuja con la skin nueva.
- [ ] Cambiar de skin durante la partida no reinicia ni pausa el juego.
- [ ] La skin elegida en Tetris se aplica también al abrir Asteroids (clave global `arcade-vault:skin`).
- [ ] El overlay "GAME OVER" del canvas se lee en las tres skins.
- [ ] Hitboxes, velocidades y puntuación no cambian en ninguna skin.
- [ ] `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` funcionan igual.

## Decisiones

- **Sí:** reutilizar `lib/games/skins.ts`, `setSkin?` de `GameEngineHandle` y el selector de `player.tsx` de la spec de Tetris sin cambios. Patrón único para todos los juegos.
- **Sí:** pasar la paleta como parámetro a cada `draw(ctx, p)`. Las entidades son clases sin acceso al motor; no se añade estado global de módulo. (decisión del agente, revisar)
- **No:** guardar la paleta en cada entidad. Obligaría a recorrer todas al cambiar de skin.
- **Sí:** `clasico` con los literales actuales como cadenas idénticas. Cero cambio visual.
- **Sí:** partículas vía `globalAlpha` en vez de construir `rgba()` en cada frame. Mismo resultado para `#fff` y permite cualquier color de paleta. (decisión del agente, revisar)
- **Sí:** neon nave cian, rocas magenta, balas y llama amarillas, power-up verde. Separa amigo/enemigo/disparo/bonus con los 4 acentos del sitio. (decisión del agente, revisar)
- **Sí:** glow neon `shadowBlur = 12` en todos los elementos salvo partículas. Dentro de 8–16; sin glow en partículas por rendimiento. (decisión del agente, revisar)
- **Sí:** retro con 7 colores del CGA de 16 colores. CGA es contemporáneo del Asteroids de PC y sus tonos claros pasan 3:1 sobre negro. (decisión del agente, revisar)
- **No:** paleta Game Boy. Sus verdes oscuros no distinguen nave, rocas y balas con contraste suficiente.
- **Sí:** retro con nave y asteroides rellenos. Cumple "relleno sólido" de la regla retro. (decisión del agente, revisar)
- **No:** retro solo con contornos de 2 px. Se parecería demasiado a `clasico`.
- **Sí:** retro con balas 4×4 y partículas 2×2 cuadradas en coordenadas enteras. Aspecto pixel sin cambiar hitboxes (las colisiones usan `radius`, no el dibujo).
- **No:** sprites PNG. Asteroids no tiene assets y no se inventan.
- **No:** fuente pixel en el overlay retro. Requiere un asset/fuente nueva.

## Riesgos

| Riesgo                                                                                          | Mitigación                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| La spec de skins de Tetris no está implementada: no existen `lib/games/skins.ts` ni el selector | Implementar `specs/skins/tetris-skins.md` antes; esta spec no arranca sin ella.                             |
| `shadowBlur` sin resetear tiñe partículas u overlay                                             | Todo dibujo con glow dentro de `save()/restore()`.                                                          |
| Asteroides rellenos en retro se fusionan visualmente al solaparse                               | Aceptado; las rocas se separan rápido y la colisión no depende del dibujo.                                  |
| Polígonos rotados no quedan alineados al píxel aunque se redondee el `translate`                | Aceptado; el redondeo evita el temblor subpíxel del centro, que es lo perceptible.                          |
| Glow en muchas rocas pequeñas (niveles altos) baja FPS                                          | `shadowBlur` 12; verificar 60 FPS en nivel 5+ en `npm run dev`.                                             |
| Partícula `clasico` con `globalAlpha` difiere del `rgba` actual                                 | Mismo valor de alfa redondeado (`toFixed(2)`) y mismo color; comparar capturas en el criterio de `clasico`. |

## Lo que **no** está en esta spec

- Sistema de skins compartido y selector (spec de skins de Tetris).
- Skins de Arkanoid y Snake.
- Sprites PNG o fuentes nuevas.
- Cambios de gameplay.

Cada uno, si llega, va en su propia spec.
