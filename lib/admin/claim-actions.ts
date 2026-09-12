"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isClaimStatus } from "@/lib/claims/status";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from("customer").select("role").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "staff")) throw new Error("Forbidden");
}

/** Změna stavu reklamace / odstoupení. */
export async function setClaimStatusAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!id || !isClaimStatus(status)) throw new Error("Neplatný stav.");
  const svc = createServiceClient();
  const { error } = await svc
    .from("claim")
    .update({
      status,
      resolved_at: status === "resolved" || status === "rejected" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

/** Interní poznámka k reklamaci. */
export async function setClaimNoteAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  const note = String(fd.get("admin_note") ?? "").trim().slice(0, 5000);
  if (!id) throw new Error("Chybí ID.");
  const svc = createServiceClient();
  const { error } = await svc.from("claim").update({ admin_note: note || null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/claims");
}

/** Smazání záznamu (GDPR / omyl). */
export async function deleteClaimAction(fd: FormData) {
  await assertAdmin();
  const id = String(fd.get("id") ?? "");
  if (!id) throw new Error("Chybí ID.");
  const svc = createServiceClient();
  const { error } = await svc.from("claim").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
