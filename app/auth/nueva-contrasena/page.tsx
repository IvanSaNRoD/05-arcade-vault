import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

// Se llega desde el enlace de recuperación: /auth/callback ya creó la sesión.
export default async function NewPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  return (
    <div className="av-auth-wrap fade-in">
      <NewPasswordForm />
    </div>
  );
}
