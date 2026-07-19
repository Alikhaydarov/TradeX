import { Skeleton } from "@/components/ui/skeleton";

export function WorkspaceSectionSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-4 px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6" aria-busy="true" aria-label="Loading workspace">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36 bg-white/[0.08]" />
          <Skeleton className="h-3 w-52 bg-white/[0.045]" />
        </div>
        <Skeleton className="h-9 w-24 bg-white/[0.06]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-white/[0.07] bg-[#090909] p-4">
            <Skeleton className="h-3 w-20 bg-white/[0.05]" />
            <Skeleton className="mt-3 h-7 w-28 bg-white/[0.08]" />
            <Skeleton className="mt-3 h-3 w-16 bg-white/[0.045]" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/[0.07] bg-[#090909] p-4 sm:p-5">
        <Skeleton className="h-4 w-36 bg-white/[0.07]" />
        <Skeleton className="mt-4 h-[260px] w-full bg-white/[0.035] sm:h-[340px]" />
      </div>
    </div>
  );
}
