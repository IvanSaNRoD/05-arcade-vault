# SPEC 03 — Página "Acerca de" + envío de correo con Resend

> **Status:** Draft
> **Depends on:** SPEC 02
> **Date:** 2026-09-16
> **Objective:** Implementar `/acerca-de` con la plantilla `home-about/about.jsx` (About + formulario de contacto) y enviar el formulario por email real usando Resend, con la API key fuera del repositorio.

## Por qué existe esta spec

SPEC 02 dejó explícitamente fuera "Página Acerca de y su link en el Nav". La plantilla `references/resources/templates/home-about/about.jsx` incluye la sección About y un formulario de contacto que en la plantilla original es solo visual (fake submit). Esta spec la porta a Next.js y conecta el formulario a un envío de correo real vía Resend.

## Scope

**In:**

- Nueva ruta `app/acerca-de/page.tsx` con las 2 secciones de `about.jsx`: Hero About (kicker, título, misión, 3 highlights) y Contacto (intro + formulario).
- Link "Acerca de" en `components/nav.tsx` (barra y panel móvil), activo cuando `pathname === "/acerca-de"`.
- Formulario de contacto (`name`, `email`, `msg`) que en submit llama a un Server Action, que llama a Resend para enviar un correo real a `CONTACT_EMAIL`.
- Estados del formulario: idle → enviando → éxito (terminal-success de la plantilla) → error (nuevo, no existe en la plantilla).
- Validación: campos no vacíos (client-side, igual que la plantilla) + formato de email válido (client-side y server-side).
- `RESEND_API_KEY` y `CONTACT_EMAIL` como variables de entorno, nunca hardcodeadas ni commiteadas. `.env.local` (gitignored, ya cubierto por `.env*` en `.gitignore`) + `.env.example` documentando las claves sin valores reales.
- Animación `.reveal` en la sección de contacto, reutilizando `components/reveal.tsx` de SPEC 02.
- Estilos de `.about`, `.highlight`, `.contact-*`, `.terminal-success`, `.term-*` y sus `@keyframes` (`pxblink`, `shake`, `blink`) copiados de `styles.css` a `app/globals.css`.
- Dependencia `resend` añadida a `package.json`.

**Out of scope (para specs futuras):**

- Persistencia de los mensajes de contacto en base de datos.
- Rate limiting / protección anti-spam (honeypot, captcha).
- Envío de un email de confirmación al usuario que escribió el formulario (solo se notifica a `CONTACT_EMAIL`).
- Dominio propio verificado en Resend (se usa `onboarding@resend.dev` como remitente).
- Tests automatizados.

## Modelo de datos

No se introducen estructuras de datos persistentes. El único "modelo" es el payload del formulario, validado en el Server Action:

```ts
// lib/actions/contact.ts
interface ContactPayload {
  name: string;
  email: string;
  msg: string;
}

type ContactResult =
  | { ok: true }
  | { ok: false; error: string };
```

## Plan de implementación

