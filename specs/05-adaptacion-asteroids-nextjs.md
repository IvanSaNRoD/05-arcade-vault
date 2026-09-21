# SPEC 05 — Adaptación del juego Asteroids a Next.js

> **Status:** Aprobada
> **Depends on:** SPEC 01
> **Date:** 2026-09-21
> **Objective:** Adaptar el juego de Asteroids (`references/resources/started-games/02-asteroids/game.js`) a un motor TypeScript + Client Component de Next.js que reemplaza el gameplay simulado de la entrada `"rocas"` (renombrada a `"asteroids"`) en `components/player.tsx` por partidas reales, conectado al HUD y a los botones PAUSA/FIN existentes.

## Por qué existe esta spec

`lib/games.ts` ya tiene una entrada con temática de asteroides (id `"rocas"`), pero `components/player.tsx` simula el gameplay de todos los juegos con un `setInterval` que suma puntos al azar. El juego real de Asteroids ya existe como prototipo standalone (canvas vanilla JS, sin dependencias) en `references/resources/started-games/02-asteroids/`. Esta spec lo porta al framework y renombra la entrada a `"asteroids"` para que el id refleje el juego real, sin tocar el resto de la Biblioteca.

## Scope

**In:**

- En `lib/games.ts`, renombrar la entrada existente: `id: "rocas"` → `id: "asteroids"`, `title: "ROCAS"` → `title: "ASTEROIDS"`. `short`, `long`, `category`, `color`, `best`, `plays` no cambian. `cover: "cover-rocas"` se mantiene igual (nombre de clase CSS interno en `app/globals.css`, no visible en pantalla).
- Motor del juego portado a TypeScript en `lib/games/asteroids/engine.ts`: clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y la lógica de `game.js` (spawn, colisiones, split de asteroides, power-up de disparo triple, invencibilidad al reaparecer), encapsuladas en una clase `AsteroidsEngine` sin variables globales ni listeners en `window` directamente — recibe el `canvas` y un `onStateChange(state)` callback en su constructor/`start()`.
- `AsteroidsEngine` expone `pause()`, `resume()`, `forceGameOver()`, `restart()` y `destroy()` (limpia listeners de teclado y cancela el `requestAnimationFrame`).
- Estado emitido por callback: `{ score, lives, level, phase }` donde `phase` es `'playing' | 'dead' | 'gameover' | 'paused'`.
- `components/games/asteroids-game.tsx` (Client Component): monta un `<canvas width={800} height={600}>`, instancia `AsteroidsEngine` en `useEffect` (con `destroy()` en el cleanup, robusto a doble-invocación de Strict Mode en desarrollo), y expone el estado recibido del callback junto con `pause`/`resume`/`forceGameOver`/`restart` vía un `ref` imperativo (`useImperativeHandle`) para que `player.tsx` los controle.
- Canvas responsive: `width`/`height` HTML fijos en 800×600 (coordenadas internas del motor sin cambios), con CSS (`width: 100%; height: 100%; display: block;`) para que se escale dentro de `.crt-screen` (ya `aspect-ratio: 4/3`, igual proporción que 800/600).
- `components/player.tsx`: cuando `game.id === "asteroids"`, renderiza `<AsteroidsGame ref={...} />` en vez de `.game-arena`, y sustituye su `setInterval` simulado por el estado real recibido del engine (`score`, `lives`, `level`). Los botones "PAUSA"/"FIN" llaman a `pause()`/`resume()` y `forceGameOver()` del engine. El resto de juegos (`game.id !== "asteroids"`) sigue usando exactamente el `.game-arena` simulado actual, sin cambios.
- Desactivar el `drawHUD()` interno del motor (no se pinta score/vidas/nivel dentro del canvas; ese rol lo cumple el HUD de React ya existente en `player.tsx`).
- Controles de teclado (`←` `→` `↑` `Espacio`) atados al `canvas`/`window` solo mientras el componente está montado; se desactivan (`destroy()`) al salir de `/juegos/asteroids/jugar`.

