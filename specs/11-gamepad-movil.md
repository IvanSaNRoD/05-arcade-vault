# SPEC 11 — Gamepad MK-II para móvil

> **Status:** Implementado
> **Depends on:** SPEC 10
> **Date:** 2026-10-12
> **Objective:** Sustituir los botones táctiles de SPEC 10 por un gamepad fijo (D-pad + A/B) con la apariencia de `references/resources/gamepad-assets/`, visible solo en dispositivos táctiles o pantallas de ≤720 px, con un mapeo de teclas por juego.

## Por qué existe esta spec

SPEC 10 hizo los 4 juegos jugables en móvil con botones genéricos cuyo layout cambia por juego (`variant: "row" | "dpad"`, grupos `left`/`right`). La referencia `gamepad-assets/` (HTML + PNG) define un gamepad neón fijo: carcasa, D-pad en cruz con hub y A/B circulares. Esta spec adopta ese diseño como único control táctil y traduce cada juego a ese layout fijo. El mecanismo de input de SPEC 10 (`KeyboardEvent` sintéticos en `window`, Pointer Events, auto-repeat, vibración, cleanup) no cambia.

## Scope

**In:**

- `lib/games/registry.ts`: `TouchControlsLayout` se reemplaza por `GamepadLayout` con 6 slots fijos (`up`, `down`, `left`, `right`, `a`, `b`); cada slot es `TouchButton | null`. `touchControls?` pasa a ser de tipo `GamepadLayout`. Mapeo:

  | Juego     | ↑                 | ↓                     | ←                     | →                      | A               | B                   |
  | --------- | ----------------- | --------------------- | --------------------- | ---------------------- | --------------- | ------------------- |
  | asteroids | ArrowUp propulsar | —                     | ArrowLeft girar       | ArrowRight girar       | Space `FUEGO`   | ArrowUp `PROPULSAR` |
  | tetris    | ArrowUp rotar     | ArrowDown bajar (rep) | ArrowLeft mover (rep) | ArrowRight mover (rep) | ArrowUp `ROTAR` | Space `CAÍDA`       |
  | arkanoid  | —                 | —                     | ArrowLeft mover       | ArrowRight mover       | —               | —                   |
  | snake     | ArrowUp           | ArrowDown             | ArrowLeft             | ArrowRight             | —               | —                   |

  `—` = `null` → botón atenuado y `disabled`.

- `components/touch-controls.tsx` (se mantienen nombre de archivo y export `TouchControls`): reescribe el render con la estructura de la referencia:
  - `.gp` (carcasa) > `.gp-body` > `.gp-col-left` con `.gp-dpad` (4 `.dp` + `.dp-hub` con `.dp-hub-gem`) y `.gp-col-right` con `.gp-actions` (`.ab.b` y `.ab.a`, cada uno con `.ab-ring` y `.ab-letter`), en ese orden (B a la izquierda de A, como la referencia).
  - Flechas del D-pad como los SVG inline de la referencia (triángulos `currentColor`).
  - Bajo A y B, leyenda `.ab-legend` con `TouchButton.label` (p. ej. `FUEGO`); si el slot es `null`, sin leyenda.
  - Slot `null` → `<button disabled aria-hidden>` con clase `.is-off`; no despacha nada.
  - Estado pulsado: clase/atributo `data-pressed` (equivalente a `.on` de la referencia) tanto por puntero como por teclado físico.
  - Feedback de teclado físico: listener `keydown`/`keyup` en `window` que marca `data-pressed` en todo slot cuyo `code` coincida con `e.code`. Los eventos sintéticos del propio componente también lo activan (inocuo).
  - Estado de pulsación indexado por **slot** (no por `code`): asteroids `↑` y `B` comparten `ArrowUp`. Se despacha `keyup` solo cuando ningún otro slot mantiene ese `code`.
  - Se conservan de SPEC 10: Pointer Events + `setPointerCapture`, `keyup` en `pointerup`/`pointercancel`/`lostpointercapture`, auto-repeat (`REPEAT_DELAY_MS`/`REPEAT_INTERVAL_MS`), `navigator.vibrate?.(VIBRATE_MS)`, cleanup en desmontaje, `onContextMenu` prevenido.
