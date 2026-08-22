import type { SVGProps } from "react";

import {
  TRADOXY_MARK_PATHS,
  TRADOXY_MARK_TRANSFORM,
  TRADOXY_MARK_VIEWBOX,
} from "@/lib/tradoxy-mark";

/**
 * The Tradoxy monogram, inlined rather than fetched.
 *
 * It ships as geometry so it stays crisp at any size, costs no request, and
 * inherits `currentColor` - so the same mark works on the black sidebar, on a
 * white surface, or dimmed inside a disabled state.
 *
 * The paths live in lib/tradoxy-mark so the canvas share-card renderer draws
 * the identical mark; two copies of this geometry is how they drift apart.
 */
export function TradoxyMark(props: SVGProps<SVGSVGElement>) {
  const t = TRADOXY_MARK_TRANSFORM;
  return (
    <svg
      viewBox={TRADOXY_MARK_VIEWBOX}
      fill="currentColor"
      role="img"
      aria-label="Tradoxy"
      {...props}
    >
      <g transform={`translate(${t.offsetX},${t.offsetY})`}>
        <g
          transform={`translate(${t.flipX},${t.flipY}) scale(${t.scaleX},${t.scaleY})`}
          stroke="none"
        >
          {TRADOXY_MARK_PATHS.map((d) => (
            <path key={d.slice(0, 24)} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}
