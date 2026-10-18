# Verificación — SPEC 16 Medidas de seguridad básicas

> **Spec:** [16-medidas-seguridad-basicas.md](../../specs/16-medidas-seguridad-basicas.md)
> **Rama:** `spec-16-medidas-seguridad-basicas`
> **Alcance:** ajustes manuales de Supabase Auth (paso 1) y notas de verificación.

## Configuración manual (paso 1)

La config de Auth no vive en la base de datos: no se puede aplicar con el MCP de Supabase. Se hace a mano en el dashboard.

### Supabase → Authentication → Sign In / Providers → Email

| Campo                   | Valor |
| ----------------------- | ----- |
| Minimum password length | `8`   |

| Password requirements | Lowercase, uppercase letters, digits and symbols (ya activo) |

`validatePassword` (`lib/actions/auth.ts`) replica las 4 clases; `weak_password` de Supabase se traduce al mismo mensaje.

La server action `signUp` (SPEC 15) ya exige 8. Esto cierra el hueco de llamar a `/auth/v1/signup` directamente.

### Supabase → Authentication → Rate Limits

| Campo                                      | Valor    |
| ------------------------------------------ | -------- |
| Sign-ups and sign-ins (por 5 min / por IP) | ver nota |

Objetivo de la spec: **10 signups/h por IP**. Si el dashboard usa otra ventana (p. ej. por 5 min) o agrupa sign-ups con sign-ins, anotar aquí el nombre y valor reales elegidos:

- Nombre real del campo: `_____`
- Valor aplicado: `_____`

En pruebas locales (misma IP) se puede subir temporalmente; anotar aquí si se hace y restaurarlo.

### Leaked password protection

No se activa: el proyecto es plan **Free** y la opción es solo Pro+. Warning `auth_leaked_password_protection` aceptado; entrada en `specs/BACKLOG.md`.

## Verificación

### Contraseña mínima

Con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de `.env.local`:

```bash
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"prueba-min-pass@example.com","password":"1234567"}'
```

Esperado: error con `"error_code":"weak_password"`. Resultado: `_____`
