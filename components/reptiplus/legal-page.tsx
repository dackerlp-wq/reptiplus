import { getShopContact } from "@/lib/settings";

/** Sdílený shell pro právní stránky (obchodní podmínky, GDPR). */
export async function LegalPage({
  title,
  content,
  notice,
  sellerLabel,
}: {
  title: string;
  content?: string;
  notice: string;
  sellerLabel: string;
}) {
  const contact = await getShopContact();

  return (
    <section className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="mb-6 font-display text-4xl font-bold">{title}</h1>

      {content ? (
        <div
          className="rich-content text-charcoal"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <p className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-charcoal">
          {notice}
        </p>
      )}

      <div className="mt-10 rounded-xl border border-cream-dark bg-white p-6 text-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-soft">
          {sellerLabel}
        </p>
        <p className="font-medium text-ink">{contact.name}</p>
        {contact.address && <p className="text-charcoal">{contact.address}</p>}
        {contact.ico && <p className="text-charcoal">IČO: {contact.ico}</p>}
        {contact.dic && <p className="text-charcoal">DIČ: {contact.dic}</p>}
        <p className="text-charcoal">{contact.email}</p>
        {contact.phone && <p className="text-charcoal">{contact.phone}</p>}
        {contact.registration && (
          <p className="mt-2 text-xs text-gray-soft">{contact.registration}</p>
        )}
      </div>
    </section>
  );
}
