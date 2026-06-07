import { LoaderCircle } from "lucide-react";

export function AppLoader({ label = "Ma'lumotlar yuklanmoqda" }: { label?: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-[28px] border border-white/8 bg-white/[.035] p-8 text-center shadow-xl shadow-slate-950/10 backdrop-blur-2xl">
      <div>
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[.07] text-cyan-200 shadow-lg shadow-cyan-950/20">
          <LoaderCircle className="animate-spin" size={28} />
        </span>
        <p className="mt-4 text-sm font-bold text-slate-200">{label}</p>
        <p className="mt-1 text-[11px] text-slate-500">Backend javobi kelgandan keyin spinner avtomatik yo&apos;qoladi.</p>
      </div>
    </div>
  );
}
