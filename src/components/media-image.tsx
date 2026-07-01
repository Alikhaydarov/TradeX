"use client";

import type { ImgHTMLAttributes } from "react";

type MediaImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding" | "draggable"> & {
  eager?: boolean;
};

export function MediaImage({ eager = false, alt, ...props }: MediaImageProps) {
  return (
    // User-uploaded media can be remote Supabase URLs or generated data URLs, so a plain img is intentional here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      decoding="async"
      draggable={false}
      loading={eager ? "eager" : "lazy"}
    />
  );
}
