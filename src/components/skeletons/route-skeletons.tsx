import { Skeleton } from "@/components/ui/skeleton";

/**
 * The trade detail screen's own loading state.
 *
 * This file used to hold a skeleton per workspace route, fed to next/dynamic.
 * Those are gone: routes now resolve their data on the server and navigations
 * hold the current page until the next one is ready, so there is nothing left
 * for a route-shaped placeholder to stand in for. What remains is the one
 * genuine in-page wait - opening a single trade, which still fetches after
 * mount.
 */

function Shell({
  children,
  label,
  width = "max-w-[1260px]",
  pad = "pb-20",
}: {
  children: React.ReactNode;
  label: string;
  width?: string;
  pad?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={`mx-auto ${width} space-y-4 p-3 ${pad} duration-200 animate-in fade-in sm:p-4 lg:p-5`}
    >
      {children}
    </div>
  );
}

export function TradeDetailSkeleton() {
  return (
    <Shell label="Loading trade" width="max-w-[1540px]" pad="pb-24">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(340px,.84fr)]">
        <div className="space-y-4">
          <Skeleton className="h-80 rounded-2xl opacity-70" />
          <Skeleton className="h-56 rounded-2xl opacity-60" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-80 rounded-2xl opacity-70" />
          <Skeleton className="h-56 rounded-2xl opacity-60" />
        </div>
      </div>
      <Skeleton className="h-[420px] rounded-2xl opacity-50" />
    </Shell>
  );
}
