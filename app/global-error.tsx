"use client";

/** Chyba mimo locale layout (bez překladů a fontů) — minimální záchranná stránka. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="cs">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f4ef", color: "#1b1f17" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Něco se pokazilo / Something went wrong</h1>
          <p style={{ color: "#6b7280" }}>Zkuste to prosím znovu. / Please try again.</p>
          {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 24, background: "#2e6b0a", color: "#fff", border: 0, borderRadius: 8, padding: "12px 20px", fontWeight: 600, cursor: "pointer" }}
          >
            Zkusit znovu / Retry
          </button>
        </main>
      </body>
    </html>
  );
}
