"use client";
import { ChevronDown, LoaderCircle, Plus, ShieldCheck, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const FIRMS = [
  { name: "FTMO", mark: "FT", color: "#e9ff2f", text: "#000" },
  { name: "The5ers", mark: "5%", color: "#ff5a36", text: "#fff" },
  { name: "FundedNext", mark: "FN", color: "#7457ff", text: "#fff" },
  { name: "FundingPips", mark: "FP", color: "#12c98d", text: "#06261c" },
  { name: "Alpha Capital", mark: "AC", color: "#2672ff", text: "#fff" },
  { name: "Boshqa", mark: "??", color: "#333333", text: "#f1f1f1" },
];

const PHASES = ["Challenge", "Verification", "Funded", "Evaluation"];
const MARKETS = ["CFD", "Futures", "Crypto", "Forex"];
const SIZES = [5000, 10000, 25000, 50000, 100000, 200000];

export function PropAccountDialog({
  open, saving, onOpenChange, onSave,
}: {
  open: boolean; saving: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (f: FormData) => void | Promise<void>;
}) {
  const [firm, setFirm] = useState("FTMO");
  const [phase, setPhase] = useState("Challenge");
  const [market, setMarket] = useState("CFD");
  const [size, setSize] = useState(100000);
  const [firmOpen, setFirmOpen] = useState(false);
  const selectedFirm = FIRMS.find(f => f.name === firm) || FIRMS[FIRMS.length - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border-[#2a2a2a] bg-[#121212] p-0 sm:max-w-xl">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-[#2a2a2a] px-6 py-5">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-violet-500/5" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
                <ShieldCheck size={20} />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold">Yangi prop account</DialogTitle>
                <p className="text-xs text-[#8a8a8a]">Challenge limitlari va boshlang'ich balansni kiriting</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form action={onSave} className="space-y-5 p-6">
          {/* Firm selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Prop Firma</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFirmOpen(v => !v)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] px-4 py-3 text-left transition hover:border-blue-500/30"
              >
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-xs font-black"
                  style={{ background: selectedFirm.color, color: selectedFirm.text }}
                >
                  {selectedFirm.mark}
                </span>
                <span className="flex-1 font-medium">{firm}</span>
                <ChevronDown size={16} className={`text-[#8a8a8a] transition-transform ${firmOpen ? "rotate-180" : ""}`} />
              </button>
              {firmOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-[#2a2a2a] bg-[#181818] shadow-2xl">
                  {FIRMS.map(f => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => { setFirm(f.name); setFirmOpen(false); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#242424] first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-black"
                        style={{ background: f.color, color: f.text }}
                      >
                        {f.mark}
                      </span>
                      <span className={firm === f.name ? "font-bold text-blue-400" : ""}>{f.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="hidden" name="firm" value={firm} />
          </div>

          {/* Account name */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Account nomi</Label>
            <Input
              name="name"
              placeholder="FTMO 100K #1"
              required
              className="border-[#2a2a2a] bg-[#1b1b1b] focus:border-blue-500/50"
            />
          </div>

          {/* Phase + Market row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Bosqich</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] p-1.5">
                {PHASES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPhase(p)}
                    className={`rounded-lg py-1.5 text-xs font-medium transition ${phase === p ? "bg-blue-500/20 text-blue-300" : "text-[#8a8a8a] hover:text-[#f1f1f1]"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input type="hidden" name="phase" value={phase} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Bozor</Label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] p-1.5">
                {MARKETS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMarket(m)}
                    className={`rounded-lg py-1.5 text-xs font-medium transition ${market === m ? "bg-blue-500/20 text-blue-300" : "text-[#8a8a8a] hover:text-[#f1f1f1]"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input type="hidden" name="marketType" value={market} />
            </div>
          </div>

          {/* Account size quick pick */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Account hajmi</Label>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`rounded-xl border py-2.5 text-sm font-bold transition ${size === s ? "border-blue-500/50 bg-blue-500/10 text-blue-300" : "border-[#2a2a2a] bg-[#1b1b1b] text-[#8a8a8a] hover:border-[#263553] hover:text-[#f1f1f1]"}`}
                >
                  ${(s / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
            <input type="hidden" name="accountSize" value={size} />
            <input type="hidden" name="initialBalance" value={size} />
          </div>

          {/* Limits */}
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1b1b1b] p-4">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">
              <TrendingUp size={13} /> Challenge limitlar
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Profit target", "profitTarget", Math.round(size * 0.08)],
                ["Max drawdown", "maxDrawdown", Math.round(size * 0.10)],
                ["Kunlik limit", "dailyDrawdown", Math.round(size * 0.05)],
              ].map(([label, name, def]) => (
                <div key={String(name)} className="space-y-1.5">
                  <label className="text-[10px] text-[#8a8a8a]">{label}</label>
                  <Input
                    name={String(name)}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    defaultValue={String(def)}
                    onChange={(e) => { e.target.value = e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""); }}
                    required
                    className="h-9 border-[#2a2a2a] bg-[#121212] px-2 font-mono text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a]">Boshlangan sana</Label>
            <Input
              name="startDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
              className="border-[#2a2a2a] bg-[#1b1b1b]"
            />
          </div>
          <input type="hidden" name="status" value="Active" />

          <Button
            disabled={saving}
            className="h-11 w-full bg-blue-600 font-semibold hover:bg-blue-500"
          >
            {saving ? <LoaderCircle className="animate-spin" /> : <Plus size={18} />}
            Account yaratish
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
