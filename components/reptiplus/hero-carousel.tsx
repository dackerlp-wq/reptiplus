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

export function HeroCarousel({
  slides,
  ctaLabel,
}: {
  slides: HeroSlide[];
  ctaLabel: string;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

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
      className="bg-forest-deep text-cream"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto max-w-7xl px-4 py-10 md:py-14">
        <div className="grid items-center gap-8 md:grid-cols-2">
          {/* Text */}
          <div className="order-2 md:order-1">
            {s.brand && (
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-gold-light">
                {s.brand}
              </p>
            )}
            <h1 className="font-display text-3xl font-bold leading-tight text-white md:text-5xl">
              {s.name}
            </h1>
            {s.description && (
              <p className="mt-4 max-w-md text-base leading-relaxed text-cream/80 line-clamp-3">
                {s.description}
              </p>
            )}
            <p className="mt-4 font-mono text-2xl font-semibold text-gold-light">
              {s.priceLabel}
            </p>
            <Link
              href={`/produkt/${s.slug}`}
              className="mt-7 inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-semibold text-white transition-colors hover:bg-gold-light"
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
            <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-hidden rounded-2xl bg-white">
              {s.imageUrl ? (
                <Image
                  key={s.slug}
                  src={s.imageUrl}
                  alt={s.name}
                  fill
                  sizes="(max-width: 768px) 90vw, 40vw"
                  className="object-contain p-6"
                  priority
                />
              ) : (
                <Leaf className="size-24 text-forest-light/30" />
              )}
            </div>
          </Link>
        </div>

        {/* Ovládání */}
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Předchozí"
              onClick={() => go(i - 1)}
              className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 md:block"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Další"
              onClick={() => go(i + 1)}
              className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 md:block"
            >
              <ChevronRight className="size-5" />
            </button>
            <div className="mt-8 flex justify-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === i % count ? "w-6 bg-gold" : "w-2 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
