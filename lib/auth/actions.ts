"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { mergeGuestCartOnLogin } from "@/lib/cart/cart";
import { linkGuestOrders } from "@/lib/account/link-orders";

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

  // Sloučit hostův košík do účtu, aby zákazník nepřišel o položky,
  // a připojit dřívější hostovské objednávky (jen s ověřeným e-mailem).
  if (data.user) {
    await mergeGuestCartOnLogin(data.user.id);
    await linkGuestOrders(data.user);
  }

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

/**
 * Přihlášení / registrace přes Google (Supabase OAuth, PKCE). Přesměruje na
 * Google; návrat řeší `app/api/auth/callback` (výměna kódu za session,
 * sloučení košíku, připojení objednávek) a pak jde na `redirectTo`.
 * Provider Google musí být zapnutý v Supabase (viz docs/GOOGLE_LOGIN.md).
 */
export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  const raw = String(formData.get("redirectTo") ?? "/");
  const redirectTo = /^\/[^/\\]/.test(raw) ? raw : "/";

  // Doména, odkud zákazník přichází (.cz / .eu / .shop) — návrat musí jít na ni.
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || "https://reptiplus.cz";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });
  if (error || !data.url) {
    const locale = redirectTo.match(/^\/(cs|en|de)(\/|$)/)?.[1] ?? "cs";
    redirect(`/${locale}/prihlaseni?error=oauth&redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  redirect(data.url);
}