**Out of scope (para specs futuras):**

- Controles táctiles/en pantalla. El juego sigue siendo solo teclado, como el original.
- Persistencia real de puntuación: "GUARDAR PUNTUACIÓN" sigue siendo un cambio de estado visual (`saved = true`), sin escribir en Supabase ni en `lib/scores.ts`.
- Adaptar los otros 7 juegos de `GAMES` a motores reales (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`). Siguen con el gameplay simulado de `player.tsx`.
- Leaderboard real por partida (`components/leaderboard.tsx` sigue usando `seededScores` mock).
- Sonido/efectos de audio (el original tampoco tiene).
- Guardar el mejor puntaje de la sesión en `game.best` de `lib/games.ts` (sigue siendo el valor mock estático).
- Redirecciones o alias desde la URL antigua `/juegos/rocas` (no existe versión publicada previa que deba preservarse; se asume que nadie tiene ese enlace guardado).

## Modelo de datos

```ts
// lib/games/asteroids/engine.ts
export type AsteroidsPhase = "playing" | "dead" | "gameover" | "paused";

export interface AsteroidsState {
  score: number;
  lives: number;
  level: number;
  phase: AsteroidsPhase;
}

export class AsteroidsEngine {
  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: AsteroidsState) => void,
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
// components/games/asteroids-game.tsx
export interface AsteroidsGameHandle {
  pause: () => void;
  resume: () => void;
  forceGameOver: () => void;
  restart: () => void;
}
```

```ts
// lib/games.ts — cambio sobre la entrada existente
{
  id: "asteroids",     // antes: "rocas"
  title: "ASTEROIDS",  // antes: "ROCAS"
  // short, long, category, cover, color, best, plays: sin cambios
}
```

Convenciones:

- Constantes del juego original (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_*`, `TRIPLE_SPREAD`, `W = 800`, `H = 600`) se conservan sin cambios de valores.
- `AsteroidsEngine` no lee ni escribe variables globales de `window` salvo los listeners de teclado que registra y desregistra él mismo.
- `phase: 'paused'` es nuevo respecto al original (que no tenía pausa); se implementa deteniendo el `requestAnimationFrame` sin tocar el estado interno del juego.

## Plan de implementación

