"use client";

import { useState } from "react";
import Image from "next/image";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductImage } from "@/lib/queries";

export function ProductGallery({
  images,
  name,
}: {
  images: ProductImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-paper">
        <Leaf className="size-24 text-forest-light/30" />
      </div>
    );
  }

  const main = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-paper">
        <Image
          src={main.url}
          alt={main.alt || name}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${name} — obrázek ${i + 1}`}
              className={cn(
                "relative aspect-square overflow-hidden rounded-lg bg-paper ring-2 ring-transparent transition",
                i === active ? "ring-forest" : "hover:ring-forest/40",
              )}
            >
              <Image
                src={img.url}
                alt={img.alt || name}
                fill
                sizes="20vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
