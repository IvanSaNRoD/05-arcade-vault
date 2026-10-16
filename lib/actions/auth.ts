"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "check-email"; email: string };

export type OAuthProvider = "google" | "github";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9_]{3,16}$/;
const MIN_PASSWORD = 8;

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu correo antes de entrar.",
  user_already_exists: "Ya existe una cuenta con ese correo.",
  over_email_send_rate_limit: "Demasiados correos enviados. Prueba en un rato.",
};

const fail = (error: string): AuthState => ({ status: "error", error });

const authFail = (error: AuthError): AuthState =>
  fail((error.code && ERROR_MESSAGES[error.code]) ?? "Algo falló. Intenta de nuevo.");

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// Base para los enlaces de retorno de Supabase (emails y OAuth).
async function getOrigin() {
  return (await headers()).get("origin") ?? "http://localhost:3000";
}

function validateEmail(email: string) {
  return EMAIL_REGEX.test(email) ? null : "El formato del correo no es válido.";
}

function validatePassword(password: string) {
  return password.length >= MIN_PASSWORD
    ? null
    : `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const username = field(formData, "username").toLowerCase();
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");

  if (!USERNAME_REGEX.test(username)) {
    return fail("Usuario: 3–16 caracteres, solo letras, números y _.");
  }
  const invalid = validateEmail(email) ?? validatePassword(password);
  if (invalid) return fail(invalid);

  const supabase = await createClient();

  const { data: taken, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (lookupError) return fail("Algo falló. Intenta de nuevo.");
  if (taken) return fail("Ese usuario ya está en uso.");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
    },
  });
  if (error) return authFail(error);

  return { status: "check-email", email };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");

  const invalid = validateEmail(email);
  if (invalid) return fail(invalid);
  if (!password) return fail("Introduce tu contraseña.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return authFail(error);

  redirect("/juegos");
}

// Se usa con `.bind(null, provider)` como action de un <form>.
export async function signInWithProvider(provider: OAuthProvider): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await getOrigin()}/auth/callback` },
  });
  if (error || !data.url) redirect("/auth?error=enlace");

  redirect(data.url);
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = field(formData, "email");

  const invalid = validateEmail(email);
  if (invalid) return fail(invalid);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/auth/nueva-contrasena`,
  });
  // Mismo resultado exista o no la cuenta (no se enumeran emails); solo el
  // límite de envío se comunica porque el usuario puede actuar sobre él.
  if (error?.code === "over_email_send_rate_limit") return authFail(error);

  return { status: "check-email", email };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");

  const invalid = validatePassword(password);
  if (invalid) return fail(invalid);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return authFail(error);

  redirect("/juegos");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
