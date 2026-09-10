/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/** Galerie fotek řady s náhledy. */
export function LedxGallery({ images, tag }: { images: string[]; tag: string }) {
  const t = useTranslations("Ledx");
  const [active, setActive] = useState(0);
  if (images.length === 0) return <div className="plinth"><span className="tag">{tag}</span></div>;
  return (
    <div className="gallery">
      <div className="plinth">
        <span className="tag">{tag}</span>
        <img src={images[active]} alt={`LEDX ${tag}`} />
      </div>
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((im, i) => (
            <button
              key={im + i}
              type="button"
              className={`thumb${i === active ? " on" : ""}`}
              onClick={() => setActive(i)}
              aria-label={t("photo", { n: i + 1 })}
              aria-pressed={i === active}
            >
              <img src={im} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
