# Přihlašovací e-maily (Supabase Auth)

Registrace, obnova hesla, magic link a změna e-mailu neposílá aplikace, ale Supabase Auth.
Šablony ani SMTP nejde měnit z kódu — nastavují se v Supabase dashboardu projektu **Reptiplus**
(`duaihkobtgfzprufqjmh`). Připravené šablony jsou v `supabase/templates/`.

## 1) Vlastní SMTP (nutné)

Výchozí SMTP Supabase je jen pro vývoj: limit **2 e-maily za hodinu** a odesílatel `noreply@mail.app.supabase.io`.

Dashboard → **Authentication → Emails → SMTP Settings** → *Enable Custom SMTP*:

| Pole | Hodnota |
|---|---|
| Sender email | `info@reptiplus.cz` (stejná adresa jako `MAIL_FROM` na Vercelu) |
| Sender name | `Reptiplus` |
| Host | `smtp.forpsi.com` (stejné jako `SMTP_HOST`) |
| Port | `587` |
| Username / Password | jako `SMTP_USER` / `SMTP_PASS` na Vercelu |

Po uložení zvednout rate limit: **Authentication → Rate Limits → Emails sent per hour** (např. 30).

## 2) Šablony

Dashboard → **Authentication → Emails → Templates**. U každé šablony vložit obsah souboru do pole *Message body*
a nastavit *Subject heading*:

| Šablona v dashboardu | Soubor | Předmět |
|---|---|---|
| Confirm signup | `supabase/templates/confirmation.html` | `Potvrďte svůj e-mail — Reptiplus` |
| Reset password | `supabase/templates/recovery.html` | `Obnovení hesla — Reptiplus` |
| Magic link | `supabase/templates/magic_link.html` | `Přihlášení do Reptiplus` |
| Change email address | `supabase/templates/email_change.html` | `Potvrďte změnu e-mailu — Reptiplus` |

Šablony jsou trojjazyčné (čeština nahoře, angličtina a němčina pod oddělovačem), protože Supabase
umí jen jednu šablonu na typ e-mailu. Proměnné `{{ .ConfirmationURL }}` a `{{ .NewEmail }}` doplňuje Supabase.

## 3) URL

**Authentication → URL Configuration**:

- Site URL: `https://reptiplus.cz`
- Redirect URLs: `https://reptiplus.cz/**`, `https://reptiplus.eu/**`, `https://reptiplus.shop/**`
  (obnova hesla přesměrovává na `/{locale}/obnova-hesla`, viz `components/reptiplus/reset-password-form.tsx`).

## 4) Potvrzení registrace

**Authentication → Providers → Email → Confirm email**: pokud je zapnuté, zákazník po registraci dostane
e-mail „Confirm signup" a přihlásí se až po kliknutí (formulář to hlásí jako `CONFIRM_EMAIL`).
Pokud je vypnuté, účet vzniká rovnou a šablona se nepoužije.
