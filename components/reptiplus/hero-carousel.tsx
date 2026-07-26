"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type HeroSlide = {
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  imageUrl: string | null;
  priceLabel: string;
};

export type HeroVariant = "light" | "logo" | "logo-dark";

/** Barevné sady carouselu — přepínatelné v adminu (Vzhled → Styl carouselu). */
const VARIANTS: Record<
  HeroVariant,
  {
    section: string;
    brand: string;
    title: string;
    desc: string;
    price: string;
    cta: string;
    card: string;
    ctrl: string;
    dotActive: string;
    dotIdle: string;
    placeholder: string;
  }
> = {
  light: {
    section: "border-b border-cream-dark bg-paper text-charcoal",
    brand: "text-forest",
    title: "text-ink",
    desc: "text-charcoal/75",
    price: "text-forest-dark",
    cta: "bg-gold text-white hover:bg-gold-light",
    card: "border border-cream-dark shadow-sm",
    ctrl: "bg-forest/10 text-forest hover:bg-forest/20",
    dotActive: "bg-gold",
    dotIdle: "bg-forest/25 hover:bg-forest/45",
    placeholder: "text-forest-light/30",
  },
  logo: {
    section: "bg-logo text-forest-deep",
    brand: "text-forest-deep",
    title: "text-forest-deep",
    desc: "text-forest-deep/80",
    price: "text-forest-deep",
    cta: "bg-forest-deep text-cream hover:bg-forest-dark",
    card: "border border-forest-deep/10 shadow-md",
    ctrl: "bg-forest-deep/15 text-forest-deep hover:bg-forest-deep/25",
    dotActive: "bg-forest-deep",
    dotIdle: "bg-forest-deep/25 hover:bg-forest-deep/45",
    placeholder: "text-forest-deep/25",
  },
  "logo-dark": {
    section: "bg-forest-deep text-cream",
    brand: "text-gold-light",
    title: "text-white",
    desc: "text-cream/80",
    price: "text-gold-light",
    cta: "bg-gold text-white hover:bg-gold-light",
    card: "border border-white/10 shadow-md",
    ctrl: "bg-white/10 text-white hover:bg-white/20",
    dotActive: "bg-gold",
    dotIdle: "bg-white/30 hover:bg-white/50",
    placeholder: "text-forest-light/30",
  },
};

export function HeroCarousel({
  slides,
  ctaLabel,
  variant = "light",
}: {
  slides: HeroSlide[];
  ctaLabel: string;
  variant?: HeroVariant;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const v = VARIANTS[variant];

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = setInterval(() => setI((p) => (p + 1) % count), 5000);
    return () => clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;
  const s = slides[i % count];
  const go = (n: number) => setI((n + count) % count);

  return (
    <section
      className={v.section}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-14">
        <div className="grid items-center gap-6 md:grid-cols-2 md:gap-8">
          {/* Text */}
          <div className="order-2 md:order-1">
            {s.brand && (
              <p className={`mb-1.5 text-xs font-semibold uppercase tracking-widest md:mb-2 md:text-sm ${v.brand}`}>
                {s.brand}
              </p>
            )}
            <h1 className={`font-display text-2xl font-bold leading-tight sm:text-3xl md:text-5xl ${v.title}`}>
              {s.name}
            </h1>
            {s.description && (
              <p className={`mt-3 max-w-md text-sm leading-relaxed line-clamp-2 md:mt-4 md:text-base md:line-clamp-3 ${v.desc}`}>
                {s.description}
              </p>
            )}
            <p className={`mt-3 font-mono text-xl font-semibold md:mt-4 md:text-2xl ${v.price}`}>
              {s.priceLabel}
            </p>
            <Link
              href={`/produkt/${s.slug}`}
              className={`mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors md:mt-7 md:px-6 md:py-3 md:text-base ${v.cta}`}
            >
              {ctaLabel} <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Obrázek */}
          <Link
            href={`/produkt/${s.slug}`}
            className="order-1 md:order-2"
            aria-label={s.name}
          >
            <div className={`relative mx-auto flex aspect-square w-full max-w-[13rem] items-center justify-center overflow-hidden rounded-2xl bg-white sm:max-w-xs md:max-w-md ${v.card}`}>
              {s.imageUrl ? (
                <Image
                  key={s.slug}
                  src={s.imageUrl}
                  alt={s.name}
                  fill
                  sizes="(max-width: 768px) 60vw, 40vw"
                  className="object-contain p-4 md:p-6"
                  priority
                />
              ) : (
                <Leaf className={`size-16 md:size-24 ${v.placeholder}`} />
              )}
            </div>
          </Link>
        </div>

        {/* Ovládání — šipky u teček (nepřekrývají text) */}
        {count > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3 md:mt-8">
            <button
              type="button"
              aria-label="Předchozí"
              onClick={() => go(i - 1)}
              className={`rounded-full p-1.5 transition-colors ${v.ctrl}`}
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === i % count ? `w-6 ${v.dotActive}` : `w-2 ${v.dotIdle}`
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Další"
              onClick={() => go(i + 1)}
              className={`rounded-full p-1.5 transition-colors ${v.ctrl}`}
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
