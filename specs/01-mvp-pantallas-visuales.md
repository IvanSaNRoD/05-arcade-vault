# SPEC 01 — MVP visual: pantallas de Arcade Vault

> **Status:** Borrador
> **Depends on:** —
> **Date:** 2026-09-14
> **Objective:** Implementar en Next.js App Router las 5 pantallas de la plantilla (Biblioteca, Detalle, Reproductor, Auth y Salón de la Fama) solo a nivel visual, con datos mock y sin juegos jugables.

## Por qué existe esta spec

La plantilla `references/resources/templates/` es un prototipo React UMD con router por hash y `window.*` globals.
El tema visual ya está en `app/globals.css`, pero la app sigue mostrando la página por defecto de `create-next-app`.
Esta spec traslada las pantallas a rutas reales de Next para tener la base navegable sobre la que se conectarán juegos, auth y persistencia en specs futuras.

## Scope

**In:**

- Datos mock tipados: 8 juegos, categorías y generador determinista de puntuaciones (`lib/`).
- Layout global: `lang="es"`, metadata "Arcade Vault · Portal Retro", Nav y footer en todas las páginas.
- Nav con links activos según ruta, contador "CRÉDITOS · 03" estático, botón "Iniciar Sesión" y menú móvil (hamburguesa + panel lateral) bajo 840px.
- **Biblioteca** (`/`): hero, búsqueda por nombre, chips de categoría, grilla de cards con tilt 3D y estado "NO HAY RESULTADOS".
- **Detalle** (`/juegos/[id]`): portada, tags, descripción, stat-strip, botones "JUGAR AHORA" y "VOLVER AL VAULT", leaderboard de 10 filas.
- **Reproductor** (`/juegos/[id]/jugar`): HUD, CRT con arena CSS animada, contador de puntuación simulado, PAUSA/REANUDAR, FIN, SALIR, modal "FIN DEL JUEGO" con input de iniciales, toast "PUNTUACIÓN GUARDADA" y "JUGAR DE NUEVO".
- **Auth** (`/auth`): tabs INICIAR SESIÓN / CREAR CUENTA, campos, botón submit, "JUGAR COMO INVITADO" y botones sociales.
- **Salón de la Fama** (`/salon?juego=<id>`): chips por juego como links, podio top 3, tabla de 12 filas y botón "VOLVER A LA BIBLIOTECA".
- Página 404 temática (`app/not-found.tsx`) para rutas y juegos inexistentes.

**Out of scope (para specs futuras):**

- Juegos jugables (lógica real de cada juego dentro del CRT).
- Autenticación real, sesión de usuario y login social (Google/GitHub).
- Persistencia de puntuaciones (localStorage, base de datos o API).
- Fila "TU MEJOR MARCA" del Salón (requiere usuario).
- Menú de usuario en Nav (`{user.name} ▾`) y cierre de sesión.
- Créditos/monedas funcionales.
- Tests automatizados.

## Modelo de datos

```ts
// lib/games.ts
export type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;        // slug, ej. "bloque-buster"
  title: string;     // "BLOQUE BUSTER"
  short: string;     // descripción de card
  long: string;      // descripción de detalle
  category: Category;
  cover: string;     // clase CSS de portada, ej. "cover-bricks"
  color: GameColor;  // variante del botón JUGAR
  best: number;      // mejor puntuación global
  plays: string;     // "12.4K"
}

export const GAMES: Game[];                          // 8 juegos, contenido copiado de data.jsx
export const CATEGORIES = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export function getGame(id: string): Game | undefined;
```

```ts
// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;   // de la lista PLAYERS de data.jsx
  score: number;
  date: string;   // "DD/MM/2026"
}

export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, mismo algoritmo que data.jsx
```

Convenciones:

- Semillas iguales a la plantilla: Detalle `id.length * 17 + 3` (10 filas), Salón `id.length * 23 + 7` (12 filas).
- Números formateados con `toLocaleString("es-ES")`.
- Estado del Reproductor local al componente: `score`, `lives` (3), `level` (1), `paused`, `over`, `name` ("INVITADO"), `saved`. No se persiste nada.

## Plan de implementación

