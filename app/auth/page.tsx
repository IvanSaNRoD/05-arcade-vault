import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/juegos");

  const { error } = await searchParams;

  return (
    <div className="av-auth-wrap fade-in">
      <AuthForm linkError={error === "enlace"} />
    </div>
  );
}
