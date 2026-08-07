import { ImageResponse } from "next/og";

export const alt = "Reptiplus — Teraristický obchod";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Výchozí OG obrázek webu (branded). Produkty si nastavují vlastní. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f7a1f 0%, #77ad2e 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -2 }}>
          Reptiplus
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 40,
            fontWeight: 500,
            maxWidth: 900,
            lineHeight: 1.3,
            opacity: 0.95,
          }}
        >
          Co sami používáme, to s čistým svědomím doporučujeme!
        </div>
        <div style={{ marginTop: 40, fontSize: 28, opacity: 0.85 }}>
          Teraristický obchod pro chovatele plazů a exotických zvířat
        </div>
      </div>
    ),
    size,
  );
}
