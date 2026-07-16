"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mergeGuestCartOnLogin } from "@/lib/cart/cart";

export type AuthState = { error?: string } | undefined;

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { error: error.message };

  // Sloučit hostův košík do účtu, aby zákazník nepřišel o položky.
  if (data.user) await mergeGuestCartOnLogin(data.user.id);

  redirect(redirectTo);
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: error.message };

  // Pokud je zapnuté potvrzení e-mailu, session nevznikne hned.
  if (!data.session) return { error: "CONFIRM_EMAIL" };

  // Session vznikla hned → sloučit hostův košík do nového účtu.
  if (data.user) await mergeGuestCartOnLogin(data.user.id);

  redirect(redirectTo);
}

export async function signOutAction(formData: FormData): Promise<void> {
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(redirectTo);
}