1. En `lib/games.ts`, renombrar la entrada existente: `id: "rocas"` → `"asteroids"`, `title: "ROCAS"` → `"ASTEROIDS"`. Verificar: `npx tsc --noEmit` sin errores; `/juegos` muestra la card "ASTEROIDS" y `/juegos/asteroids` carga sin 404.
2. Crear `lib/games/asteroids/engine.ts`: copiar las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` y las funciones de utilidad (`wrap`, `dist`, `rand`, `randInt`) del `game.js` original, tipadas en TypeScript, sin cambios de comportamiento. Verificar: `npx tsc --noEmit` sin errores nuevos.
3. En el mismo archivo, envolver el estado global (`ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state`, `deadTimer`, etc.) y las funciones `spawnAsteroids`, `initGame`, `nextLevel`, `explode`, `killShip`, `update`, `draw` (sin `drawHUD`) como métodos/propiedades de la clase `AsteroidsEngine`, recibiendo `canvas`/`ctx` por constructor en vez de `document.getElementById`. Verificar: `npx tsc --noEmit` sin errores nuevos.
4. Añadir a `AsteroidsEngine`: registro de listeners `keydown`/`keyup` en `window` dentro de `start()`, cancelados en `destroy()`; el loop `requestAnimationFrame` guarda su id para poder cancelarlo; `onStateChange` se invoca al final de cada `update()` con `{ score, lives, level, phase }` derivados del estado interno (`phase` mapea `state: 'playing'|'dead'|'gameover'` y añade `'paused'`). Verificar: `npx tsc --noEmit` sin errores nuevos.
5. Añadir `pause()`/`resume()` (alternan un flag interno que el loop respeta, sin cancelar `destroy`), `forceGameOver()` (fuerza `state = 'gameover'`) y `restart()` (llama a `initGame()` interno) a `AsteroidsEngine`. Verificar: `npx tsc --noEmit` sin errores nuevos.
6. Crear `components/games/asteroids-game.tsx` como Client Component (`"use client"`) con `forwardRef<AsteroidsGameHandle>`: renderiza `<canvas width={800} height={600} style={{ width: "100%", height: "100%", display: "block" }} />`, instancia `AsteroidsEngine` en `useEffect` (con cleanup `engine.destroy()`), sincroniza el estado del callback a `useState` local y lo expone al padre vía una prop `onStateChange`, y expone `pause`/`resume`/`forceGameOver`/`restart` vía `useImperativeHandle`. Verificar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
7. Editar `components/player.tsx`: si `game.id === "asteroids"`, renderizar `<AsteroidsGame ref={engineRef} onStateChange={...} />` en vez de `.game-arena`; sustituir el `useEffect` con `setInterval` simulado (líneas 19-28 actuales) por la escucha del estado real solo para este juego (mantener el `setInterval` simulado para el resto); conectar "PAUSA" a `engineRef.current?.pause()/resume()` y "FIN" a `engineRef.current?.forceGameOver()`; el modal de fin de partida y "JUGAR DE NUEVO" (`restart`) reutilizan la lógica existente, ahora alimentada por el score real. Verificar manual: abrir `/juegos/asteroids/jugar`, jugar una partida, confirmar que el HUD refleja score/vidas/nivel reales y que PAUSA/FIN funcionan.
8. `npm run build` y `npm run lint` completos. Verificar: ambos terminan sin errores.

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos` muestra la card "ASTEROIDS" (antes "ROCAS"); `/juegos/asteroids` y `/juegos/asteroids/jugar` cargan sin 404.
- [ ] `/juegos/asteroids/jugar` renderiza un `<canvas>` con el juego de Asteroids real (nave, asteroides, disparo) en vez de la simulación de `.game-arena`.
- [ ] `←`/`→` rotan la nave, `↑` propulsa, `Espacio` dispara, dentro del canvas mientras la página está montada.
- [ ] El HUD superior de `player.tsx` (Puntuación, Vidas, Nivel) refleja el score/vidas/nivel reales del motor, no valores simulados.
- [ ] Destruir un asteroide grande/mediano/pequeño suma 20/50/100 puntos respectivamente al HUD real.
- [ ] El botón "PAUSA" detiene el juego (deja de moverse) y "REANUDAR" lo continúa, sin perder el estado (posición, score).
- [ ] El botón "FIN" abre el modal de fin de partida con el score real acumulado hasta ese momento.
- [ ] Al perder las 3 vidas dentro del propio juego, se abre el modal de fin de partida existente con el score real (sin necesidad de pulsar "FIN").
- [ ] "JUGAR DE NUEVO" reinicia una partida nueva del motor real (score 0, 3 vidas, nivel 1).
- [ ] "GUARDAR PUNTUACIÓN" sigue mostrando el toast "PUNTUACIÓN GUARDADA_" sin llamadas de red.
- [ ] Navegar a `/juegos/asteroids` (SALIR) o fuera de la página detiene el `requestAnimationFrame` y remueve los listeners de teclado (sin errores en consola ni fugas al volver a entrar).
- [ ] `/juegos/<otro-id>/jugar` (cualquier juego distinto de "asteroids") sigue mostrando el `.game-arena` simulado sin cambios visuales ni de comportamiento.
- [ ] A 400px de ancho, el canvas de "asteroids" se escala dentro de `.crt-screen` sin desbordar ni generar scroll horizontal.
- [ ] La consola del navegador no muestra errores en `/juegos/asteroids/jugar` (incluyendo montaje/desmontaje repetido en desarrollo con Strict Mode).

## Decisiones

