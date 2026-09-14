# Verificación visual — SPEC 01 MVP pantallas visuales

> **Spec:** [01-mvp-pantallas-visuales.md](../../specs/01-mvp-pantallas-visuales.md)
> **Fecha:** 2026-09-15
> **Rama:** `spec-01-mvp-pantallas-visuales`
> **Método:** revisión manual con Playwright MCP (no son tests automatizados).
> **Alcance:** homepage (`/`) frente a la plantilla `references/resources/templates/Arcade Vault.html`.

## Entorno

| | Plantilla | App |
|---|---|---|
| URL | `http://localhost:8123/Arcade Vault.html` (servida por HTTP; Babel no carga `.jsx` desde `file://`) | `http://localhost:3000/` (`next dev`) |
| Viewports | 1440×900, 390×844 | 1440×900, 390×844 |

## Resultados

| # | Comprobación | Resultado |
|---|---|---|
| 1 | Escritorio: posición, tamaño, fuente, color y espaciado de 20 elementos (nav, logo, links, créditos, botón de sesión, hero, búsqueda, chips, card, cover, título, botón JUGAR, footer…) | ✅ Idénticos al píxel |
| 2 | Escritorio: altura total del documento | ✅ 1284px en ambas |
| 3 | Escritorio: textos de nav, chips, card y footer | ✅ Idénticos |
| 4 | Escritorio: comparación visual de capturas | ✅ Iguales (ver notas) |
| 5 | Móvil: nav, hero, búsqueda, chips, card y footer | ✅ Idénticos |
| 6 | Móvil: ancho del botón hamburguesa | ✅ 50px en ambas (tras corrección, ver abajo) |
| 7 | Móvil: ancho del documento | ✅ 395px en ambas |
| 8 | Consola de la app: errores y avisos (incluida hidratación) | ✅ 0 errores, 0 avisos |

**Notas:**

- Diferencias visuales que no dependen del código: fase del cursor `_` que parpadea, triángulo animado de ROCAS e indicador "N" de Next (solo en modo desarrollo).
- No se hizo diff píxel a píxel: Python no tiene PIL instalado.

## Incidencia corregida

**Botón hamburguesa más ancho en la app (56px frente a 50px).**

- **Causa:** `≡` (U+2261) no está en ningún subset de Press Start 2P. `next/font` añade `"Press Start 2P Fallback"` (Arial ajustada, cubre todo Unicode) antes de `system-ui`. En esa fuente el glifo mide 13.09px; en `system-ui`, que es lo que usa la plantilla, mide 6.84px.
- **Corrección:** `font-[system-ui]` en el botón (`components/nav.tsx`).
- **Verificación:** 50px de ancho y `scrollWidth` 395px, igual que la plantilla. `npm run lint` y `npm run build` sin errores.

## Observaciones fuera de alcance

- A 390px hay scroll horizontal (395px sobre una vista de 375px) en la plantilla y en la app: "Iniciar Sesión" y la hamburguesa no caben. Viene del diseño; si se cambia, irá en otra spec.
- Solo se ha comparado la homepage. El resto de pantallas se validó con los criterios de aceptación de la spec.