- `app/globals.css`: se elimina el bloque `.touch-controls`/`.tc-*` de SPEC 10 y se añade el CSS del gamepad portado de `gamepad.html`:
  - Colores con tokens existentes (`--cyan`, `--magenta`, `--ink*`, `--line`) y fuente `var(--pixel)` (ya cargada por `next/font`); sin `<link>` a Google Fonts.
  - Medidas de la referencia: D-pad 156 px / teclas 50 px, A/B 74 px; en `@media (max-width: 620px)` D-pad 144 px / teclas 46 px, A/B 64 px.
  - Visibilidad: `.gp` oculto por defecto; visible con `@media (pointer: coarse), (max-width: 720px)`.
  - Estilos `:hover` solo dentro de `@media (hover: hover)`.
  - `.dp-hub-gem` con animación `pulse-led`; desactivada en `@media (prefers-reduced-motion: reduce)`.
  - `.ab-ring` visible en estado pulsado.
  - `.is-off`: `opacity: .3`, sin glow, `cursor: default`.
  - Se mantienen en botones: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`.
  - Se mantienen sin cambios: `html:has(.av-player)`, `.av-player { touch-action }`, `.crt-screen canvas`, `.rotate-hint`, ajustes `@media (max-width: 720px)` del HUD.
- `components/player.tsx`: sin cambios funcionales (sigue renderizando `<TouchControls layout={engineEntry.touchControls} />` bajo `.crt`).

**Out of scope:**

- Cambios en motores `lib/games/*/engine.ts` o `GameEngineHandle`.
- Skins del gamepad (neón/retro) o colores por juego.
- Gestos sobre el canvas, layout horizontal, toggle manual, Fullscreen API (siguen fuera, como en SPEC 10).
- Botones extra (START/SELECT, pausa en el gamepad).
- Página standalone o demo del gamepad.
- Juegos sin motor (`.game-arena`).

## Modelo de datos

```ts
// lib/games/registry.ts
export interface TouchButton {
  label: string; // leyenda bajo A/B ("FUEGO", …); ignorada en el D-pad
  ariaLabel: string; // "Disparar", "Girar a la izquierda", …
  code: string; // KeyboardEvent.code
  key: string; // KeyboardEvent.key
  repeat?: boolean; // auto-repeat (solo Tetris ← → ↓)
}

export type GamepadSlot = "up" | "down" | "left" | "right" | "a" | "b";

// null = slot no usado por el juego → atenuado y disabled
export type GamepadLayout = Record<GamepadSlot, TouchButton | null>;

export interface GameEngineEntry {
  component: /* sin cambios */;
  secondaryLabel?: string;
  touchControls?: GamepadLayout; // sin él, no se muestra gamepad
}
```

```ts
// components/touch-controls.tsx
export const REPEAT_DELAY_MS = 170;
export const REPEAT_INTERVAL_MS = 50;
export const VIBRATE_MS = 10;
export function TouchControls(props: { layout: GamepadLayout }): JSX.Element;
```

Convenciones:

- Estado de pulsación: `useRef<Map<GamepadSlot, Timer>>`. `keyup` de un `code` solo si ningún otro slot pulsado comparte ese `code`.
- Feedback de teclado: estado React `Set<string>` de `code` físicamente pulsados → `data-pressed` en los slots que coinciden. Se limpia en `blur` de `window`.
- `TouchControlsLayout` y `variant` desaparecen; no quedan referencias.

## Plan de implementación

1. `lib/games/registry.ts`: añadir `GamepadSlot`, `GamepadLayout`; cambiar tipo de `touchControls`; reescribir los 4 mapeos según la tabla; eliminar `TouchControlsLayout`. Verificar: `npx tsc --noEmit` (fallará solo en `touch-controls.tsx`, esperado).
2. `components/touch-controls.tsx`: reescribir render con estructura `.gp` de la referencia, slots `null` deshabilitados, leyendas A/B, estado indexado por slot con `keyup` compartido, listener de teclado físico. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
3. `app/globals.css`: eliminar bloque `.touch-controls`/`.tc-*`; añadir CSS del gamepad (tokens, medidas, breakpoint 620, visibilidad `(pointer: coarse), (max-width: 720px)`, hover, reduced-motion, `.is-off`). Verificar: `npm run dev`, escritorio ancho sin gamepad; ventana ≤720 px y DevTools 375×667 táctil con gamepad igual a `gamepad-neon.png`.
4. Gate: `npx tsc --noEmit`, `npm run lint` (salvo errores preexistentes de `app/page.tsx`, BACKLOG #2) y `npm run build` sin errores nuevos.

## Criterios de aceptación

- [x] `npx tsc --noEmit` y `npm run build` sin errores; `npm run lint` sin errores nuevos.
- [x] No quedan referencias a `TouchControlsLayout`, `variant` ni clases `.tc-*` (`grep` vacío).
- [x] Escritorio con ratón y ancho >720 px: no se ve el gamepad; los 4 juegos funcionan con teclado.
- [x] Ventana de escritorio ≤720 px: el gamepad se ve y funciona con ratón.
- [x] DevTools 375×667 táctil: el gamepad aparece bajo el CRT en los 4 juegos con la apariencia de `gamepad-neon.png` (carcasa, D-pad en cruz con gema, B cian a la izquierda de A magenta).
- [x] A 375 px no hay scroll horizontal.
- [x] Teclas del D-pad ≥44×44 px (46 px a ≤620 px); A/B ≥64 px.
- [x] Slots `null` se ven atenuados, no responden y no tienen glow: Asteroids `↓`; Arkanoid `↑` `↓` A B; Snake A B.
- [x] Leyendas bajo A/B: Asteroids `FUEGO`/`PROPULSAR`; Tetris `ROTAR`/`CAÍDA`; sin leyenda en slots `null`.
- [x] Asteroids: `←`/`→` giran mientras se mantienen; `↑` y `B` propulsan; `A` dispara; girar + propulsar + disparar a la vez con varios dedos funciona.
- [x] Asteroids: mantener `↑` y `B`, soltar uno → la nave sigue propulsando hasta soltar el otro.
- [x] Tetris: `←`/`→`/`↓` con repeat al mantener; `↑` y `A` rotan; `B` hard drop.
- [x] Arkanoid: `←`/`→` mueven la pala y se detiene al soltar.
- [x] Snake: el D-pad cambia la dirección.
- [x] Al pulsar una tecla física (flechas, Space) el slot correspondiente se ilumina y se apaga al soltarla.
- [x] Estado pulsado visible: tecla D-pad hundida con glow cian; A/B hundidos con `.ab-ring` visible.
- [x] La gema del hub pulsa; con `prefers-reduced-motion: reduce` queda estática.
- [x] Sin hover pegado tras tocar en móvil.
- [x] Soltar el dedo fuera del botón libera la tecla; SALIR con un botón pulsado no deja teclas pegadas.
- [x] Tocar el gamepad no hace scroll, zoom, menú contextual ni selección de texto.
- [x] Un juego sin motor (`/juegos/gloton/jugar`) no muestra gamepad.

## Decisiones

- **Sí:** gamepad fijo D-pad + A/B con mapeo por juego. Fiel a la referencia; un solo layout para todos los juegos.
- **No:** solo reskin de los botones de SPEC 10. Mantendría layouts distintos por juego, lejos de la referencia.
- **Sí:** slots no usados atenuados y `disabled`. El gamepad conserva siempre su forma.
- **No:** ocultar slots no usados. El gamepad cambiaría de forma según el juego.
- **Sí:** visible con `(pointer: coarse), (max-width: 720px)`. Cubre móvil, tablet táctil y escritorio estrecho; 720 = breakpoint móvil existente del player.
- **No:** 620 px (breakpoint de la referencia) ni solo ancho. Se usa 620 solo para reducir medidas, como la referencia.
- **Sí:** medidas de la referencia (≥44 px). Fidelidad visual; 44 px es el mínimo WCAG / mobile-porter. Sustituye el criterio de 56 px de SPEC 10.
- **No:** escalar a 56 px.
- **Sí:** Asteroids `B` = propulsar (duplica `↑`); Tetris `A` = rotar (duplica `↑`). Permite combinaciones con dos pulgares.
- **Sí:** estado indexado por slot con `keyup` compartido. Necesario por los duplicados de `code`.
- **Sí:** `GamepadLayout = Record<GamepadSlot, TouchButton | null>` reemplazando `TouchControlsLayout`. Un único sistema; tipos fuerzan declarar los 6 slots.
- **No:** mantener ambos layouts. Dos sistemas para el mismo fin.
- **Sí:** leyenda bajo A/B. Hace descubrible el mapeo; `aria-label` siempre presente.
- **Sí:** feedback de teclado físico, gema pulsante y anillo A/B (extras de la referencia).
- **Sí:** reutilizar tokens y `var(--pixel)` de `globals.css`. Sin cargar fuentes extra.
- **Sí:** mantener archivo/export `TouchControls` y `player.tsx` intacto. Cambio acotado.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                   |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `keyup` prematuro al soltar uno de dos slots con el mismo `code`           | Estado por slot; `keyup` solo si ningún otro slot pulsado comparte `code` (criterio propio). |
| Tecla física "pegada" visualmente si se pierde `keyup` (cambio de ventana) | Limpiar el `Set` de teclas físicas en `blur` de `window`.                                    |
| Gamepad ~156 + 74 px de alto + CRT + HUD no caben en móviles bajos         | Aceptado (igual que SPEC 10); scroll vertical posible.                                       |
| `:hover` pegado en táctil                                                  | Hover solo en `@media (hover: hover)`.                                                       |
| Escritorio estrecho ve un gamepad que no necesita                          | Aceptado: decisión explícita; funciona con ratón y no interfiere con el teclado.             |

## Lo que **no** está en esta spec

- Cambios en motores o `GameEngineHandle`.
- Skins del gamepad.
- Botones START/SELECT o pausa en el gamepad.
- Gestos, layout horizontal, toggle manual, Fullscreen API.
- Gamepad para juegos sin motor.

Cada uno, si llega, va en su propia spec.
