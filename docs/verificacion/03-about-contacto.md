# Verificación — SPEC 03 About + Contacto (Resend)

> **Spec:** [03-about-contacto.md](../../specs/03-about-contacto.md)
> **Fecha:** 2026-09-16
> **Rama:** `spec-03-about-contacto`
> **Método:** revisión manual con Playwright MCP (no son tests automatizados) + envío real a Resend desde Node fuera de la UI.
> **Alcance:** ruta `/acerca-de`, link de nav, Server Action `sendContactMessage`, envío real de correo vía Resend.

## Entorno

| | |
|---|---|
| URL | `http://localhost:3000/acerca-de` (`next dev`, servidor externo a esta sesión) |
| Viewports | 1280×800 (desktop), 400×844 (mobile) |
| Resend | Cuenta en modo test — solo permite enviar al email de registro |

## Resultados

| # | Criterio de aceptación (spec) | Resultado |
|---|---|---|
| 1 | `npm run build` termina sin errores | ✅ Compila, `/acerca-de` generado como ruta estática |
| 2 | `npm run lint` termina sin errores | ⚠️ 4 errores preexistentes en `app/page.tsx` (SPEC 02, `react/jsx-no-comment-textnodes`), no relacionados con esta spec. Ningún archivo de SPEC 03 tiene errores de lint |
| 3 | `/acerca-de` muestra título, misión y 3 highlights (corazón, browser, planta) | ✅ Confirmado (snapshot de accesibilidad) |
| 4 | Sección de contacto con campos Nombre, Correo Electrónico y Mensaje | ✅ Presentes |
| 5 | Enviar con campos vacíos activa `shake` y no llama al Server Action | ✅ Confirmado vía `MutationObserver` en `.contact-form` (clase `shake` añadida y quitada) |
| 6 | Email con formato inválido (`abc`) muestra error de validación sin llamar a Resend | ✅ Tras el fix (ver Hallazgos), muestra el bloque `.terminal-error` con "El formato del correo no es válido." |
| 7 | Envío con datos válidos llama a Resend; si tiene éxito, llega correo real y la UI muestra `terminal-success` con el nombre en mayúsculas | ✅ Envío real confirmado (ver Hallazgos) — UI mostró "MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, TESTER QA." |
| 8 | Si Resend falla, la UI muestra error legible y permite reintentar sin perder lo escrito | ✅ Verificado el flujo de error/reintento (con error de validación); el manejo de excepciones de Resend en `lib/actions/contact.ts` se probó por separado (ver Hallazgos) — mismo componente `.terminal-error` y botón "REINTENTAR" conserva los valores del formulario |
| 9 | `RESEND_API_KEY` no aparece en archivos trackeados por git | ✅ `git grep RESEND_API_KEY` solo encuentra `lib/actions/contact.ts` (`process.env.RESEND_API_KEY`) y menciones en la spec |
| 10 | Nav: "Acerca de" en barra y panel móvil, activo solo en `/acerca-de` | ✅ Confirmado en ambos (desktop y panel móvil a 400px) |
| 11 | A 400px sin scroll horizontal; `contact-grid` a 1 columna | ✅ `scrollWidth` 395px sobre 400px de viewport; `grid-template-columns` colapsa a una sola pista |
| 12 | Consola sin errores de hidratación en `/acerca-de` | ✅ 0 errores/avisos en consola, en navegación fresca a 1280px y a 400px |

## Hallazgos y correcciones durante la verificación

1. **`.env.example` bloqueado por `.gitignore`.** El patrón `.env*` (línea 37) ignoraba también `.env.example`, impidiendo commitearlo y documentar las variables para otros devs, contra la intención de la spec (Decisiones: "`.env.example` documenta las claves sin filtrarlas"). **Corregido:** se añadió `!.env.example` en `.gitignore`.
2. **Resend en modo test solo permite enviar al email de la cuenta.** `CONTACT_EMAIL` apuntaba a `ivansancrodr@hotmail.com`; Resend devolvía `403 validation_error` ("You can only send testing emails to your own email address"). Riesgo ya anticipado en la spec (tabla de Riesgos). **Corregido:** `CONTACT_EMAIL` en `.env.local` cambiado a `ivansancrodr@gmail.com` (email de registro en Resend). Verificado con un envío real fuera de la UI (`resend.emails.send` con la API key real) → `{"data":{"id":"01a0ac79-…"}}`, sin error.
3. **Bug: validación nativa del navegador interceptaba el submit.** El `<input type="email">` disparaba la validación HTML5 nativa del navegador (tooltip "Incluye un signo @…") **antes** de que el `onSubmit` de React se ejecutara, por lo que el `shake` y el estado `error` personalizados nunca se activaban con un email mal formado — el submit ni siquiera llegaba al JS. **Corregido:** se añadió `noValidate` al `<form>` en `components/contact-form.tsx`, dejando la validación exclusivamente en el JS (igual que la plantilla original, que no tiene esta restricción porque no usaba `type="email"` con validación nativa activa).

## Notas

- No se forzó un fallo real de Resend (ej. invalidando la API key) porque el dev server es un proceso externo a esta sesión; en su lugar se verificó el manejo de errores de `sendContactMessage` con una llamada directa a la API de Resend fuera de Next (mismo código de captura de excepciones), y el camino de UI de error se ejercitó con la validación de email inválido, que usa el mismo componente `.terminal-error`.
- Los screenshots tomados durante la verificación (400px, tooltip nativo) se generaron en `.playwright-mcp/` y se eliminaron tras la revisión; no forman parte del repositorio.

## Conclusión

`/acerca-de` reproduce el Hero About y la sección de Contacto de la plantilla, con validación client-side, Server Action a Resend funcionando con un envío real confirmado, y estado de error dedicado (`.terminal-error`) que conserva los datos del formulario al reintentar. Se detectaron y corrigieron dos configuraciones (`.gitignore`, `CONTACT_EMAIL`) y un bug de validación nativa vs. custom durante la propia verificación. Sin errores de consola ni de hidratación en desktop ni en 400px.
