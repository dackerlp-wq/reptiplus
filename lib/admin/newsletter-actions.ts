"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from("customer").select("role").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) throw new Error("Forbidden");
}

/** Odhlášení odběratele z adminu (zůstane v seznamu jako odhlášený kvůli evidenci slevy). */
export async function unsubscribeSubscriberAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) throw new Error("Chybí ID");
  const svc = createServiceClient();
  const { error } = await svc
    .from("newsletter_subscriber")
    .update({ is_confirmed: false, unsubscribed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter");
}

/** Úplné smazání záznamu (GDPR). */
export async function deleteSubscriberAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) throw new Error("Chybí ID");
  const svc = createServiceClient();
  const { error } = await svc.from("newsletter_subscriber").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter");
}
