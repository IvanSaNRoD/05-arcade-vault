"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  requestPasswordReset,
  updatePassword,
  signIn,
  signInWithProvider,
  signUp,
  type AuthState,
} from "@/lib/actions/auth";

type Tab = "in" | "up";

const IDLE: AuthState = { status: "idle" };

export const LINK_ERROR =
  "El enlace no es válido o ha caducado. Ábrelo en el mismo navegador donde lo pediste.";

export function AuthHeader() {
  return (
    <div className="auth-header">
      <div className="mark" />
      <h2 className="neon-cyan">ARCADE VAULT</h2>
      <div className="mono mt-1.5 text-[11px] tracking-[0.16em] text-ink-faint">
        ACCESO AL SISTEMA · v2.6
      </div>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div className="auth-error" role="alert">
      &gt; {message}
    </div>
  );
}

export function CheckEmail({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-sent slide-in" role="status">
      <h3>REVISA TU CORREO</h3>
      <p>
        Hemos enviado un enlace a <strong>{email}</strong>.
      </p>
      <p>{children}</p>
    </div>
  );
}

function SignInForm() {
  const [state, action, pending] = useActionState(signIn, IDLE);

  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="auth-email">Correo electrónico</label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jugador@vault.gg"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="auth-pass">Contraseña</label>
        <input
          id="auth-pass"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
        <Link href="/auth/recuperar" className="auth-link">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <button className="btn lg mt-2 w-full" type="submit" disabled={pending}>
        {pending ? "CONECTANDO…" : "ENTRAR AL VAULT"}
      </button>
      {state.status === "error" && <AuthError message={state.error} />}
    </form>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(signUp, IDLE);

  if (state.status === "check-email") {
    return (
      <>
        <CheckEmail email={state.email}>
          Ábrelo en este navegador para activar tu cuenta.
        </CheckEmail>
        <button
          type="button"
          className="btn ghost mt-2.5 w-full"
          onClick={onDone}
        >
          IR A INICIAR SESIÓN
        </button>
      </>
    );
  }

  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="auth-user">Usuario</label>
        <input
          id="auth-user"
          name="username"
          autoComplete="username"
          placeholder="px_kai"
          minLength={3}
          maxLength={16}
          pattern="[a-zA-Z0-9_]+"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="auth-email">Correo electrónico</label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="jugador@vault.gg"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="auth-pass">Contraseña</label>
        <input
          id="auth-pass"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          required
        />
      </div>

      <button className="btn lg mt-2 w-full" type="submit" disabled={pending}>
        {pending ? "CONECTANDO…" : "CREAR Y JUGAR"}
      </button>
      {state.status === "error" && <AuthError message={state.error} />}
    </form>
  );
}

export function AuthForm({ linkError = false }: { linkError?: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("in");

  return (
    <div className="auth-card">
      <AuthHeader />

      <div className="auth-tabs">
        <button
          type="button"
          className={tab === "in" ? "on" : ""}
          onClick={() => setTab("in")}
        >
          INICIAR SESIÓN
        </button>
        <button
          type="button"
          className={tab === "up" ? "on" : ""}
          onClick={() => setTab("up")}
        >
          CREAR CUENTA
        </button>
      </div>

      {linkError && (
        <div className="mb-3">
          <AuthError message={LINK_ERROR} />
        </div>
      )}

      {tab === "in" ? (
        <SignInForm />
      ) : (
        <SignUpForm onDone={() => setTab("in")} />
      )}

      <button
        type="button"
        className="btn ghost mt-2.5 w-full"
        onClick={() => router.push("/juegos")}
      >
        JUGAR COMO INVITADO
      </button>

      <div className="auth-divider">O CONTINÚA CON</div>
      <div className="social">
        <form action={signInWithProvider.bind(null, "google")}>
          <button className="btn ghost w-full" type="submit">
            ◆ GOOGLE
          </button>
        </form>
        <form action={signInWithProvider.bind(null, "github")}>
          <button className="btn ghost w-full" type="submit">
            ▣ GITHUB
          </button>
        </form>
      </div>

      <div className="mt-4.5 text-center text-[11px] tracking-widest text-ink-faint">
        AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
      </div>
    </div>
  );
}

export function RecoverForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, IDLE);

  return (
    <div className="auth-card">
      <AuthHeader />
      <h3 className="pixel mt-4.5 mb-3 text-center text-[11px] tracking-widest">
        RECUPERAR CONTRASEÑA
      </h3>

      {state.status === "check-email" ? (
        <CheckEmail email={state.email}>
          Si hay una cuenta con ese correo, ábrelo en este navegador para elegir
          una contraseña nueva.
        </CheckEmail>
      ) : (
        <form action={action}>
          <div className="field">
            <label htmlFor="auth-email">Correo electrónico</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="jugador@vault.gg"
              required
            />
          </div>
          <button
            className="btn lg mt-2 w-full"
            type="submit"
            disabled={pending}
          >
            {pending ? "ENVIANDO…" : "ENVIAR ENLACE"}
          </button>
          {state.status === "error" && <AuthError message={state.error} />}
        </form>
      )}

      <Link href="/auth" className="btn ghost mt-2.5 w-full">
        VOLVER A INICIAR SESIÓN
      </Link>
    </div>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, IDLE);

  return (
    <div className="auth-card">
      <AuthHeader />
      <h3 className="pixel mt-4.5 mb-3 text-center text-[11px] tracking-widest">
        NUEVA CONTRASEÑA
      </h3>

      <form action={action}>
        <div className="field">
          <label htmlFor="auth-pass">Contraseña nueva</label>
          <input
            id="auth-pass"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
          />
        </div>
        <button className="btn lg mt-2 w-full" type="submit" disabled={pending}>
          {pending ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
        </button>
        {state.status === "error" && <AuthError message={state.error} />}
      </form>
    </div>
  );
}