1. Crear `lib/games.ts` y `lib/scores.ts` con tipos, datos y funciones del modelo. Verificar: `npm run build` compila.
2. Actualizar `app/layout.tsx`: `lang="es"`, metadata, `<Nav />`, `<main className="av-main">` y `<Footer />` dentro de `.av-app`. Crear `components/nav.tsx` (Client Component: `usePathname` para estado activo, estado `open` del panel móvil) y `components/footer.tsx`. Verificar: nav y footer visibles; hamburguesa abre y cierra panel a <840px.
3. Biblioteca: reemplazar `app/page.tsx` por hero + `<Library />`. Crear `components/library.tsx` (Client: estado `q` y `category`, filtrado) y `components/game-card.tsx` (Client: tilt con ref, card y botón JUGAR como enlace a `/juegos/[id]`). Verificar: filtros y tilt funcionan.
4. Detalle: crear `app/juegos/[id]/page.tsx` (Server Component, `generateStaticParams` con los 8 ids, `notFound()` si `getGame` devuelve `undefined`) y `components/leaderboard.tsx`. Crear `app/not-found.tsx` temático. Verificar: `/juegos/caida` renderiza y `/juegos/xyz` muestra la 404.
5. Reproductor: crear `app/juegos/[id]/jugar/page.tsx` (Server, `generateStaticParams` + `notFound()`) y `components/player.tsx` (Client: HUD, CRT, arena, intervalo de puntuación, pausa, modal de fin). Verificar: el contador sube, PAUSA lo detiene, FIN abre el modal, JUGAR DE NUEVO reinicia.
6. Auth: crear `app/auth/page.tsx` y `components/auth-form.tsx` (Client: tab `in`/`up`, campo email solo en `up`). Submit e "INVITADO" navegan a `/` con `useRouter`. Verificar: cambio de tabs y redirección.
7. Salón: crear `app/salon/page.tsx` (Server, lee `searchParams.juego`, fallback a `GAMES[0]` si falta o no existe) y `components/hall-of-fame.tsx` (podio, tabla y chips `<Link href="/salon?juego=<id>">`). Verificar: cambiar chip cambia URL, podio y tabla.

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/` muestra hero "ARCADE VAULT" y 8 cards de juego.
- [ ] Escribir "ro" en la búsqueda deja solo ROCAS (búsqueda insensible a mayúsculas sobre `title`).
- [ ] Chip SHOOTER muestra exactamente INVASORES y ROCAS; una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Mover el ratón sobre una card la rota; al salir vuelve a su posición.
- [ ] Click en card o en JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/<id>` muestra título, tags, stat-strip y leaderboard de 10 filas con top 3 en oro, plata y bronce.
- [ ] "JUGAR AHORA" navega a `/juegos/<id>/jugar`; "VOLVER AL VAULT" navega a `/`.
- [ ] `/juegos/xyz` y `/juegos/xyz/jugar` muestran la 404 temática con botón a `/`.
- [ ] En el Reproductor la puntuación aumenta sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la continúa.
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN oculta el input y muestra el toast; JUGAR DE NUEVO pone puntuación a 0, vidas a 3 y nivel a 01.
- [ ] SALIR del Reproductor navega a `/juegos/<id>`.
- [ ] En `/auth` la tab CREAR CUENTA muestra el campo "Correo electrónico"; INICIAR SESIÓN lo oculta.
- [ ] Enviar el formulario o pulsar "JUGAR COMO INVITADO" navega a `/`.
- [ ] `/salon` muestra BLOQUE BUSTER por defecto; `/salon?juego=caida` marca el chip CAÍDA y cambia podio y tabla.
- [ ] `/salon?juego=xyz` cae a BLOQUE BUSTER sin error.
- [ ] El link del Nav activo es Biblioteca en `/`, `/juegos/*` y `/juegos/*/jugar`, y Salón de la Fama en `/salon`.
- [ ] A menos de 840px los links del Nav se ocultan y la hamburguesa abre el panel lateral; click en backdrop o en un link lo cierra.
- [ ] La consola del navegador no muestra errores de hidratación en ninguna ruta.

## Decisiones

- **Sí:** App Router con rutas reales (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`). URLs compartibles y generación estática.
- **No:** SPA con estado de ruta en `location.hash` como la plantilla. No es idiomático en Next y pierde SSG.
- **Sí:** nombre de la app "Arcade Vault". Coincide con plantilla, tema y `CLAUDE.md` (el prompt decía "Arcade Bot").
- **Sí:** Reproductor como demo simulada (contador falso, pausa, modal). Deja lista la UI que conectará la spec de juegos.
- **No:** Reproductor estático. No permitiría validar los estados de pausa y fin.
- **Sí:** Auth solo visual, sin usuario ni localStorage. Evita estado global y problemas de hidratación en un MVP visual.
- **No:** mock de sesión con `av_user`/`av_scores` en localStorage. Se hará junto con la auth real.
- **Sí:** datos en `lib/` y componentes en `components/` en la raíz, importados con `@/*`.
- **No:** carpetas privadas `app/_components`. Los componentes se reutilizan en varias rutas.
- **Sí:** Salón con query param `?juego=<id>` y chips como `<Link>`. La página puede ser Server Component y la URL es enlazable.
- **No:** estado local para la tab del Salón. La URL no reflejaría el juego elegido.
- **Sí:** `generateStaticParams` + `notFound()` + `app/not-found.tsx` temático.
- **Sí:** Client Components solo donde hay estado o eventos (Nav, Library, GameCard, Player, AuthForm). El resto, Server Components.
- **Sí:** reutilizar las clases de `app/globals.css`. Los estilos inline de la plantilla pasan a utilidades de Tailwind con los tokens del tema (`text-ink-faint`, `font-pixel`…). No se añade CSS nuevo salvo para la 404.
- **Sí:** campo `cat` de la plantilla renombrado a `category` en el tipo `Game`. Nombre explícito.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Next 16 cambia APIs (`params`/`searchParams` como Promise, `PageProps`) | Leer `node_modules/next/dist/docs/01-app/` antes de crear rutas dinámicas y usar los helpers `PageProps<"/juegos/[id]">`. |
| Error de hidratación por `Math.random` en el Reproductor | El intervalo solo corre en `useEffect` (cliente). El render inicial usa valores fijos (score 0). |
| `toLocaleString("es-ES")` distinto entre servidor y cliente | Los datos son deterministas y Node incluye ICU completo. Verificar en consola que no hay warnings. |
| Tilt 3D choca con el `:hover` de `.card` en CSS | Mismo enfoque que la plantilla: el estilo inline de `transform` sobrescribe el hover mientras hay movimiento y se limpia en `mouseleave`. |

## Lo que **no** está en esta spec

- Juegos jugables.
- Auth real, sesión de usuario y login social.
- Persistencia de puntuaciones.
- Fila "TU MEJOR MARCA" y menú de usuario.
- Créditos funcionales.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
