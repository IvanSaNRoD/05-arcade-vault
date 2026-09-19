"use server";

import { Resend } from "resend";

export interface ContactPayload {
  name: string;
  email: string;
  msg: string;
}

export type ContactResult = { ok: true } | { ok: false; error: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendContactMessage(
  payload: ContactPayload
): Promise<ContactResult> {
  const { name, email, msg } = payload;

  if (!name.trim() || !email.trim() || !msg.trim()) {
    return { ok: false, error: "Todos los campos son obligatorios." };
  }

  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: "El formato del correo no es válido." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.CONTACT_EMAIL!,
      subject: `Nuevo mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    });

    if (error) {
      return { ok: false, error: "No se pudo enviar el mensaje. Intenta de nuevo." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo enviar el mensaje. Intenta de nuevo." };
  }
}
