import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder shown while a route's chunk streams in.
 *
 * Every workspace route is code-split, and `next/dynamic` renders `null` until
 * its chunk arrives - so the first visit to /trades, /analytics, /community and
 * friends used to flash an empty content area. These shapes are deliberately
 * rough: they only need to hold the right amount of space so the layout does
 * not jump when the real component lands.
 */

function Row({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-4 w-full ${className}`} />;
}

/** Stat tiles above a wide chart - dashboard and analytics. */
export function ChartRouteSkeleton() {
  return (
    <div className="space-y-3 p-3 sm:p-5" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[260px] rounded-xl sm:h-[320px]" />
      <Skeleton className="h-[180px] rounded-xl" />
    </div>
  );
}

/** Repeating rows - trades, accounts, community lists. */
export function ListRouteSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-3 sm:p-5" aria-hidden>
      <Skeleton className="h-9 w-48 rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** A month grid. */
export function CalendarRouteSkeleton() {
  return (
    <div className="space-y-3 p-3 sm:p-5" aria-hidden>
      <Skeleton className="h-9 w-44 rounded-lg" />
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton key={index} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** A single wide document - settings, pricing, trade detail, admin. */
export function PanelRouteSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-5" aria-hidden>
      <Skeleton className="h-8 w-56 rounded-lg" />
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <Row className="w-3/4" />
        <Row className="w-1/2" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
