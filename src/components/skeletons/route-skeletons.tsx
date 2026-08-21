import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading states that match the shape of the screen they stand in for.
 *
 * Every workspace route used to fall back to one generic "four stat tiles and a
 * chart" placeholder, so opening the trades archive or a community showed a
 * dashboard outline that was then replaced by something structurally unrelated.
 * The container geometry here deliberately mirrors the real pages
 * (max-w-[1260px], the same padding ramp) so nothing shifts on swap.
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

function Panel({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-white/8 bg-surface ${className}`}>
      {children}
    </div>
  );
}

function Header({ action = true }: { action?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56 opacity-60" />
      </div>
      {action ? <Skeleton className="h-9 w-28 rounded-xl" /> : null}
    </div>
  );
}

function StatTiles({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Panel key={index} className="p-4">
          <Skeleton className="h-3 w-20 opacity-70" />
          <Skeleton className="mt-3 h-7 w-28" />
          <Skeleton className="mt-3 h-3 w-16 opacity-50" />
        </Panel>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <Shell label="Loading dashboard">
      <Header />
      <StatTiles />
      <Panel className="p-4 sm:p-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-[260px] w-full opacity-40 sm:h-[340px]" />
      </Panel>
    </Shell>
  );
}

export function AnalyticsSkeleton() {
  return (
    <Shell label="Loading analytics">
      <Header action={false} />
      <StatTiles count={4} />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Panel key={index} className="p-4 sm:p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-4 h-[220px] w-full opacity-40" />
          </Panel>
        ))}
      </div>
    </Shell>
  );
}

export function TradesSkeleton() {
  return (
    <Shell label="Loading trades">
      <Header />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-xl opacity-70" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <Panel key={index} className="overflow-hidden">
            <Skeleton className="aspect-[16/10] w-full rounded-none opacity-50" />
            <div className="space-y-3 p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-7 rounded-lg" />
                <Skeleton className="h-3 flex-1 opacity-60" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-3 w-2/3 opacity-50" />
            </div>
          </Panel>
        ))}
      </div>
    </Shell>
  );
}

export function AccountsSkeleton() {
  return (
    <Shell label="Loading accounts">
      <Header />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Panel key={index} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20 opacity-60" />
              </div>
            </div>
            <Skeleton className="mt-4 h-2 w-full rounded-full opacity-50" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }, (_, cell) => (
                <div key={cell} className="space-y-2">
                  <Skeleton className="h-3 w-12 opacity-50" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </Shell>
  );
}

export function CalendarSkeleton() {
  return (
    <Shell label="Loading calendar">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-2">
          <Skeleton className="size-9 rounded-xl" />
          <Skeleton className="size-9 rounded-xl" />
        </div>
      </div>
      <StatTiles count={4} />
      <Panel className="p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={`head-${index}`} className="h-3 w-full opacity-45" />
          ))}
          {Array.from({ length: 35 }, (_, index) => (
            <Skeleton
              key={index}
              className="aspect-square w-full rounded-lg opacity-40"
            />
          ))}
        </div>
      </Panel>
    </Shell>
  );
}

export function CommunitySkeleton() {
  return (
    <Shell label="Loading communities">
      <Header />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Panel key={index} className="overflow-hidden">
            <Skeleton className="h-20 w-full rounded-none opacity-45" />
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32 opacity-60" />
                </div>
              </div>
              <Skeleton className="h-3 w-full opacity-50" />
              <Skeleton className="h-3 w-4/5 opacity-40" />
            </div>
          </Panel>
        ))}
      </div>
    </Shell>
  );
}

export function ProfileSkeleton() {
  return (
    <Shell label="Loading profile">
      <Panel className="overflow-hidden">
        <Skeleton className="h-32 w-full rounded-none opacity-45 sm:h-44" />
        <div className="p-4 sm:p-5">
          <Skeleton className="-mt-12 size-20 rounded-full border-4 border-[#0a0a0a] sm:-mt-14 sm:size-24" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3 w-28 opacity-60" />
            <Skeleton className="h-3 w-full max-w-md opacity-50" />
          </div>
          <div className="mt-4 flex gap-5">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-20 opacity-60" />
            ))}
          </div>
        </div>
      </Panel>
      <div className="flex gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-24 rounded-xl opacity-70" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Panel key={index} className="p-4">
            <div className="flex gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-40 opacity-60" />
                <Skeleton className="h-3 w-full opacity-50" />
                <Skeleton className="h-3 w-3/4 opacity-40" />
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </Shell>
  );
}

export function SettingsSkeleton() {
  return (
    <Shell label="Loading settings">
      <Header action={false} />
      {Array.from({ length: 3 }, (_, section) => (
        <Panel key={section} className="p-4 sm:p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-56 opacity-55" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }, (_, row) => (
              <div key={row} className="space-y-2">
                <Skeleton className="h-3 w-24 opacity-60" />
                <Skeleton className="h-10 w-full rounded-xl opacity-45" />
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </Shell>
  );
}

export function PricingSkeleton() {
  return (
    <Shell label="Loading plans">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-6 w-56" />
        <Skeleton className="mx-auto h-3 w-72 opacity-55" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Panel key={index} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-9 w-32" />
            <Skeleton className="mt-2 h-3 w-28 opacity-55" />
            <Skeleton className="mt-5 h-10 w-full rounded-xl opacity-60" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }, (_, row) => (
                <Skeleton key={row} className="h-3 w-full opacity-45" />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </Shell>
  );
}

export function TableSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <Shell label={label}>
      <Header />
      <Panel className="overflow-hidden">
        <div className="border-b border-white/8 p-3">
          <Skeleton className="h-3 w-32 opacity-60" />
        </div>
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-white/[.045] p-3 last:border-b-0"
          >
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-3 flex-1 opacity-55" />
            <Skeleton className="hidden h-3 w-24 opacity-45 sm:block" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </Panel>
    </Shell>
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
