# SPEC NN — Gamepad móvil para Frogger

> **Status:** Borrador
> **Depends on:** SPEC 11
> **Date:** 2026-10-14
> **Objective:** Añadir a la entrada `frogger` de `GAME_ENGINES` un `touchControls` (`GamepadLayout`) que lleve los 4 saltos de la rana al D-pad, para que Frogger sea jugable en el navegador móvil con el gamepad de SPEC 11.

## Por qué existe esta spec

Frogger se implementó con `specs/game-jam/frogger/frogger-core.md`, que dejó fuera "Controles táctiles o mobile". Su entrada en `lib/games/registry.ts` es `frogger: { component: FroggerGame }`, sin `touchControls`. Por eso `components/player.tsx` no renderiza `<TouchControls>` ni `.rotate-hint`, y en móvil el juego no tiene ninguna forma de mover la rana. El motor `lib/games/frogger/engine.ts` solo escucha `keydown` en `window` y lee `e.code` (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` → un salto de 1 celda; `KeyP`/`Escape` → pausa). No usa `keyCode`, `e.repeat`, `keyup` ni ratón. Los `KeyboardEvent` sintéticos de `TouchControls` bastan sin tocar el motor.

## Scope

**In:**

- `lib/games/registry.ts`: añadir `touchControls` a la entrada `frogger` con este mapeo (formato de SPEC 11):

  | Juego   | ↑                | ↓                  | ←                  | →                   | A   | B   |
  | ------- | ---------------- | ------------------ | ------------------ | ------------------- | --- | --- |
  | frogger | ArrowUp saltar ↑ | ArrowDown saltar ↓ | ArrowLeft saltar ← | ArrowRight saltar → | —   | —   |

  `—` = `null` → botón atenuado y `disabled`.

- Detalle por slot (se reutilizan las constantes `UP`, `DOWN`, `LEFT`, `RIGHT` del archivo):

  | Slot    | `label` | `ariaLabel`             | `code`       | `key`        | `repeat` |
  | ------- | ------- | ----------------------- | ------------ | ------------ | -------- |
  | `up`    | `↑`     | `Saltar hacia arriba`   | `ArrowUp`    | `ArrowUp`    | no       |
  | `down`  | `↓`     | `Saltar hacia abajo`    | `ArrowDown`  | `ArrowDown`  | no       |
  | `left`  | `←`     | `Saltar a la izquierda` | `ArrowLeft`  | `ArrowLeft`  | no       |
  | `right` | `→`     | `Saltar a la derecha`   | `ArrowRight` | `ArrowRight` | no       |
  | `a`     | —       | —                       | —            | —            | —        |
  | `b`     | —       | —                       | —            | —            | —        |

- Sustituir el comentario `// tiene vidas → corazones; sin touchControls (móvil fuera de alcance de su spec)` por `// tiene vidas → corazones`.

**Out of scope (para specs futuras):**

- Cambios en `lib/games/frogger/engine.ts`, `components/games/frogger-game.tsx` o `GameEngineHandle`.
- Cambios en `components/touch-controls.tsx`, `components/player.tsx` o en el CSS `.gp*` de `app/globals.css`.
- Acciones en A/B (p. ej. duplicar "saltar ↑" en A).
- Pausa en el gamepad (sigue en el botón PAUSA del HUD).
- Gestos de swipe sobre el canvas, layout horizontal, Fullscreen API (fuera ya en SPEC 10/11).
- Responsive de las rutas del sitio.

## Modelo de datos

Esta spec no introduce estructuras nuevas. Reutiliza `TouchButton`, `GamepadSlot` y `GamepadLayout` de SPEC 11.

```ts
// lib/games/registry.ts — entrada frogger
frogger: {
  component: FroggerGame,
  touchControls: {
    up: { ...UP, label: "↑", ariaLabel: "Saltar hacia arriba" },
    down: { ...DOWN, label: "↓", ariaLabel: "Saltar hacia abajo" },
    left: { ...LEFT, label: "←", ariaLabel: "Saltar a la izquierda" },
    right: { ...RIGHT, label: "→", ariaLabel: "Saltar a la derecha" },
    a: null,
    b: null,
  },
},
```

Convenciones:

- Un toque = un `keydown` = un salto de 1 celda. El motor guarda `pendingDir` y lo consume cuando termina el salto en curso (`JUMP_MS = 120`).
- Sin `repeat`: mantener pulsado no encadena saltos.
- El motor no tiene listener de `keyup`; el `keyup` que despacha `TouchControls` al soltar es inocuo.

## Plan de implementación

1. `lib/games/registry.ts`: añadir `touchControls` a `frogger` con los 6 slots del Modelo de datos y actualizar el comentario. Verificar: `npx tsc --noEmit` sin errores.
2. Gate: `npm run lint` (salvo errores preexistentes de `app/page.tsx`, BACKLOG #2) y `npm run build` sin errores nuevos. Verificar: `npm run dev`, DevTools 375×667 táctil en `/juegos/frogger/jugar` muestra el gamepad bajo el CRT.

## Criterios de aceptación

- [ ] `npx tsc --noEmit` y `npm run build` sin errores; `npm run lint` sin errores nuevos.
- [ ] Escritorio con ratón y ancho >720 px: `/juegos/frogger/jugar` no muestra gamepad y las flechas siguen moviendo la rana.
- [ ] DevTools 375×667 táctil: el gamepad aparece bajo el CRT de `/juegos/frogger/jugar`, sin scroll horizontal.
- [ ] Tocar `↑` hace saltar la rana exactamente 1 fila hacia arriba.
- [ ] Tocar `↓` hace saltar la rana exactamente 1 fila hacia abajo.
- [ ] Tocar `←` hace saltar la rana exactamente 1 columna a la izquierda.
- [ ] Tocar `→` hace saltar la rana exactamente 1 columna a la derecha.
- [ ] Mantener `↑` pulsado 1 s produce un único salto (sin auto-repeat).
- [ ] Tocar `↑` dos veces rápido (dentro de los 120 ms del salto) produce 2 saltos consecutivos.
- [ ] Soltar el dedo fuera del botón libera la tecla (el `data-pressed` desaparece).
- [ ] Slots `A` y `B` se ven atenuados (`.is-off`), están `disabled`, sin glow y sin leyenda.
- [ ] Cada botón activo del D-pad expone su `aria-label` (`Saltar hacia arriba`, `Saltar hacia abajo`, `Saltar a la izquierda`, `Saltar a la derecha`).
- [ ] Pulsar una flecha física ilumina el slot correspondiente del D-pad y se apaga al soltarla.
- [ ] Con el juego en pausa (botón PAUSA del HUD), tocar el D-pad no mueve la rana.
- [ ] Con el modal FIN DEL JUEGO abierto, tocar el D-pad no mueve la rana.
- [ ] Tocar el gamepad o el canvas no hace scroll, zoom, menú contextual ni selección de texto.
- [ ] Horizontal con poca altura en táctil muestra el aviso `.rotate-hint`.
- [ ] SALIR con un botón pulsado y volver a entrar no deja teclas pegadas ni duplica saltos.
- [ ] `/juegos/asteroids/jugar`, `/juegos/tetris/jugar`, `/juegos/arkanoid/jugar` y `/juegos/snake/jugar` mantienen su gamepad sin cambios.

## Decisiones

- **Sí:** los 4 saltos en el D-pad y A/B `null`. Mismo patrón que snake en SPEC 11; Frogger no tiene acciones aparte del movimiento. (decisión del agente, revisar)
- **No:** A = `ArrowUp` con leyenda `SALTAR`. Duplicaría el D-pad sin aportar combinaciones de dos pulgares como en asteroids/tetris. (decisión del agente, revisar)
- **Sí:** sin `repeat` en ningún slot. En Frogger cada salto es una decisión; encadenar saltos al mantener pulsado lleva a la rana al tráfico o al agua. (decisión del agente, revisar)
- **No:** `repeat: true` para imitar el auto-repeat del teclado físico. El motor no filtra `e.repeat`, así que con teclado sí se encadenan saltos; esa paridad no compensa el riesgo de saltos involuntarios en táctil. (decisión del agente, revisar)
- **Sí:** `ariaLabel` con verbo "Saltar". Describe la acción real del juego, no solo la dirección. (decisión del agente, revisar)
- **Sí:** pausa solo en el botón PAUSA del HUD. SPEC 11 deja fuera la pausa en el gamepad.
- **No:** tocar el motor. El input sintético ya produce `e.code` correcto; un cambio de motor iría en su propia spec.

## Riesgos

| Riesgo                                                                                  | Mitigación                                                                                             |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A 375 px el canvas 640×560 con `objectFit: contain` en el CRT 4:3 deja celdas de ~18 px | Aceptado: la rejilla 16×14 sigue legible; el gamepad está fuera del canvas y no tapa el tablero.       |
| Sin `repeat`, cruzar el río requiere muchos toques seguidos                             | Aceptado: `pendingDir` encola un salto durante la animación, así que los toques rápidos no se pierden. |
| CRT + HUD + gamepad no caben en alto en móviles bajos                                   | Aceptado como en SPEC 11; scroll vertical posible.                                                     |

## Lo que **no** está en esta spec

- Cambios en el motor, el bridge o `GameEngineHandle`.
- Cambios en `TouchControls`, `player.tsx` o el CSS del gamepad.
- Acciones en A/B.
- Pausa en el gamepad.
- Swipes sobre el canvas, layout horizontal, Fullscreen API.
- Responsive del sitio.

Cada uno, si llega, va en su propia spec.
