/* eslint-disable @next/next/no-img-element */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LedxLine } from "@/lib/ledx/queries";
import { LedxShell } from "./ledx-styles";
import { LedxGallery } from "./ledx-gallery";
import { LedxInquiryForm } from "./inquiry-form";
import { Arrow, LEDX_BASE, lineHref, lineNo } from "./ledx-page";

/** Detail jedné řady LEDX (vlastní URL). */
export async function LedxLineDetail({
  line,
  index,
  others,
}: {
  line: LedxLine;
  index: number;
  others: LedxLine[];
}) {
  const t = await getTranslations("Ledx");
  const cols = [t("colModel"), t("colPower"), t("colFlux"), t("colDims"), t("colWeight")];

  return (
    <LedxShell>
      <div className="shell">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href={LEDX_BASE}>← {t("back")}</Link>
        </nav>
      </div>

      <section className="dhero"><div className="shell"><div className="dhero-grid">
        <div>
          <div className="line-no">{t("lineNo", { n: lineNo(index) })} · LEDX</div>
          <h1 className="dtitle">{line.name}<span>{line.subtitle}</span></h1>
          <div className="badge-row"><span className="pill-order">{t("orderBadge")}</span></div>
          <p className="dlead">{line.detailLead}</p>
          <div className="hi-specs">{line.detailPills.map((p) => <span key={p} className="hipill">{p}</span>)}</div>
          <div className="cta-row"><a className="btn primary" href="#poptavka">{t("inquireCta")} <Arrow /></a></div>
        </div>
        <LedxGallery images={line.images} tag={line.name} />
      </div></div></section>

      {line.models.length > 0 && (
        <section className="dsection"><div className="shell">
          <h2 className="dh2">{t("modelsTitle")}</h2>
          {line.modelsNote && <p className="sec-sub">{line.modelsNote}</p>}
          <div className="tablewrap"><table>
            <thead><tr>{cols.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>
              {line.models.map((r, i) => (
                <tr key={`${r[0]}-${i}`}>
                  <th scope="row">{r[0]}</th>
                  {cols.slice(1).map((_, ci) => <td key={ci}>{r[ci + 1] ?? ""}</td>)}
                </tr>
              ))}
            </tbody>
          </table></div>
        </div></section>
      )}

      {line.params.length > 0 && (
        <section className="dsection alt"><div className="shell">
          <h2 className="dh2">{t("paramsTitle")}</h2>
          <div className="paramgrid">
            {line.params.map(([k, v], i) => (
              <div key={`${k}-${i}`} className="param"><div className="k">{k}</div><div className="v">{v}</div></div>
            ))}
          </div>
        </div></section>
      )}

      {line.uses.length > 0 && (
        <section className="dsection"><div className="shell">
          <h2 className="dh2">{line.usesTitle || t("usesTitleDefault")}</h2>
          <div className="tagcloud">{line.uses.map((u) => <span key={u}>{u}</span>)}</div>
        </div></section>
      )}

      <section className="dsection alt" id="poptavka"><div className="shell"><div className="qwrap">
        <p className="kicker gold">{t("inquiryKicker")}</p>
        <h2 className="dh2">{t("inquiryTitle", { name: line.name })}</h2>
        <p className="sec-sub">{t("inquirySub")}</p>
        <LedxInquiryForm
          config={{
            rada: line.name,
            models: line.formModels,
            cct: line.formCctFixed ? { fixed: line.formCctFixed } : line.formCct,
            uhel: line.formUhel,
          }}
        />
      </div></div></section>

      {others.length > 0 && (
        <section className="others"><div className="shell">
          <h2 className="dh2">{t("otherLines")}</h2>
          <div className="othergrid">
            {others.map((o) => (
              <Link key={o.id} href={lineHref(o.slug)} className="othercard">
                <div className="im">{o.images[0] && <img src={o.images[0]} alt="" loading="lazy" />}</div>
                <div>
                  <div className="nm">{o.name}</div>
                  <div className="sb">{o.subtitle}</div>
                </div>
              </Link>
            ))}
          </div>
        </div></section>
      )}
    </LedxShell>
  );
}
