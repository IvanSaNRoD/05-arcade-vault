# Verificación visual — SPEC 02 Homepage

> **Spec:** [02-homepage.md](../../specs/02-homepage.md)
> **Fecha:** 2026-09-16
> **Rama:** `spec-02-homepage`
> **Método:** revisión manual con Playwright MCP (no son tests automatizados).
> **Alcance:** homepage (`/`) frente a la plantilla `references/resources/templates/home-about/arcade-vault-standalone.html`; enlaces de navegación reapuntados a `/juegos`.

## Entorno

| | Plantilla | App |
|---|---|---|
| URL | `http://localhost:8123/arcade-vault-standalone.html` (servida por HTTP) | `http://localhost:3000/` (`next dev`) |
| Viewports | 1440×900, 400×844 | 1440×900, 400×844 |

## Resultados

| # | Comprobación | Resultado |
|---|---|---|
| 1 | Altura total del documento (desktop) | ✅ 3900px en ambas |
| 2 | 8 siluetas flotantes (`.home-silos .silo`) | ✅ 8 en ambas |
| 3 | Título del Hero (3 líneas) y CTAs "EXPLORAR JUEGOS" / "CREAR CUENTA" | ✅ Idénticos |
| 4 | 4 feature cards con sus títulos | ✅ Idénticos |
| 5 | 6 mini-cards de juegos | ✅ 6 en ambas |
| 6 | 3 stats con sus valores (`12+`, `MILES`, `GLOBAL`) | ✅ Idénticos |
| 7 | 7 filas de últimas puntuaciones + 5 top jugadores (con `.top1`) | ✅ Idénticos |
| 8 | Tarjeta de precio `$0` con 6 ventajas + 3 FAQ + CTA final | ✅ Idénticos |
| 9 | Geometría del Hero y altura del nav (`getBoundingClientRect`) | ✅ Idénticas |
| 10 | Consola de la app en `/`, `/juegos/[id]`, `/auth`, `/salon` | ✅ 0 errores, 0 avisos |
| 11 | `.reveal` empieza oculto (`opacity:0`) antes del primer render | ✅ Confirmado (`classList` sin `in`) |
| 12 | `.reveal` se activa (`in`) al hacer scroll hasta cada sección | ✅ Las 6 secciones pasan a `in` |
| 13 | `prefers-reduced-motion: reduce` → todas las secciones visibles sin scroll | ✅ `opacity:1`, `transform:none` en las 6 |
| 14 | Click en mini-card → `/juegos/<id>` | ✅ `bloque-buster` navega correctamente |
| 15 | Nav: "Inicio" activo solo en `/`; "Biblioteca" activo en `/juegos` | ✅ Confirmado en barra y panel móvil (400px) |
| 16 | "VOLVER AL VAULT" (detalle de juego) → `/juegos` | ✅ Sin errores de consola |
| 17 | Botón 404 "VOLVER A LA BIBLIOTECA" → `/juegos` | ✅ (único error de consola es el 404 propio de la ruta, no de hidratación) |
| 18 | "JUGAR COMO INVITADO" (Auth) → `/juegos` | ✅ |
| 19 | "VER SALÓN" (home) → `/salon`; "VOLVER A LA BIBLIOTECA" (Salón) → `/juegos` | ✅ |
| 20 | A 400px: sin scroll horizontal; grillas de features/stats/activity/pricing a 1 columna, mini-rail a 2 | ✅ `scrollWidth` 395px sobre 400px de viewport |

## Notas

- No se probó el modal del Reproductor ("VOLVER AL VAULT" en `components/player.tsx`) porque requiere completar una partida; el enlace usa el mismo patrón (`href="/juegos"`) verificado en el resto de casos.
- Diferencias visuales que no dependen del código: fase del cursor `_` que parpadea y animaciones con temporizador (ticker, pulse).

## Conclusión

La home en `/` reproduce fielmente las 7 secciones de la plantilla `home-about` (contenido, conteos y geometría idénticos), la animación `.reveal` funciona con IntersectionObserver y respeta `prefers-reduced-motion`, la Biblioteca sigue intacta en `/juegos`, y todos los enlaces "volver" y CTAs apuntan a sus destinos según la spec. Sin errores de hidratación ni de consola en ninguna ruta probada.
