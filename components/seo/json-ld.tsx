/**
 * Vloží structured data (schema.org) jako JSON-LD skript.
 * Inline skript je povolen CSP direktivou script-src 'unsafe-inline'.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
