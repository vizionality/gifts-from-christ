"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { WooImage } from "@/lib/woo/types";

export function ProductGallery({
  images,
  productName,
}: {
  images: WooImage[];
  productName: string;
}) {
  const [active, setActive] = useState(0);

  if (!images.length) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-card bg-surface-sunk text-sm text-ink-subtle">
        No image available
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {images.length > 1 ? (
        <ul className="flex gap-3 lg:flex-col" role="list">
          {images.map((image, index) => (
            <li key={image.id || index}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-current={index === active}
                className={cn(
                  "relative h-16 w-16 overflow-hidden rounded-md border-2 transition-colors lg:h-20 lg:w-20",
                  index === active
                    ? "border-accent"
                    : "border-transparent hover:border-line-strong",
                )}
              >
                <Image
                  src={image.thumbnail || image.src}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative aspect-square flex-1 overflow-hidden rounded-card bg-surface-sunk">
        <Image
          key={current.id}
          src={current.src}
          alt={current.alt || productName}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="animate-fade-up object-cover"
        />
      </div>
    </div>
  );
}
