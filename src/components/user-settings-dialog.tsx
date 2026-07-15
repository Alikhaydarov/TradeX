"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CreditCard,
  ExternalLink,
  Link2,
  LoaderCircle,
  PaintbrushVertical,
  PencilLine,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useLanguage, type Locale } from "@/lib/i18n";
import { validateUsername } from "@/lib/username";
import { usePremiumStatus } from "./use-premium-status";
import { useWorkspacePreferences } from "./workspace-preferences-context";
import { useAuth } from "./auth-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { TraderAvatar } from "./trader-avatar";

type SettingsSection = "basic" | "security" | "billing" | "affiliate" | "customization" | "symbols";

type ProfileResponse = {
  profile: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    bio?: string | null;
    trading_style?: string | null;
    location?: string | null;
  };
};

const SECTIONS: Array<{ id: SettingsSection; label: string; icon: typeof UserRound }> = [
  { id: "basic", label: "Basic Info", icon: UserRound },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Subscription & Billing", icon: CreditCard },
  { id: "affiliate", label: "Affiliate Program", icon: Link2 },
  { id: "customization", label: "Customization", icon: PaintbrushVertical },
  { id: "symbols", label: "Symbols", icon: Sparkles },
];

async function startCheckout(plan: "standard" | "pro") {
  const response = await apiRequest<{ url?: string; error?: string }>("/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
  if (response.url) window.location.assign(response.url);
}

async function openBillingPortal() {
  const response = await apiRequest<{ url?: string; error?: string }>("/api/stripe/portal", {
    method: "POST",
  });
  if (response.url) window.location.assign(response.url);
}

export function UserSettingsDialog() {
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
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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

  const referralLink = useMemo(
    () => {
      const origin = typeof window === "undefined" ? "" : window.location.origin;
      return username ? `${origin}/pricing?ref=${username}` : `${origin}/pricing?ref=tradeway`;
    },
    [username],
  );

  const saveProfile = async () => {
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.valid) {
      setMessage(usernameCheck.error);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await apiRequest<ProfileResponse>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: fullName.trim() || username.trim(),
          username: username.trim(),
          avatarUrl,
        }),
      });
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    if (!newPassword || !confirmPassword) {
      setMessage("Fill in the new password fields first.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("New password and confirmation do not match.");
      return;
    }
    setMessage("Password reset flow is not wired in-app yet. Hook Supabase password update here next.");
  };

  const languageItems: Array<{ value: Locale; label: string }> = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" as never },
  ];

  return (
    <>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[92vh] overflow-hidden border-white/10 bg-[#050505] p-0 sm:max-w-[1040px]">
          <DialogHeader className="border-b border-white/8 px-6 py-5">
            <DialogTitle className="text-xl font-black text-white">Settings</DialogTitle>
            <p className="text-sm text-zinc-500">Manage your profile info, preferences, customization and billing.</p>
          </DialogHeader>

          <div className="grid max-h-[calc(92vh-88px)] min-h-[640px] grid-cols-1 overflow-hidden md:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="border-b border-white/8 bg-black md:border-b-0 md:border-r">
              <div className="p-4">
                {SECTIONS.map((item) => {
                  const selected = item.id === section;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        selected ? "bg-white/[.08] text-white" : "text-zinc-400 hover:bg-white/[.04] hover:text-white"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="font-semibold">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="overflow-y-auto p-6">
              {loading ? (
                <div className="grid min-h-[420px] place-items-center text-zinc-500">
                  <div className="flex items-center gap-3">
                    <LoaderCircle className="animate-spin" size={18} />
                    Loading settings
                  </div>
                </div>
              ) : null}

              {!loading && section === "basic" ? (
                <div className="space-y-6">
                  <Panel title="Profile" description="Update username and keep your public identity clean.">
                    <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#090909] p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <TraderAvatar name={fullName || username || "Trader"} value={avatarUrl} className="size-16 text-lg" />
                        <div>
                          <p className="text-lg font-black text-white">{username || "username"}</p>
                          <p className="text-sm text-zinc-500">{email || "email@example.com"}</p>
                        </div>
                      </div>
                      <Button type="button" variant="outline" className="border-white/10 bg-black text-white hover:bg-[#111111]" onClick={saveProfile}>
                        <PencilLine size={15} />
                        Edit Profile
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Username">
                        <Input value={username} onChange={(event) => setUsername(event.target.value)} aria-invalid={!validateUsername(username).valid} />
                        <p className={`mt-1 text-xs ${validateUsername(username).valid ? "text-zinc-500" : "text-rose-300"}`}>{validateUsername(username).valid ? "3-24 lowercase letters, numbers, or underscores." : validateUsername(username).error}</p>
                      </Field>
                      <Field label="Email">
                        <Input value={email} readOnly className="text-zinc-500" />
                      </Field>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button type="button" className="bg-white text-black hover:bg-zinc-200" disabled={saving || !validateUsername(username).valid} onClick={saveProfile}>
                        {saving ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />}
                        Save
                      </Button>
                      {message ? <p className="text-sm text-zinc-500">{message}</p> : null}
                    </div>
                  </Panel>

                  <Panel title="Delete Account" description="This action should require confirmation every single time.">
                    <Field label="Password">
                      <Input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} placeholder="Enter your password" />
                    </Field>
                    <Button type="button" className="bg-rose-600 text-white hover:bg-rose-500" onClick={() => setDeleteConfirmOpen(true)}>
                      <Trash2 size={15} />
                      Delete Account
                    </Button>
                  </Panel>
                </div>
              ) : null}

              {!loading && section === "security" ? (
                <Panel title="Security" description="Validate password confirmation before anything else.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Old Password">
                      <Input type="password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} />
                    </Field>
                    <Field label="New Password">
                      <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                    </Field>
                    <Field label="Confirm Password">
                      <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                    </Field>
                  </div>
                  <button type="button" className="text-sm font-semibold text-zinc-400 underline underline-offset-4">
                    Reset Password
                  </button>
                  <div className="flex items-center gap-3">
                    <Button type="button" className="bg-white text-black hover:bg-zinc-200" onClick={saveSecurity}>
                      Save
                    </Button>
                    {message ? <p className="text-sm text-zinc-500">{message}</p> : null}
                  </div>
                </Panel>
              ) : null}

              {!loading && section === "billing" ? (
                <div className="space-y-6">
                  <Panel title="Subscription & Billing" description="Choose the workspace level that matches your trading routine.">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#090909] p-1">
                      <button type="button" className="flex-1 rounded-xl bg-white text-sm font-black text-black px-4 py-2">Monthly</button>
                      <button type="button" className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400">Yearly</button>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <PlanCard title="Free" price="$0/mo" description="Profile, feed, manual journal and one account." buttonLabel={premium.plan === "free" ? "Current plan" : "Free plan"} disabled={premium.plan === "free"} />
                      <PlanCard title="Standard" price="$15/mo" description="Verified badge, AI trade analysis and MT5 Auto Sync." buttonLabel={premium.plan === "standard" ? "Current plan" : "Upgrade Standard"} disabled={premium.plan === "standard"} onClick={() => void startCheckout("standard")} />
                      <PlanCard title="Pro" price="$25/mo" description="Everything in Standard plus priority sync and advanced coaching." buttonLabel={premium.plan === "pro" ? "Current plan" : "Upgrade Pro"} disabled={premium.plan === "pro"} onClick={() => void startCheckout("pro")} />
                    </div>
                    <RowAction label="Payment Method" description="Manage your saved card and billing details." action="Manage" onClick={() => void openBillingPortal()} />
                    <RowAction label="Billing History" description="Open Stripe billing portal for invoices and receipts." action="Manage" onClick={() => void openBillingPortal()} />
                    <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 underline underline-offset-4">
                      See full comparison
                      <ExternalLink size={14} />
                    </button>
                  </Panel>
                </div>
              ) : null}

              {!loading && section === "affiliate" ? (
                <Panel title="Affiliate Program" description="Share your link and earn 30% of every sale.">
                  <div className="rounded-2xl border border-white/8 bg-[#090909] p-4">
                    <p className="text-sm text-zinc-300">Unique referral link</p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <Input value={referralLink} readOnly />
                      <Button type="button" variant="outline" className="border-white/10 bg-black text-white hover:bg-[#111111]">
                        Copy
                      </Button>
                    </div>
                  </div>
                  <ol className="space-y-2 text-sm text-zinc-400">
                    <li>1. Join the program.</li>
                    <li>2. Share your unique link.</li>
                    <li>3. Earn 30% recurring commission on successful premium sales.</li>
                  </ol>
                  <Button type="button" variant="outline" className="border-white/10 bg-black text-white hover:bg-[#111111]" disabled>
                    Join the program
                  </Button>
                  <Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 underline underline-offset-4">
                    Terms of Service
                    <ExternalLink size={14} />
                  </Link>
                </Panel>
              ) : null}

              {!loading && section === "customization" ? (
                <Panel title="Customization" description="Keep the workspace clean for streams, screenshots and focus.">
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#090909] p-4">
                    <div>
                      <p className="font-semibold text-white">Hide Personal Info</p>
                      <p className="text-sm text-zinc-500">Mask username and email inside the sidebar.</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={hidePersonalInfo}
                      onClick={() => setHidePersonalInfo(!hidePersonalInfo)}
                      className={`relative h-7 w-12 rounded-full transition ${hidePersonalInfo ? "bg-white" : "bg-zinc-800"}`}
                    >
                      <span className={`absolute top-1 size-5 rounded-full bg-black transition ${hidePersonalInfo ? "left-6" : "left-1"}`} />
                    </button>
                  </div>

                  <Field label="Language">
                    <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languageItems.map((item) => (
                          <SelectItem key={item.label} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Font">
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Geist">Geist</SelectItem>
                        <SelectItem value="System UI">System UI</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </Panel>
              ) : null}

              {!loading && section === "symbols" ? (
                <Panel title="Custom Symbols" description="Create instruments that appear in your manual trade form.">
                  {!customSymbols.filter((item) => !["NAS100", "XAUUSD", "EURUSD", "GBPUSD", "US30", "GER30", "BTCUSD"].includes(item)).length ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#090909] px-4 py-8 text-center text-sm text-zinc-500">
                      No custom symbols added yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customSymbols
                        .filter((item) => !["NAS100", "XAUUSD", "EURUSD", "GBPUSD", "US30", "GER30", "BTCUSD"].includes(item))
                        .map((item) => (
                          <div key={item} className="flex items-center justify-between rounded-2xl border border-white/8 bg-[#090909] px-4 py-3">
                            <span className="font-semibold text-white">{item}</span>
                            <Button type="button" variant="outline" className="border-white/10 bg-black text-white hover:bg-[#111111]" onClick={() => removeCustomSymbol(item)}>
                              Remove
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                  <Button type="button" className="bg-white text-black hover:bg-zinc-200" onClick={() => setSymbolModalOpen(true)}>
                    <Plus size={15} />
                    Add Custom Symbol
                  </Button>
                </Panel>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={symbolModalOpen} onOpenChange={setSymbolModalOpen}>
        <DialogContent className="border-white/10 bg-[#050505] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add Custom Symbol</DialogTitle>
          </DialogHeader>
          <Field label="Symbol name">
            <Input value={symbolDraft} onChange={(event) => setSymbolDraft(event.target.value.toUpperCase())} placeholder="Example: MNQ" />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" className="border-white/10 bg-black text-white hover:bg-[#111111]" onClick={() => setSymbolModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-white text-black hover:bg-zinc-200"
              onClick={() => {
                addCustomSymbol(symbolDraft);
                setSymbolDraft("");
                setSymbolModalOpen(false);
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="border-white/10 bg-[#050505]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle size={18} className="text-rose-400" />
              Confirm account deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500">
              In-app delete is not wired yet. We kept the confirmation so this cannot happen accidentally.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-black text-white hover:bg-[#111111]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-500"
              onClick={() => setMessage("Delete Account is blocked until the backend deletion flow is implemented safely.")}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-white/8 bg-[#070707] p-5">
      <div>
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      </div>
      <Separator className="bg-white/8" />
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-zinc-300">{label}</span>
      {children}
    </label>
  );
}

function PlanCard({
  title,
  price,
  description,
  buttonLabel,
  onClick,
  disabled = false,
}: {
  title: string;
  price: string;
  description: string;
  buttonLabel: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-[#090909] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-3 text-3xl font-black text-white">{price}</p>
      <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">{description}</p>
      <Button
        type="button"
        className={disabled ? "bg-white/6 text-zinc-500 hover:bg-white/6" : "bg-white text-black hover:bg-zinc-200"}
        disabled={disabled}
        onClick={onClick}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}

function RowAction({
  label,
  description,
  action,
  onClick,
}: {
  label: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-[#090909] px-4 py-3 text-left">
      <div>
        <p className="font-semibold text-white">{label}</p>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      <span className="text-sm font-semibold text-zinc-300">{action}</span>
    </button>
  );
}
