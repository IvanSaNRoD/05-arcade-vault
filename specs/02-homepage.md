# SPEC 02 — Homepage de Arcade Vault

> **Status:** Implementada
> **Depends on:** SPEC 01
> **Date:** 2026-09-16
> **Objective:** Implementar en `/` la landing page de la plantilla `home-about` (solo visual, datos mock) y mover la Biblioteca a `/juegos`.

## Por qué existe esta spec

La plantilla `references/resources/templates/home-about/` añade una landing (`home.jsx`) y un Nav con "Inicio" y "Acerca de".
En SPEC 01 la Biblioteca ocupa `/`, así que la home obliga a reubicarla.
La página "Acerca de" (`about.jsx`) queda para una spec posterior.

## Scope

**In:**

- Mover la Biblioteca de `/` a `/juegos` (hero + `<Library />` sin cambios visuales).
- Nueva home en `/` con las 7 secciones de `home.jsx`: Hero (siluetas flotantes, eyebrow, título 3 líneas, 2 CTAs, "DESLIZA"), `// 01 ¿POR QUÉ ARCADE VAULT?`, `// 02 JUEGOS DISPONIBLES AHORA`, Stats, `// 03 ACTIVIDAD EN VIVO`, `// 04 PRECIOS` + FAQ, CTA final.
- Animación `.reveal` por sección con IntersectionObserver, desactivada con `prefers-reduced-motion`.
- Nav: link "Inicio" (activo solo en `/`) antes de "Biblioteca", en barra y panel móvil.
- Estilos de la home copiados de `styles.css` de la plantilla a `app/globals.css`.
- Reapuntar a `/juegos` los enlaces "volver a la Biblioteca" existentes.

**Out of scope (para specs futuras):**

- Página "Acerca de" y su link en el Nav.
- Actividad en vivo real (puntuaciones y top jugadores reales).
- Stats calculadas (se muestra "12+ JUEGOS" literal aunque haya 8).
- Auth real: "CREAR CUENTA" y "EMPEZAR GRATIS" solo navegan a `/auth`.
- Gamepad, selector de temas y resto de bloques de `styles.css` no usados por la home.
- Tests automatizados.

## Modelo de datos

```ts
// lib/home.ts — contenido mock copiado literal de home.jsx
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";
export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature { icon: FeatureIconKind; title: string; desc: string; color: NeonColor; }
export interface Stat { value: string; unit: string; sub: string; }
export interface RecentScore { player: string; game: string; score: number; ago: string; color: NeonColor; }
export interface TopPlayer { rank: number; player: string; score: number; }
export interface FaqItem { q: string; a: string; }

export const FEATURES: Feature[];          // 4
export const STATS: Stat[];                // 3
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];     // 5
export const PRICING_PERKS: string[];      // 6
export const FAQ: FaqItem[];               // 3
```

Convenciones:

- Claves cortas de la plantilla (`i`, `t`, `d`, `c`, `p`, `g`, `s`, `t`, `r`, `n`, `u`) renombradas a nombres explícitos.
- `JUEGOS DISPONIBLES AHORA` usa `GAMES.slice(0, 6)` de `lib/games.ts`; la mini-card muestra `game.category`.
- Números con `toLocaleString("es-ES")`, como en SPEC 01.
- Barra de top jugadores: `width = 100 - i * 16` %.

## Plan de implementación

