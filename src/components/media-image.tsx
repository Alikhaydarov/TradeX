"use client";

import Image, {
  type ImageLoader,
  type ImageProps,
} from "next/image";

const passthroughLoader: ImageLoader = ({ src }) => src;

const OPTIMIZED_HOSTS = new Set([
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "images.unsplash.com",
]);

function canUseDefaultOptimizer(src: string) {
  if (src.startsWith("/")) return true;
  try {
    const hostname = new URL(src).hostname;
    return hostname.endsWith(".supabase.co") || OPTIMIZED_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

type MediaImageProps = Omit<
  ImageProps,
  "src" | "alt" | "width" | "height" | "priority" | "loading" | "loader"
> & {
  src: string;
  alt: string;
  eager?: boolean;
  width?: number;
  height?: number;
};

export function MediaImage({
  src,
  alt,
  eager = false,
  width = 1600,
  height = 1000,
  fill = false,
  sizes,
  ...props
}: MediaImageProps) {
  const optimized = canUseDefaultOptimizer(src);
  const dimensions = fill ? {} : { width, height };
  const loading = eager ? { priority: true as const } : { loading: "lazy" as const };

  return (
    <Image
      {...props}
      {...dimensions}
      {...loading}
      src={src}
      alt={alt}
      fill={fill || undefined}
      sizes={sizes ?? (fill ? "100vw" : undefined)}
      loader={optimized ? undefined : passthroughLoader}
      unoptimized={!optimized}
      draggable={false}
    />
  );
}
