/* eslint-disable @next/next/no-img-element */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LedxLine, LedxPageContent } from "@/lib/ledx/queries";
import { LedxShell } from "./ledx-styles";
import { LegacyHashRedirect } from "./legacy-hash-redirect";

export const LEDX_BASE = "/kategorie/profi-osvetleni";
export const lineHref = (slug: string) => `${LEDX_BASE}/${slug}`;
export const lineNo = (i: number) => String(i + 1).padStart(2, "0");

export const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/** `CRI až *95*` → CRI až <b>95</b> (bez HTML ze vstupu). */
export function StatValue({ value }: { value: string }) {
  return (
    <>
      {value.split("*").map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part))}
    </>
  );
}

/** Úvodní stránka Profi osvětlení — přehled řad LEDX. */
export async function LedxPage({
  lines,
  content,
}: {
  lines: LedxLine[];
  content: LedxPageContent;
}) {
  const t = await getTranslations("Ledx");
  const heroImg = lines.find((l) => l.images.length)?.images[0] ?? "/ledx/phoenix1-1.webp";
  const apps = t.raw("apps") as string[];

  return (
    <LedxShell>
      <LegacyHashRedirect slugs={lines.map((l) => l.slug)} />

      <header className="hero2"><div className="shell">
        <div className="hero2-grid">
          <div className="hero2-copy">
            <p className="kicker">{t("kicker")}</p>
            <h1>{t.rich("heroTitle", { em: (c) => <em>{c}</em> })}</h1>
            <p className="sub">{t("heroSub")}</p>
            <span className="pill-order">{t("exclusive")}</span>
            <div className="cta-row">
              <a className="btn primary" href="#rady">{t("ctaLines")} <Arrow /></a>
              {content.references.length > 0 && (
                <a className="btn ghost dark" href="#reference">{t("ctaRefs")}</a>
              )}
            </div>
          </div>
          <div className="hero2-visual"><div className="beam" /><img src={heroImg} alt={t("heroImgAlt")} /></div>
        </div>
      </div></header>

      {content.stats.length > 0 && (
        <section className="ticker"><div className="shell"><div className="trow">
          {content.stats.map((s, i) => (
            <div key={i} className="stat">
              <div className="n"><StatValue value={s.value} /></div>
              <div className="l">{s.label}</div>
            </div>
          ))}
        </div></div></section>
      )}

      <section className="intro"><div className="shell">
        <p className="kicker gold">{t("whyKicker")}</p>
        <p className="lead">{t.rich("whyLead", { hl: (c) => <span className="hl">{c}</span> })}</p>
        <p>{t.rich("whyText", { strong: (c) => <strong>{c}</strong> })}</p>
      </div></section>

      <div id="rady">
        {lines.map((l, i) => (
          <section key={l.id} className={`line${i % 2 === 1 ? " flip" : ""}`}><div className="shell"><div className="lgrid">
            <div>
              <div className="line-no">{t("lineNo", { n: lineNo(i) })}</div>
              <h2 className="line-h">{l.name}<span>{l.subtitle}</span></h2>
              {l.tagline && <p className="tagline">{l.tagline}</p>}
              <p className="desc">{l.landingDesc}</p>
              <div className="hi-specs">{l.landingPills.map((p) => <span key={p} className="hipill">{p}</span>)}</div>
              <div className="cta-row">
                <Link className="btn primary" href={lineHref(l.slug)}>{t("lineDetail")} <Arrow /></Link>
              </div>
            </div>
            <div>
              <Link href={lineHref(l.slug)} aria-label={`LEDX ${l.name}`}>
                <div className="plinth">
                  <span className="tag">{l.name}</span>
                  {l.images[0] && <img src={l.images[0]} alt={`LEDX ${l.name}`} loading={i > 0 ? "lazy" : undefined} />}
                </div>
              </Link>
            </div>
          </div></div></section>
        ))}
      </div>

      <section className="apps"><div className="shell">
        <p className="kicker gold">{t("appsKicker")}</p>
        <h2>{t("appsTitle")}</h2>
        <div className="tagcloud">{apps.map((a) => <span key={a}>{a}</span>)}</div>
      </div></section>

      {content.references.length > 0 && (
        <section className="refs" id="reference"><div className="shell">
          <p className="kicker gold">{t("refsKicker")}</p>
          <h2 className="refs-h">{t("ctaRefs")}</h2>
          <p className="sec-sub">{t("refsSub")}</p>
          <div className="refgrid">
            {content.references.map((r, i) => (
              <figure key={i} className="refcard">
                <img src={r.image} alt={r.caption} loading="lazy" />
                {r.caption && <figcaption>{r.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div></section>
      )}

      <section className="cta"><div className="shell"><div className="box"><div className="in">
        <p className="kicker">{t("ctaKicker")}</p>
        <h2>{t("ctaTitle")}</h2>
        <p>{t("ctaText")}</p>
        <div className="cta-row"><a className="btn primary" href="#rady">{t("ctaButton")} <Arrow /></a></div>
      </div></div></div></section>
    </LedxShell>
  );
}