- **Sí:** renombrar la entrada existente de `"rocas"`/"ROCAS" a `"asteroids"`/"ASTEROIDS". Pedido explícito del usuario; el id/título reflejan el juego real portado.
- **No:** mantener el id `"rocas"` con el motor real por debajo. Generaría una desconexión entre el nombre visible del juego y su identidad real.
- **No:** crear una entrada nueva `"asteroids"` además de `"rocas"`. Duplicaría contenido en la Biblioteca; se renombra la existente en su lugar.
- **Sí:** mantener `cover: "cover-rocas"` sin renombrar. Es un nombre de clase CSS interno (`app/globals.css`), no aparece en ningún texto visible; renombrarlo es cosmético y fuera del objetivo de esta spec.
- **Sí:** motor (`lib/games/asteroids/engine.ts`) separado del Client Component (`components/games/asteroids-game.tsx`). El motor no depende de React ni de módulos de Next; facilita portar futuros juegos con el mismo patrón.
- **No:** todo el motor dentro de un único Client Component. Mezclaría lógica de juego con ciclo de vida de React, dificultando testear o reutilizar el motor.
- **Sí:** HUD de React real alimentado por callback del motor. Evita HUD duplicado (canvas + React) y reutiliza el diseño visual ya existente de `player.tsx`.
- **No:** mantener `drawHUD()` dibujando dentro del canvas. Duplicaría la información ya mostrada por el HUD de React.
- **Sí:** conectar PAUSA/FIN reales al motor. Consistencia con el resto de la UI; evita botones que no hacen nada real.
- **No:** controles táctiles en esta spec. El original es solo teclado; añadir táctil es una decisión de UI/UX que merece su propia spec y diseño.
- **Sí:** persistencia de puntuación sigue mock. SPEC 04 dejó explícitamente el modelo de datos de puntuaciones para una spec futura; no se introduce aquí.
- **No:** actualizar `game.best` en `lib/games.ts` con el resultado real. Sigue siendo dato mock estático hasta que exista persistencia real.
- **Sí:** canvas con tamaño interno fijo (800×600) y escalado por CSS. Evita reescribir la lógica de coordenadas del juego original; el `aspect-ratio: 4/3` de `.crt-screen` ya coincide.
- **No:** hacer que el motor recalcule `W`/`H` según el tamaño real del contenedor. Añadiría complejidad sin necesidad, ya que el escalado CSS resuelve el ajuste visual.
- **No:** redirección desde `/juegos/rocas` a `/juegos/asteroids`. No hay versión publicada previa que preservar; se asume sin enlaces externos a esa URL.

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listeners de teclado (`window.addEventListener`) duplicados si el componente se remonta      | `destroy()` remueve explícitamente los mismos listeners registrados en `start()`; verificar montaje/desmontaje repetido (paso 6 del criterio de aceptación).                     |
| React Strict Mode (desarrollo) invoca `useEffect` dos veces y podría iniciar dos loops RAF   | El `useEffect` de `asteroids-game.tsx` siempre limpia con `engine.destroy()` antes de crear uno nuevo; verificar manualmente en `npm run dev`.                                   |
| Teclas de flecha del juego interfieren con scroll de la página mientras se juega             | Ya en el original no se hace `preventDefault()`; si se observa scroll de página al jugar, añadir `preventDefault()` en los listeners del motor (ajuste menor dentro del paso 4). |
| Canvas escalado por CSS desenfoca el trazo fino (`lineWidth: 1`–`1.5`) en pantallas pequeñas | Aceptado como limitación visual menor; no se implementa lógica de resolución dinámica en esta spec.                                                                              |

## Lo que **no** está en esta spec

- Controles táctiles/en pantalla para "asteroids".
- Persistencia real de puntuaciones (Supabase o `lib/scores.ts`).
- Adaptar el resto de juegos de `GAMES` a motores reales.
- Leaderboard real por partida.
- Sonido/audio.
- Actualizar el "mejor global" (`game.best`) con resultados reales.
- Redirección/alias desde la URL antigua `/juegos/rocas`.

Cada uno, si llega, va en su propia spec.