1. Instalar dependencia: `npm install resend`. Crear `.env.example` con `RESEND_API_KEY=` y `CONTACT_EMAIL=` (sin valores). Añadir `RESEND_API_KEY` y `CONTACT_EMAIL` reales a `.env.local` (no commiteado — confirmar que `.env*` sigue en `.gitignore`). Verificar: `git status` no muestra `.env.local`.
2. Crear `lib/actions/contact.ts`: Server Action `sendContactMessage(payload: ContactPayload): Promise<ContactResult>`. Valida campos no vacíos y formato de email con regex simple; si falla, devuelve `{ ok: false, error }` sin llamar a Resend. Si pasa, instancia `new Resend(process.env.RESEND_API_KEY)` y llama a `resend.emails.send({ from: "onboarding@resend.dev", to: process.env.CONTACT_EMAIL!, subject: ..., text: ... })`. Captura excepciones y devuelve `{ ok: false, error: "..." }` en vez de dejarlas propagar. Verificar: `npm run build` compila.
3. Crear `components/contact-form.tsx` (Client Component): estado `form`, `status` (`"idle" | "sending" | "sent" | "error"`), `shake`. En submit: valida client-side (igual que la plantilla + regex email); si falla, activa `shake` igual que hoy. Si pasa, `status = "sending"`, llama al Server Action, y según el resultado pasa a `"sent"` (renderiza el `terminal-success` existente) o `"error"` (nuevo bloque con mensaje de error y botón para reintentar sin perder los valores del formulario). Verificar: envío exitoso muestra terminal-success; forzar un error (ej. `RESEND_API_KEY` inválida temporalmente) muestra el estado de error.
4. Crear `app/acerca-de/page.tsx` (Server Component) con el Hero About (`about-hero`, highlights con los mismos 3 íconos de la plantilla, portados a `components/highlight-icon.tsx` a partir del `HighlightIcon` de `about.jsx`) y la sección de contacto envuelta en `<Reveal>`, usando `<ContactForm />`. Verificar: `/acerca-de` renderiza ambas secciones.
5. Actualizar `components/nav.tsx`: añadir link "Acerca de" → `/acerca-de` (activo si `pathname === "/acerca-de"`) en la barra y en el panel móvil, después de "Biblioteca" y antes de "Salón de la Fama". Verificar: el link aparece y se marca activo en `/acerca-de`.
6. CSS: copiar a `app/globals.css` los bloques `/* ===== ABOUT PAGE ===== */` (líneas 1071–1146 de `styles.css`) más el bloque de error nuevo (sin plantilla previa, estilo consistente con `.terminal-success` pero en rojo/magenta del theme). Comprobar con `grep "@keyframes"` en `globals.css` antes de pegar `pxblink`, `shake`, `blink` para no duplicar. Verificar: `npm run build` compila.

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/acerca-de` muestra el título "ACERCA DE ARCADE VAULT", el texto de misión y 3 highlights (corazón, browser, planta).
- [ ] La sección de contacto muestra el formulario con campos Nombre, Correo Electrónico y Mensaje.
- [ ] Enviar el formulario con campos vacíos activa el shake y no llama al Server Action.
- [ ] Enviar el formulario con un email con formato inválido (ej. `abc`) muestra error de validación sin llamar a Resend.
- [ ] Enviar el formulario con datos válidos llama a Resend y, si el envío tiene éxito, llega un correo real a `CONTACT_EMAIL` y la UI muestra el `terminal-success` con el nombre en mayúsculas.
- [ ] Si Resend falla (ej. API key inválida), la UI muestra un estado de error legible y permite reintentar sin perder lo escrito en el formulario.
- [ ] `RESEND_API_KEY` no aparece en ningún archivo trackeado por git (`git grep RESEND_API_KEY` solo encuentra `.env.example` sin valor y referencias a `process.env.RESEND_API_KEY` en código).
- [ ] Nav: "Acerca de" aparece en barra y panel móvil, activo solo en `/acerca-de`.
- [ ] A 400px de ancho `/acerca-de` no tiene scroll horizontal; `contact-grid` pasa a 1 columna.
- [ ] La consola del navegador no muestra errores de hidratación en `/acerca-de`.

## Decisiones

- **Sí:** Server Action en vez de API Route (`app/api/contact/route.ts`). Next.js 16 recomienda Server Actions para mutaciones desde formularios; evita boilerplate de fetch manual.
- **No:** exponer el envío desde el cliente con una API pública de Resend. La API key de Resend es secreta y solo puede usarse server-side.
- **Sí:** `onboarding@resend.dev` como remitente. No hay dominio propio verificado en Resend; es la opción soportada por Resend para probar sin configurar DNS.
- **No:** dominio propio verificado. Bloquearía la implementación hasta tener acceso a configurar DNS.
- **Sí:** `.env.local` + `.env.example`. Mismo patrón estándar de Next.js; `.env.local` ya está cubierto por `.env*` en `.gitignore`, `.env.example` documenta las claves sin filtrarlas.
- **Sí:** estado de error nuevo en el formulario (no existe en la plantilla original, que solo maneja éxito). Un envío real puede fallar (red, rate limit, key inválida) y el usuario necesita saberlo.
- **No:** reintentos automáticos o cola de envío. Fuera de alcance para un formulario de contacto simple; el usuario reintenta manualmente.
- **Sí:** validación de formato de email además de campos no vacíos. Evita envíos claramente inválidos a Resend sin añadir una librería de validación.
- **No:** librería de validación (zod, yup, etc.) para un único formulario de 3 campos. Regex simple es suficiente y no añade dependencia.
- **Sí:** sin persistencia en base de datos ni protección anti-spam. No hay base de datos en el proyecto todavía; se deja para una spec futura si el volumen de spam lo justifica.

## Riesgos

| Riesgo                                                          | Mitigación                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `RESEND_API_KEY` termina commiteada por error                   | `.env*` ya está en `.gitignore`; paso 1 verifica con `git status` antes de continuar.                 |
| Resend rechaza el envío por usar `onboarding@resend.dev` a un dominio no autorizado | Confirmar en el dashboard de Resend que `CONTACT_EMAIL` es una dirección permitida en modo test antes del paso 3. |
| Formulario sin protección anti-spam recibe spam en producción   | Fuera de scope aquí; documentado como riesgo conocido para una spec futura (honeypot o captcha).       |
| Clases CSS de `styles.css` About ya existen en `globals.css` con otro valor | Antes de pegar el bloque del paso 6, `grep` de cada selector (`.about`, `.contact-*`, `.terminal-success`, `.term-*`) en `globals.css`. |

## Lo que **no** está en esta spec

- Persistencia de mensajes en base de datos.
- Rate limiting / anti-spam.
- Email de confirmación al remitente.
- Dominio propio verificado en Resend.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
