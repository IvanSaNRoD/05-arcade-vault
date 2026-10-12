# SPEC 10 — Controles táctiles para jugar en móvil

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-10-12
> **Objective:** Añadir botones virtuales táctiles bajo el CRT, visibles solo en dispositivos de puntero grueso, que despachan eventos de teclado sintéticos para que Asteroids, Tetris, Arkanoid y Snake sean jugables en un móvil en vertical.

## Por qué existe esta spec

Los cuatro motores solo escuchan `keydown`/`keyup` en `window` (Arkanoid además `mousemove` en el canvas). En un móvil no hay teclado: los juegos se renderizan pero no se pueden jugar. SPEC 09 dejó "Controles táctiles" explícitamente fuera. La solución elegida no toca ningún motor: un componente de controles traduce pulsaciones táctiles a `KeyboardEvent` con el mismo `code`/`key` que el motor ya escucha.

## Scope

**In:**

- `components/touch-controls.tsx` (`"use client"`): renderiza dos grupos de botones (izquierda = dirección/movimiento, derecha = acciones) a partir de un `TouchControlsLayout`.
- Cada botón usa Pointer Events: `pointerdown` → `setPointerCapture` + despacha `keydown`; `pointerup`/`pointercancel`/`lostpointercapture` → despacha `keyup`. Varios botones pulsados a la vez (multitouch) funcionan de forma independiente.
- Eventos sintéticos: `new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true })` despachados en `window`. Se rellenan `key` y `code` (Arkanoid lee `e.key`; el resto `e.code`).
- Auto-repeat para botones con `repeat: true`: tras `REPEAT_DELAY_MS = 170` repite `keydown` cada `REPEAT_INTERVAL_MS = 50` mientras se mantiene.
- Al desmontar el componente se despacha `keyup` de toda tecla aún pulsada y se limpian los timers.
- Vibración: `navigator.vibrate?.(10)` en cada `pointerdown`. No-op si no está soportado (p. ej. iOS Safari).
- `lib/games/registry.ts`: tipos `TouchButton` y `TouchControlsLayout`; campo opcional `touchControls` en `GameEngineEntry`, rellenado para los 4 juegos con este mapeo:

  | Juego     | Izquierda                                             | Derecha                               |
  | --------- | ----------------------------------------------------- | ------------------------------------- |
  | asteroids | `↺` ArrowLeft, `↻` ArrowRight (mantener)              | `▲` ArrowUp (mantener), `FUEGO` Space |
  | tetris    | `←` ArrowLeft, `→` ArrowRight, `↓` ArrowDown (repeat) | `ROTAR` ArrowUp, `CAÍDA` Space        |
  | arkanoid  | `←` ArrowLeft, `→` ArrowRight (mantener)              | —                                     |
  | snake     | D-pad `↑` `←` `→` `↓` (Arrow\*)                       | —                                     |

- `components/player.tsx`: renderiza `<TouchControls layout={engineEntry.touchControls} />` justo debajo de `.crt` si existe `touchControls`. Renderiza un aviso `.rotate-hint` ("GIRA EL MÓVIL A VERTICAL PARA JUGAR").
- `app/globals.css`:
  - `.touch-controls` oculto por defecto; visible solo con `@media (pointer: coarse)`.
  - Botones táctiles de mínimo 56×56 px, `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`, estado `:active`/`[data-pressed]` visible.
  - D-pad en cruz (grid 3×3) para Snake.
  - `.crt-screen canvas` con `touch-action: none`.
  - Bloqueo de pull-to-refresh y doble-tap zoom en el player: `html:has(.av-player) { overscroll-behavior-y: none; }` y `.av-player { touch-action: manipulation; }`.
  - `.rotate-hint` oculto por defecto; visible con `@media (pointer: coarse) and (orientation: landscape) and (max-height: 500px)`. No bloquea el juego.
  - Layout móvil del player en `@media (max-width: 720px)`: `.player-hud` en columna, `.hud-stat` más compactos, `.hud-actions` con wrap, sin scroll horizontal a 375 px.

**Out of scope (para specs futuras):**

- Gestos sobre el canvas (swipe en Snake/Tetris, arrastre de la pala en Arkanoid).
- Cambios en los motores `lib/games/*/engine.ts`.
- Nuevos métodos en `GameEngineHandle`.
- Layout horizontal optimizado (controles a los lados del CRT).
- Vibración en eventos de juego (game over, perder vida).
- Toggle manual para mostrar controles en escritorio.
- Pantalla completa / Fullscreen API.
- Ajustes del modal de fin de partida para teclado virtual del móvil.
- Controles táctiles para juegos sin motor (`.game-arena` simulado).

