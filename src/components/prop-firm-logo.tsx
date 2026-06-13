import { Building2 } from "lucide-react";

const firms: Record<string, { mark: string; label: string; style: string }> = {
  ftmo: { mark: "FT", label: "FTMO", style: "bg-[#e9ff2f] text-black" },
  the5ers: { mark: "5%", label: "The5ers", style: "bg-[#ff5a36] text-white" },
  "the 5ers": { mark: "5%", label: "The5ers", style: "bg-[#ff5a36] text-white" },
  fundednext: { mark: "FN", label: "FundedNext", style: "bg-[#7457ff] text-white" },
  "funded next": { mark: "FN", label: "FundedNext", style: "bg-[#7457ff] text-white" },
  fundingpips: { mark: "FP", label: "FundingPips", style: "bg-[#12c98d] text-[#06261c]" },
  "funding pips": { mark: "FP", label: "FundingPips", style: "bg-[#12c98d] text-[#06261c]" },
  "alpha capital": { mark: "AC", label: "Alpha Capital", style: "bg-[#2672ff] text-white" },
  "alpha capital group": { mark: "AC", label: "Alpha Capital", style: "bg-[#2672ff] text-white" },
};

export function PropFirmLogo({ firm, compact = false }: { firm: string; compact?: boolean }) {
  const key = firm.trim().toLowerCase();
  const known = firms[key];
  const initials = firm.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const mark = known?.mark || initials;
  const label = known?.label || firm || "Independent";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`grid shrink-0 place-items-center rounded-xl font-black tracking-tight ${compact ? "size-9 text-[11px]" : "size-11 text-xs"} ${known?.style || "bg-muted text-foreground"}`}>
        {mark || <Building2 className="size-4" />}
      </span>
      <span className="min-w-0">
        <b className="block truncate text-sm">{label}</b>
        {!compact ? <small className="text-[10px] text-muted-foreground">Prop firm</small> : null}
      </span>
    </div>
  );
}
