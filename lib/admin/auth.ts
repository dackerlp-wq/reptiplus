import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Ověří admina/staffa v Server Action (bez přesměrování — vyhodí chybu).
 * Vrací uživatele, aby šlo do historie zapsat, kdo akci provedl.
 */
export async function assertAdminUser(): Promise<{
  id: string;
  email: string | null;
  role: "admin" | "staff";
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase
    .from("customer")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) {
    throw new Error("Forbidden");
  }
  return { id: user.id, email: user.email ?? null, role: profile.role };
}

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