## Modelo de datos

```ts
// lib/games/registry.ts
export interface TouchButton {
  label: string; // texto visible: "←", "FUEGO", …
  ariaLabel: string; // "Girar a la izquierda", "Disparar", …
  code: string; // KeyboardEvent.code: "ArrowLeft", "Space", …
  key: string; // KeyboardEvent.key: "ArrowLeft", " ", …
  repeat?: boolean; // auto-repeat mientras se mantiene (solo Tetris ← → ↓)
}

export interface TouchControlsLayout {
  variant: "row" | "dpad"; // "dpad" = cruz 3×3 en el grupo izquierdo (Snake)
  left: TouchButton[]; // en "dpad", orden fijo: up, left, right, down
  right: TouchButton[];
}

export interface GameEngineEntry {
  component: /* sin cambios */;
  secondaryLabel?: string;
  touchControls?: TouchControlsLayout; // sin él, no se muestran controles
}
```

```ts
// components/touch-controls.tsx
export const REPEAT_DELAY_MS = 170;
export const REPEAT_INTERVAL_MS = 50;
export const VIBRATE_MS = 10;
export function TouchControls(props: {
  layout: TouchControlsLayout;
}): JSX.Element;
```

Convenciones:

- Mapeo `code` → `key`: `ArrowLeft/Right/Up/Down` → mismo string; `Space` → `" "`.
- Estado de teclas pulsadas en un `useRef<Map<string, timer | null>>` del componente; nunca a nivel de módulo.
- "Mantener" no requiere lógica extra: `keydown` al pulsar y `keyup` al soltar ya replica el teclado físico (Asteroids/Arkanoid usan mapas `keys`).
- Snake y Tetris ignoran `keyup`; recibirlo es inocuo.

## Plan de implementación

