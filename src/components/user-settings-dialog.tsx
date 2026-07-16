"use client";

import Dialog from "@mui/material/Dialog";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import {
  Check,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  PaintbrushVertical,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useLanguage, type Locale } from "@/lib/i18n";
import { USERNAME_MAX_LENGTH, validateUsername } from "@/lib/username";
import { useAuth } from "./auth-context";
import { Button } from "./ui/button";
import { Dialog as SmallDialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Spinner } from "./ui/spinner";
import { TraderAvatar } from "./trader-avatar";
import { usePremiumStatus } from "./use-premium-status";
import { useWorkspacePreferences } from "./workspace-preferences-context";
import { MaterialProvider } from "./material-provider";

type SettingsSection = "basic" | "security" | "billing" | "customization" | "symbols";

type ProfileResponse = {
  profile: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
};

const SECTIONS: Array<{ id: SettingsSection; label: string; icon: typeof UserRound }> = [
  { id: "basic", label: "Profile", icon: UserRound },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "customization", label: "Appearance", icon: PaintbrushVertical },
  { id: "symbols", label: "Symbols", icon: Sparkles },
];

async function startCheckout(plan: "standard" | "pro") {
  const response = await apiRequest<{ url?: string }>("/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
  if (response.url) window.location.assign(response.url);
}

async function openBillingPortal() {
  const response = await apiRequest<{ url?: string }>("/api/stripe/portal", { method: "POST" });
  if (response.url) window.location.assign(response.url);
}

export function UserSettingsDialog() {
  return <MaterialProvider><SettingsContent /></MaterialProvider>;
}

function SettingsContent() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
  const { user } = useAuth();
  const { locale, setLocale } = useLanguage();
  const { status: premium } = usePremiumStatus(Boolean(user));
  const {
    settingsOpen,
    setSettingsOpen,
    hidePersonalInfo,
    setHidePersonalInfo,
    fontFamily,
    setFontFamily,
    customSymbols,
    addCustomSymbol,
    removeCustomSymbol,
  } = useWorkspacePreferences();
  const [section, setSection] = useState<SettingsSection>("basic");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [symbolModalOpen, setSymbolModalOpen] = useState(false);
  const [symbolDraft, setSymbolDraft] = useState("");

  useEffect(() => {
    if (!settingsOpen || !user) return;
    setLoading(true);
    setMessage("");
    void apiRequest<ProfileResponse>("/api/profile")
      .then(({ profile }) => {
        setFullName(profile.full_name || "");
        setUsername(profile.username || "");
        setEmail(user.email || "");
        setAvatarUrl(profile.avatar_url || null);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Profile could not load."))
      .finally(() => setLoading(false));
  }, [settingsOpen, user]);

  const saveProfile = async () => {
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      setMessage(usernameCheck.error);
      return;
    }
    const cleanUsername = usernameCheck.value;
    setSaving(true);
    setMessage("");
    try {
      await apiRequest<ProfileResponse>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName: fullName.trim() || cleanUsername, username: cleanUsername, avatarUrl }),
      });
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const provider = String(user?.app_metadata?.provider || "email");
  const customOnly = customSymbols.filter((item) => !["NAS100", "XAUUSD", "EURUSD", "GBPUSD", "US30", "GER30", "BTCUSD"].includes(item));

  return (
    <>
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fullScreen={!desktop}
        fullWidth
        maxWidth="lg"
        sx={{ zIndex: 2147483000 }}
        slotProps={{
          paper: {
            sx: {
              height: { xs: "100dvh", md: "min(820px, 92dvh)" },
              maxHeight: { xs: "100dvh", md: "92dvh" },
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: { xs: 0, md: "24px" },
              overflow: "hidden",
              backgroundColor: "#050505",
            },
          },
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/8 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-lg font-black text-white sm:text-xl">Settings</h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">Profile, security and workspace preferences.</p>
          </div>
          <button type="button" aria-label="Close settings" onClick={() => setSettingsOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[230px_minmax(0,1fr)]">
          <nav aria-label="Settings sections" className="shrink-0 border-b border-white/8 bg-black p-2 md:border-b-0 md:border-r md:p-4">
            <Tabs
              value={section}
              onChange={(_, value: SettingsSection) => { setSection(value); setMessage(""); }}
              orientation={desktop ? "vertical" : "horizontal"}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              aria-label="Settings sections"
              sx={{ minHeight: 44, "& .MuiTabs-flexContainer": { gap: { xs: 0.5, md: 0.75 } }, "& .MuiTab-root": { minWidth: { xs: "auto", md: "100%" }, px: { xs: 1.5, md: 2 } } }}
            >
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <Tab key={id} value={id} label={<span className="flex items-center gap-2 whitespace-nowrap"><Icon size={16} />{label}</span>} />
              ))}
            </Tabs>
          </nav>

          <main className="min-h-0 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
            {loading ? (
              <div className="grid min-h-[50dvh] place-items-center text-sm text-zinc-500"><span className="flex items-center gap-2"><Spinner className="size-4" /> Loading settings</span></div>
            ) : null}

            {!loading && section === "basic" ? (
              <Panel title="Profile" description="Public identity shown across TradeWay.">
                <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#090909] p-4 sm:flex-row sm:items-center">
                  <TraderAvatar name={fullName || username || "Trader"} value={avatarUrl} className="size-14 text-lg" />
                  <div className="min-w-0"><p className="truncate font-black text-white">{username || "username"}</p><p className="truncate text-sm text-zinc-500">{email}</p></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Display name"><Input value={fullName} maxLength={60} onChange={(event) => setFullName(event.target.value)} /></Field>
                  <Field label="Username">
                    <Input value={username} maxLength={USERNAME_MAX_LENGTH} autoCapitalize="none" spellCheck={false} aria-invalid={!validateUsername(username).valid} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
                    <p className={`text-xs ${validateUsername(username).valid ? "text-zinc-500" : "text-rose-300"}`}>{validateUsername(username).valid ? "Lowercase letters, numbers and underscores." : validateUsername(username).error}</p>
                  </Field>
                  <Field label="Email"><Input value={email} readOnly className="text-zinc-500" /></Field>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="button" className="bg-white text-black hover:bg-zinc-200" disabled={saving || !validateUsername(username).valid} onClick={() => void saveProfile()}>
                    {saving ? <Spinner className="size-4" /> : <Check size={15} />} Save changes
                  </Button>
                  {message ? <StatusMessage>{message}</StatusMessage> : null}
                </div>
              </Panel>
            ) : null}

            {!loading && section === "security" ? (
              <Panel title="Security & privacy" description="Review sign-in identity and hide sensitive workspace data.">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard icon={LockKeyhole} label="Sign-in method" value={provider === "google" ? "Google" : provider} />
                  <InfoCard icon={ShieldCheck} label="Account email" value={email || "Not available"} />
                </div>
                <SettingRow title="Hide personal info" description="Masks your username, email and account identifiers during streams or screenshots.">
                  <Switch checked={hidePersonalInfo} onChange={(_, checked) => setHidePersonalInfo(checked)} slotProps={{ input: { "aria-label": "Hide personal information" } }} />
                </SettingRow>
                <p className="rounded-2xl border border-sky-500/15 bg-sky-500/5 px-4 py-3 text-xs leading-5 text-sky-200/70">
                  Password and provider security are managed by your verified sign-in provider. Unsupported in-app password and account deletion controls were removed to prevent misleading actions.
                </p>
              </Panel>
            ) : null}

            {!loading && section === "billing" ? (
              <Panel title="Subscription & billing" description="Choose a plan or manage invoices through Stripe.">
                <div className="grid gap-3 lg:grid-cols-3">
                  <PlanCard title="Free" price="$0/mo" description="Profile, feed, manual journal and one account." buttonLabel={premium.plan === "free" ? "Current plan" : "Free plan"} disabled />
                  <PlanCard title="Standard" price="$15/mo" description="Verified badge, AI analysis and MT5 Auto Sync." buttonLabel={premium.plan === "standard" ? "Current plan" : "Upgrade"} disabled={premium.plan === "standard"} onClick={() => void startCheckout("standard")} />
                  <PlanCard title="Pro" price="$25/mo" description="Advanced coaching, priority sync and complete analytics." buttonLabel={premium.plan === "pro" ? "Current plan" : "Upgrade"} disabled={premium.plan === "pro"} onClick={() => void startCheckout("pro")} />
                </div>
                <RowAction label="Billing portal" description="Manage payment method, invoices and receipts." onClick={() => void openBillingPortal()} />
              </Panel>
            ) : null}

            {!loading && section === "customization" ? (
              <Panel title="Appearance" description="Tune the workspace for focus, screenshots and streaming.">
                <SettingRow title="Hide personal info" description="Mask personal values throughout the workspace.">
                  <Switch checked={hidePersonalInfo} onChange={(_, checked) => setHidePersonalInfo(checked)} slotProps={{ input: { "aria-label": "Hide personal information" } }} />
                </SettingRow>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Language">
                    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="es">Español</SelectItem></SelectContent></Select>
                  </Field>
                  <Field label="Font">
                    <Select value={fontFamily} onValueChange={setFontFamily}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Inter">Inter</SelectItem><SelectItem value="Geist">Geist</SelectItem><SelectItem value="System UI">System UI</SelectItem></SelectContent></Select>
                  </Field>
                </div>
              </Panel>
            ) : null}

            {!loading && section === "symbols" ? (
              <Panel title="Custom symbols" description="Add instruments used in manual trade entry.">
                {customOnly.length ? <div className="space-y-2">{customOnly.map((item) => <div key={item} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#090909] px-4 py-3"><span className="font-semibold text-white">{item}</span><Button type="button" variant="outline" onClick={() => removeCustomSymbol(item)}>Remove</Button></div>)}</div> : <div className="rounded-2xl border border-dashed border-white/10 bg-[#090909] px-4 py-8 text-center text-sm text-zinc-500">No custom symbols yet.</div>}
                <Button type="button" className="bg-white text-black hover:bg-zinc-200" onClick={() => setSymbolModalOpen(true)}><Plus size={15} /> Add symbol</Button>
              </Panel>
            ) : null}
          </main>
        </div>
      </Dialog>

      <SmallDialog open={symbolModalOpen} onOpenChange={setSymbolModalOpen}>
        <DialogContent className="border-white/10 bg-[#050505] sm:max-w-md">
          <DialogHeader><DialogTitle className="text-white">Add custom symbol</DialogTitle></DialogHeader>
          <Field label="Symbol name"><Input value={symbolDraft} maxLength={16} autoCapitalize="characters" spellCheck={false} onChange={(event) => setSymbolDraft(event.target.value.toUpperCase().replace(/[^A-Z0-9._-]/g, ""))} placeholder="Example: MNQ" /></Field>
          <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setSymbolModalOpen(false)}>Cancel</Button><Button type="button" disabled={!symbolDraft.trim()} className="bg-white text-black hover:bg-zinc-200" onClick={() => { addCustomSymbol(symbolDraft); setSymbolDraft(""); setSymbolModalOpen(false); }}>Save</Button></div>
        </DialogContent>
      </SmallDialog>
    </>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="space-y-4 rounded-[1.4rem] border border-white/8 bg-[#070707] p-4 sm:p-5"><div><h3 className="text-lg font-black text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p></div><Separator className="bg-white/8" />{children}</section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-semibold text-zinc-300">{label}</span>{children}</label>;
}

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#090909] p-4"><div><p className="font-semibold text-white">{title}</p><p className="mt-1 text-sm leading-5 text-zinc-500">{description}</p></div><div className="shrink-0">{children}</div></div>;
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof LockKeyhole; label: string; value: string }) {
  return <div className="min-w-0 rounded-2xl border border-white/8 bg-[#090909] p-4"><Icon size={17} className="text-zinc-400" /><p className="mt-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-1 truncate text-sm font-bold capitalize text-white">{value}</p></div>;
}

function StatusMessage({ children }: { children: React.ReactNode }) {
  return <p role="status" aria-live="polite" className="text-sm text-zinc-400">{children}</p>;
}

function PlanCard({ title, price, description, buttonLabel, onClick, disabled = false }: { title: string; price: string; description: string; buttonLabel: string; onClick?: () => void; disabled?: boolean }) {
  return <div className="flex min-h-56 flex-col rounded-[1.25rem] border border-white/8 bg-[#090909] p-4"><p className="text-sm font-black text-white">{title}</p><p className="mt-3 text-2xl font-black text-white">{price}</p><p className="mt-2 flex-1 text-sm leading-6 text-zinc-500">{description}</p><Button type="button" className={disabled ? "bg-white/6 text-zinc-500 hover:bg-white/6" : "bg-white text-black hover:bg-zinc-200"} disabled={disabled} onClick={onClick}>{buttonLabel}</Button></div>;
}

function RowAction({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#090909] px-4 py-3 text-left transition hover:border-white/15 hover:bg-white/[.04]"><div><p className="font-semibold text-white">{label}</p><p className="mt-1 text-sm text-zinc-500">{description}</p></div><ExternalLink size={16} className="shrink-0 text-zinc-400" /></button>;
}
