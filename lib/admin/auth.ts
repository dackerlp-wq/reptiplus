import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Ověří přihlášeného admina/staffa. Jinak přesměruje. Vrací uživatele + roli. */
export async function requireAdmin(locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/prihlaseni`);

  const { data: profile } = await supabase
    .from("customer")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    redirect(`/${locale}`);
  }
  return { user, role: profile.role };
}