1. `lib/games/registry.ts`: añadir `TouchButton`, `TouchControlsLayout` y `touchControls?` en `GameEngineEntry`. Sin rellenar aún. Verificar: `npx tsc --noEmit` sin errores nuevos.
2. Crear `components/touch-controls.tsx`: helper `dispatchKey(type, btn)`, botón con handlers de Pointer Events, `setPointerCapture`, vibración, auto-repeat con `setTimeout` + `setInterval`, atributo `data-pressed`, cleanup en desmontaje (keyup + clearTimers). Render de grupos `row` y `dpad`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
3. Rellenar `touchControls` de los 4 juegos en `GAME_ENGINES` según la tabla del Scope. Verificar: `npx tsc --noEmit`.
4. `components/player.tsx`: renderizar `TouchControls` bajo `.crt` cuando `engineEntry?.touchControls` exista, y el `.rotate-hint`. Verificar: `npm run dev`, escritorio sin cambios visibles.
5. `app/globals.css`: estilos `.touch-controls`, botones, D-pad, `.rotate-hint`, media query `pointer: coarse`, `touch-action` en canvas/player, `overscroll-behavior` y ajustes `@media (max-width: 720px)` del HUD. Verificar: DevTools modo dispositivo (375×667, táctil) muestra controles; escritorio no.
6. Gate: `npx tsc --noEmit`, `npm run lint` (salvo errores preexistentes de `app/page.tsx`, BACKLOG #2) y `npm run build` sin errores nuevos.

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run build` terminan sin errores; `npm run lint` sin errores nuevos.
- [ ] En escritorio con ratón no se muestran controles táctiles ni aviso de orientación, y los 4 juegos funcionan igual con teclado.
- [ ] En DevTools modo dispositivo (375×667, táctil) los controles aparecen debajo del CRT en `/juegos/{asteroids,tetris,arkanoid,snake}/jugar`.
- [ ] A 375 px de ancho no hay scroll horizontal y el HUD (stats + PAUSA/FIN/SALIR) es visible y usable.
- [ ] Cada botón táctil mide al menos 56×56 px.
- [ ] Asteroids: mantener `↺`/`↻` gira la nave mientras se mantiene; mantener `▲` propulsa; `FUEGO` dispara una bala por toque.
- [ ] Asteroids: se puede girar y disparar a la vez con dos dedos.
- [ ] Tetris: `←`/`→` mueven la pieza una columna por toque y repiten al mantener; `↓` hace soft drop con repeat; `ROTAR` rota; `CAÍDA` hace hard drop.
- [ ] Arkanoid: mantener `←`/`→` mueve la pala y se detiene al soltar.
- [ ] Snake: el D-pad cambia la dirección; pulsar la dirección opuesta no invierte la serpiente.
- [ ] Soltar el dedo fuera del botón (arrastrando) libera la tecla: la nave deja de girar / la pala se detiene.
- [ ] Tocar botones o el canvas no hace scroll, zoom por doble tap, menú contextual ni selección de texto.
- [ ] Deslizar hacia abajo en el player no dispara pull-to-refresh (Chrome Android).
- [ ] En Android, cada pulsación de botón vibra brevemente; en iOS no falla nada.
- [ ] En horizontal con altura ≤ 500 px (táctil) aparece el aviso "GIRA EL MÓVIL A VERTICAL PARA JUGAR" y el juego sigue funcionando.
- [ ] PAUSA congela el juego; los botones táctiles no lo reanudan (los motores ignoran input en pausa).
- [ ] SALIR con un botón pulsado y volver a entrar no deja teclas "pegadas" ni errores en consola.
- [ ] Un juego sin motor (p. ej. `/juegos/gloton/jugar`) no muestra controles táctiles.

## Decisiones

- **Sí:** botones virtuales bajo el CRT. Predecibles y verificables; elección del usuario.
- **No:** gestos sobre el canvas. Ambiguos en Asteroids; otra spec si se quieren.
- **Sí:** `KeyboardEvent` sintéticos en `window`. Cero cambios en los 4 motores; reutiliza su input probado.
- **No:** API nueva en motores (`press/release`). Toca 4 motores + `GameEngineHandle` sin beneficio para este alcance.
- **Sí:** rellenar `key` y `code` en el evento. Arkanoid lee `e.key`, el resto `e.code`.
- **Sí:** Pointer Events + `setPointerCapture`. Unifican touch/ratón/stylus, soportan multitouch y garantizan `keyup` al soltar fuera.
- **No:** Touch Events (`touchstart`). API más antigua; requiere tracking manual de `identifier`.
- **Sí:** visibles solo con `@media (pointer: coarse)`. Escritorio sin cambios; CSS puro, sin detección JS ni hydration mismatch.
- **No:** toggle manual ni visibles siempre.
- **Sí:** config en `GAME_ENGINES.touchControls`. Mismo patrón que `secondaryLabel`; un juego nuevo declara sus controles en un solo sitio.
- **No:** archivo aparte `lib/games/touch-controls.ts`. Dispersa la config de cada juego.
- **Sí:** auto-repeat en el componente solo para Tetris `←`/`→`/`↓` (170 ms / 50 ms). Imita el repeat del teclado físico, que el motor de Tetris asume.
- **Sí:** Arkanoid solo con botones. Coherente con la decisión de no tocar motores.
- **Sí:** vertical como orientación objetivo + aviso no bloqueante en horizontal bajo.
- **No:** horizontal obligatoria ni overlay bloqueante.
- **Sí:** vibración de 10 ms solo al pulsar botón. Feedback táctil sin tocar motores ni `player.tsx` más allá del render.
- **No:** vibración en game over u otros eventos.
- **Sí:** pausa vía el botón PAUSA existente del HUD. No se duplica en los controles.

## Riesgos

| Riesgo                                                                         | Mitigación                                                                                                |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Tecla "pegada" si se pierde el `pointerup` (cambio de app, desmontaje)         | `keyup` también en `pointercancel` y `lostpointercapture`; cleanup en desmontaje libera todas las teclas. |
| `pointer: coarse` falso en portátiles táctiles o falso negativo en algún móvil | Aceptado; el toggle manual queda fuera de alcance y puede añadirse en otra spec.                          |
| `navigator.vibrate` no existe en iOS Safari                                    | Llamada con optional chaining; no-op.                                                                     |
| `html:has()` no soportado en navegadores antiguos                              | Degradación: puede aparecer pull-to-refresh; el juego sigue funcionando.                                  |
| Un juego futuro que lea otra propiedad del evento (`keyCode`, `repeat`)        | Documentado en Convenciones: los motores deben leer `e.code` o `e.key`.                                   |
| CRT + HUD + controles no caben en una sola pantalla en móviles bajos           | Aceptado; puede requerir scroll vertical. Layout horizontal optimizado fuera de alcance.                  |

## Lo que **no** está en esta spec

- Gestos (swipe, arrastre) sobre el canvas.
- Cambios en los motores o en `GameEngineHandle`.
- Layout horizontal optimizado.
- Vibración en eventos de juego.
- Toggle manual de controles.
- Fullscreen API.
- Ajustes del modal para teclado virtual.
- Controles para juegos sin motor.

Cada uno, si llega, va en su propia spec.