1. Mover Biblioteca: crear `app/juegos/page.tsx` con el contenido actual de `app/page.tsx`. Dejar `app/page.tsx` como placeholder temporal. Actualizar `components/nav.tsx`: link "Inicio" → `/` (activo si `pathname === "/"`), "Biblioteca" → `/juegos` (activo si `pathname.startsWith("/juegos")`), en barra y panel. Logo sigue en `/`. Verificar: `/juegos` muestra la Biblioteca y el Nav marca el link correcto.
2. Reapuntar a `/juegos`: "VOLVER AL VAULT" (`app/juegos/[id]/page.tsx`), "VOLVER A LA BIBLIOTECA" (`components/hall-of-fame.tsx`), botón de `app/not-found.tsx`, botón magenta del modal (`components/player.tsx`), submit e "INVITADO" (`components/auth-form.tsx`). Verificar: `grep` de `href="/"` y `push("/")` solo devuelve logo e "Inicio" del Nav.
3. CSS: copiar a `app/globals.css` los bloques `/* ===== HOME PAGE ===== */` (líneas 930–1070 de `styles.css`, incluye `reveal`, `float`, `bounce`), `/* ===== ACTIVITY ===== */` (1621–1671) y `/* ===== PRICING ===== */` (1672–1726). Omitir clases que ya existan en `globals.css`. Añadir `@media (prefers-reduced-motion: reduce)` que anula `.reveal` (opacidad 1, sin transform ni transition). Verificar: `npm run build` compila.
4. Crear `lib/home.ts` con tipos y constantes del modelo. Verificar: `npm run build` compila.
5. Crear componentes Server: `components/home-silhouettes.tsx` (8 SVG `s1`–`s8`, `aria-hidden`), `components/feature-icon.tsx` (4 SVG por `kind`) y `components/mini-card.tsx` (`<Link href="/juegos/<id>">`). Crear `components/reveal.tsx` (Client: `<section>` con clase `reveal` + `className` recibido, añade `in` al intersectar con `threshold: 0.12` y desconecta el observer).
6. Home: reemplazar `app/page.tsx` por Server Component `.home fade-in` con Hero y las 6 secciones envueltas en `<Reveal>`. CTAs como `<Link>`: "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" → `/juegos`; "CREAR CUENTA" y "EMPEZAR GRATIS" → `/auth`; "VER SALÓN" → `/salon`. `transitionDelay` / `animationDelay` inline como en la plantilla. Verificar: `/` renderiza las 7 secciones y las secciones aparecen al hacer scroll.

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] `/` muestra el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", 8 siluetas flotantes y los botones "EXPLORAR JUEGOS" y "CREAR CUENTA".
- [x] `/` muestra 4 feature cards, 6 mini-cards, 3 stats, 7 filas de últimas puntuaciones, 5 top jugadores con #01–#03 destacados, la tarjeta de precio "$0" con 6 ventajas, 3 FAQ y el CTA "¿LISTO PARA JUGAR?".
- [x] Click en una mini-card navega a `/juegos/<id>`.
- [x] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" navegan a `/juegos`; "CREAR CUENTA" y "EMPEZAR GRATIS" a `/auth`; "VER SALÓN" a `/salon`.
- [x] Las secciones con `.reveal` empiezan ocultas y aparecen al entrar en viewport.
- [x] Con `prefers-reduced-motion: reduce` emulado, todas las secciones son visibles sin scroll previo.
- [x] `/juegos` muestra la Biblioteca de SPEC 01 con búsqueda, chips y 8 cards.
- [x] Nav: "Inicio" activo solo en `/`; "Biblioteca" activo en `/juegos`, `/juegos/<id>` y `/juegos/<id>/jugar`; no aparece "Acerca de".
- [x] El panel móvil (<840px) incluye "Inicio" y "Biblioteca" con el mismo estado activo.
- [x] "VOLVER AL VAULT", "VOLVER A LA BIBLIOTECA", el botón de la 404, el botón magenta del modal del Reproductor, el submit de Auth y "JUGAR COMO INVITADO" navegan a `/juegos`.
- [x] A 400px de ancho la home no tiene scroll horizontal y las grillas pasan a 1–2 columnas.
- [x] La consola del navegador no muestra errores de hidratación en `/` ni en `/juegos`.

## Decisiones

- **Sí:** Biblioteca en `/juegos`. Coherente con `/juegos/[id]` y `/juegos/[id]/jugar`.
- **No:** `/biblioteca`. Rompe la jerarquía de URLs existente.
- **Sí:** omitir "Acerca de" en el Nav hasta su spec. Evita un link a la 404.
- **Sí:** estilos añadidos a `app/globals.css` con los nombres de clase de la plantilla. Mismo patrón que SPEC 01.
- **No:** CSS Module. Obligaría a reescribir todos los `className`.
- **Sí:** contenido mock estático y literal en `lib/home.ts`. Fiel a la plantilla y separa datos de marcado.
- **No:** stats y listas derivadas de `GAMES` / `seededScores`. Menos fiel; se hará cuando haya datos reales.
- **Sí:** mini-rail con `GAMES` real. Los enlaces a `/juegos/<id>` deben existir.
- **Sí:** `<Reveal>` como único Client Component; `app/page.tsx` sigue siendo Server Component. Minimiza JS en cliente.
- **No:** hook `useReveal` con `querySelectorAll` global. Obliga a convertir toda la página en Client Component.
- **Sí:** `prefers-reduced-motion` desactiva `.reveal`. Accesibilidad sin coste.
- **Sí:** todos los enlaces "volver" apuntan a `/juegos`. Conservan su semántica de Biblioteca; solo logo e "Inicio" van a `/`.
- **Sí:** CTAs como `<Link className="btn ...">` en vez de `<button onClick>`. Navegación real, sin JS.

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Clases de `styles.css` que ya existen en `globals.css` con otro valor      | Antes de pegar cada bloque, `grep` de cada selector en `globals.css`; no duplicar ni sobrescribir los existentes. |
| `.reveal` con opacidad 0 deja secciones invisibles si el JS falla          | `<Reveal>` es mínimo y sin dependencias; reduced-motion las muestra siempre. Verificar en consola sin errores.    |
| Keyframes `float`/`bounce` colisionan con nombres de Tailwind o existentes | Comprobar con `grep "@keyframes"` en `globals.css`; renombrar con prefijo `home-` si hay colisión.                |
| Enlaces a `/` olvidados tras mover la Biblioteca                           | Paso 2 incluye `grep` explícito de `href="/"` y `push("/")`.                                                      |

## Lo que **no** está en esta spec

- Página "Acerca de" y su link en el Nav.
- Actividad en vivo y stats reales.
- Auth real.
- Gamepad y selector de temas.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
