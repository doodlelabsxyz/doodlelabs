"use client";

import { Image as IKImage } from "@imagekit/next";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const GRADIENTS: Array<[string, string, number]> = [
  ["#1a0630", "#49008d", 135],
  ["#120a1f", "#7b35c4", 120],
  ["#0d0716", "#3a1060", 150],
  ["#1a0e08", "#c97b0e", 140],
  ["#100518", "#8a4fd1", 110],
  ["#0a0a0a", "#4a1a70", 160],
  ["#160a28", "#b98ee8", 128],
  ["#0e0716", "#5b1596", 105],
];

export function swatchStyle(seed: number): React.CSSProperties {
  const [from, to, angle] = GRADIENTS[Math.abs(seed) % GRADIENTS.length];
  return { backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})` };
}

export function PlaceholderArt({
  seed,
  icon: Icon,
  label,
  className,
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: {
  seed: number;
  icon?: LucideIcon;
  label?: string;
  className?: string;
  /** Path of a real asset in the ImageKit media library. Renders in place of the gradient placeholder when set. */
  src?: string;
  alt?: string;
  sizes?: string;
}) {
  return (
    <div
      className={cn("tile-art relative flex items-center justify-center overflow-hidden", className)}
      style={src ? undefined : swatchStyle(seed)}
    >
      {src ? (
        <IKImage
          src={src}
          alt={alt ?? label ?? "DoodleLabs work"}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <>
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, rgba(255,255,255,.5) 0, rgba(255,255,255,.5) 1px, transparent 1px, transparent 9px)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.10), transparent 60%)",
            }}
          />
          {Icon ? <Icon className="relative z-[1] size-6 text-white/25" strokeWidth={1.5} /> : null}
        </>
      )}
      {label ? (
        <span className="absolute bottom-2 left-2 z-[1] font-(family-name:--font-label) text-[8px] tracking-[0.18em] text-white/25 uppercase">
          {label}
        </span>
      ) : null}
    </div>
  );
}
