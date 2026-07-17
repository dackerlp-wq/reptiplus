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
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-14">
        <div className="grid items-center gap-6 md:grid-cols-2 md:gap-8">
          {/* Text */}
          <div className="order-2 md:order-1">
            {s.brand && (
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-gold-light md:mb-2 md:text-sm">
                {s.brand}
              </p>
            )}
            <h1 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl md:text-5xl">
              {s.name}
            </h1>
            {s.description && (
              <p className="mt-3 max-w-md text-sm leading-relaxed text-cream/80 line-clamp-2 md:mt-4 md:text-base md:line-clamp-3">
                {s.description}
              </p>
            )}
            <p className="mt-3 font-mono text-xl font-semibold text-gold-light md:mt-4 md:text-2xl">
              {s.priceLabel}
            </p>
            <Link
              href={`/produkt/${s.slug}`}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold-light md:mt-7 md:px-6 md:py-3 md:text-base"
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
            <div className="relative mx-auto flex aspect-square w-full max-w-[13rem] items-center justify-center overflow-hidden rounded-2xl bg-white sm:max-w-xs md:max-w-md">
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
                <Leaf className="size-16 text-forest-light/30 md:size-24" />
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
              className="rounded-full bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
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
                    idx === i % count ? "w-6 bg-gold" : "w-2 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Další"
              onClick={() => go(i + 1)}
              className="rounded-full bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
