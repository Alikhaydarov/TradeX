"use client";

import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  Database,
  ExternalLink,
  LockKeyhole,
  PaintbrushVertical,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api-client";
import { useLanguage, type Locale } from "@/lib/i18n";
import { USERNAME_MAX_LENGTH, validateUsername } from "@/lib/username";
import { useAuth } from "./auth-context";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Spinner } from "./ui/spinner";
import { Switch } from "./ui/switch";
import { TraderAvatar } from "./trader-avatar";
import { usePremiumStatus } from "./use-premium-status";
import { useWorkspacePreferences } from "./workspace-preferences-context";

type SettingsSection =
  | "basic"
  | "security"
  | "billing"
  | "customization"
  | "symbols";
type SettingsDestination = SettingsSection | "account-sync";

type ProfileResponse = {
  profile: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
};

type SettingsItem = {
  id: SettingsDestination;
  title: string;
  description: string;
  icon: typeof UserRound;
  keywords: string;
};

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    id: "basic",
    title: "Your account",
    description: "Manage your public identity, username and email.",
    icon: UserRound,
    keywords: "profile username email identity account",
  },
  {
    id: "security",
    title: "Security and account access",
    description: "Review sign-in identity and protect sensitive workspace data.",
    icon: ShieldCheck,
    keywords: "security privacy login access personal information",
  },
  {
    id: "billing",
    title: "Subscription and billing",
    description: "Manage your plan, payment method, invoices and receipts.",
    icon: CreditCard,
    keywords: "billing subscription plan stripe payment invoice pro standard",
  },
  {
    id: "customization",
    title: "Privacy, display and languages",
    description: "Control data visibility, language and workspace appearance.",
    icon: PaintbrushVertical,
    keywords: "privacy display appearance language accessibility hide personal",
  },
  {
    id: "symbols",
    title: "Trading symbols",
    description: "Add or remove instruments used in manual trade entries.",
    icon: Sparkles,
    keywords: "symbols instruments pairs markets custom manual",
  },
  {
    id: "account-sync",
    title: "Trading accounts and sync",
    description: "Manage account profiles, brokers and trade import connections.",
    icon: Database,
    keywords: "accounts sync mt5 ctrader tradovate csv broker import",
  },
];

async function startCheckout(plan: "standard" | "pro") {
  const response = await apiRequest<{ url?: string }>("/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
  if (response.url) window.location.assign(response.url);
}

async function openBillingPortal() {
  const response = await apiRequest<{ url?: string }>("/api/stripe/portal", {
    method: "POST",
  });
  if (response.url) window.location.assign(response.url);
}

export function UserSettingsDialog() {
  return <SettingsContent />;
}

function SettingsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { locale, locales, labels, setLocale } = useLanguage();
  const settingsText = useTranslations("settings");
  const { status: premium } = usePremiumStatus(Boolean(user));
  const {
    settingsOpen,
    setSettingsOpen,
    hidePersonalInfo,
    setHidePersonalInfo,
    customSymbols,
    addCustomSymbol,
    removeCustomSymbol,
  } = useWorkspacePreferences();
  const [section, setSection] = useState<SettingsSection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
    if (!settingsOpen) return;
    setSection(null);
    setSearchQuery("");
    setMessage("");
  }, [settingsOpen]);

  useEffect(() => {
    if (!settingsOpen || !user) return;
    setLoading(true);
    setMessage("");
    void apiRequest<ProfileResponse>("/api/profile", { cacheMs: 30_000 })
      .then(({ profile }) => {
        setFullName(profile.full_name || "");
        setUsername(profile.username || "");
        setEmail(user.email || "");
        setAvatarUrl(profile.avatar_url || null);
      })
      .catch((error) =>
        setMessage(
          error instanceof Error ? error.message : "Profile could not load.",
        ),
      )
      .finally(() => setLoading(false));
  }, [settingsOpen, user]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return SETTINGS_ITEMS;
    return SETTINGS_ITEMS.filter((item) =>
      `${item.title} ${item.description} ${item.keywords}`
        .toLowerCase()
        .includes(query),
    );
  }, [searchQuery]);

  const displayHandle =
    username ||
    String(
      user?.user_metadata.user_name ??
        user?.user_metadata.preferred_username ??
        user?.email?.split("@")[0] ??
        "trader",
    );

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
        body: JSON.stringify({
          fullName: fullName.trim() || cleanUsername,
          username: cleanUsername,
          avatarUrl,
        }),
      });
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Profile could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  };

  const provider = String(user?.app_metadata?.provider || "email");
  const customOnly = customSymbols.filter(
    (item) =>
      ![
        "NAS100",
        "XAUUSD",
        "EURUSD",
        "GBPUSD",
        "US30",
        "GER30",
        "BTCUSD",
      ].includes(item),
  );

  const closeOrGoBack = () => {
    if (section) {
      setSection(null);
      setMessage("");
      return;
    }
    setSettingsOpen(false);
  };

  const openDestination = (destination: SettingsDestination) => {
    setMessage("");
    if (destination === "account-sync") {
      setSettingsOpen(false);
      router.push("/settings");
      return;
    }
    setSection(destination);
  };

  return (
    <>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          showCloseButton={false}
          className="inset-0 z-[2147483000] flex h-dvh max-h-dvh w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-white/10 bg-black p-0 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:h-[min(820px,92dvh)] sm:max-h-[92dvh] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[24px]"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-white/8 px-3 py-3 sm:px-5 sm:py-4">
            <button
              type="button"
              onClick={closeOrGoBack}
              className="grid size-11 shrink-0 place-items-center rounded-full text-ink-strong transition hover:bg-white/[.06] hover:text-white active:scale-95"
              aria-label={section ? settingsText("back") : settingsText("close")}
            >
              <ArrowLeft size={24} strokeWidth={2} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-black tracking-[-0.025em] text-white sm:text-2xl">
                {settingsText("title")}
              </h2>
              <p className="mt-0.5 truncate text-sm text-ink-mute">
                @{displayHandle.replace(/^@/, "")}
              </p>
            </div>
            <button
              type="button"
              aria-label={settingsText("close")}
              onClick={() => setSettingsOpen(false)}
              className="hidden size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-ink-soft transition hover:bg-white/5 hover:text-white sm:grid"
            >
              <X size={18} />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
            {!section ? (
              <SettingsOverview
                query={searchQuery}
                onQueryChange={setSearchQuery}
                items={filteredItems}
                onOpen={openDestination}
                localeLabel={labels[locale]}
              />
            ) : (
              <main className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-6">
                {loading ? (
                  <div className="grid min-h-[50dvh] place-items-center text-sm text-ink-mute">
                    <span className="flex items-center gap-2">
                      <Spinner className="size-4" /> Loading settings
                    </span>
                  </div>
                ) : null}

                {!loading && section === "basic" ? (
                  <Panel
                    title="Your account"
                    description="Public identity shown across Tradoxy."
                  >
                    <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-surface p-4 sm:flex-row sm:items-center">
                      <TraderAvatar
                        name={fullName || username || "Trader"}
                        value={avatarUrl}
                        className="size-14 text-lg"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">
                          {username || "username"}
                        </p>
                        <p className="truncate text-sm text-ink-mute">
                          {email}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Display name">
                        <Input
                          value={fullName}
                          maxLength={60}
                          onChange={(event) => setFullName(event.target.value)}
                        />
                      </Field>
                      <Field label="Username">
                        <Input
                          value={username}
                          maxLength={USERNAME_MAX_LENGTH}
                          autoCapitalize="none"
                          spellCheck={false}
                          aria-invalid={!validateUsername(username).valid}
                          onChange={(event) =>
                            setUsername(
                              event.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_]/g, ""),
                            )
                          }
                        />
                        <p
                          className={`text-xs ${
                            validateUsername(username).valid
                              ? "text-ink-mute"
                              : "text-rose-300"
                          }`}
                        >
                          {validateUsername(username).valid
                            ? "Lowercase letters, numbers and underscores."
                            : validateUsername(username).error}
                        </p>
                      </Field>
                      <Field label="Email">
                        <Input
                          value={email}
                          readOnly
                          className="text-ink-mute"
                        />
                      </Field>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Button
                        type="button"
                        className="bg-white text-black hover:bg-zinc-200"
                        disabled={saving || !validateUsername(username).valid}
                        onClick={() => void saveProfile()}
                      >
                        {saving ? (
                          <Spinner className="size-4" />
                        ) : (
                          <Check size={15} />
                        )}
                        Save changes
                      </Button>
                      {message ? <StatusMessage>{message}</StatusMessage> : null}
                    </div>
                  </Panel>
                ) : null}

                {!loading && section === "security" ? (
                  <Panel
                    title="Security and account access"
                    description="Review sign-in identity and hide sensitive workspace data."
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoCard
                        icon={LockKeyhole}
                        label="Sign-in method"
                        value={provider === "google" ? "Google" : provider}
                      />
                      <InfoCard
                        icon={ShieldCheck}
                        label="Account email"
                        value={email || "Not available"}
                      />
                    </div>
                    <SettingRow
                      title="Hide personal info"
                      description="Masks your username, email and account identifiers during streams or screenshots."
                    >
                      <Switch
                        checked={hidePersonalInfo}
                        onCheckedChange={setHidePersonalInfo}
                        aria-label="Hide personal information"
                      />
                    </SettingRow>
                    <p className="rounded-2xl border border-sky-500/15 bg-sky-500/5 px-4 py-3 text-xs leading-5 text-sky-200/70">
                      Password and provider security are managed by your verified
                      sign-in provider.
                    </p>
                  </Panel>
                ) : null}

                {!loading && section === "billing" ? (
                  <Panel
                    title="Subscription and billing"
                    description="Choose a plan or manage invoices through Stripe."
                  >
                    <div className="grid gap-3 lg:grid-cols-3">
                      <PlanCard
                        title="Free"
                        price="$0/mo"
                        description="Profile, feed, manual journal and one account."
                        buttonLabel={
                          premium.plan === "free" ? "Current plan" : "Free plan"
                        }
                        disabled
                      />
                      <PlanCard
                        title="Standard"
                        price="$15/mo"
                        description="Verified badge, AI analysis and MT5 Auto Sync."
                        buttonLabel={
                          premium.plan === "standard"
                            ? "Current plan"
                            : "Upgrade"
                        }
                        disabled={premium.plan === "standard"}
                        onClick={() => void startCheckout("standard")}
                      />
                      <PlanCard
                        title="Pro"
                        price="$25/mo"
                        description="Advanced coaching, priority sync and complete analytics."
                        buttonLabel={
                          premium.plan === "pro" ? "Current plan" : "Upgrade"
                        }
                        disabled={premium.plan === "pro"}
                        onClick={() => void startCheckout("pro")}
                      />
                    </div>
                    <RowAction
                      label="Billing portal"
                      description="Manage payment method, invoices and receipts."
                      onClick={() => void openBillingPortal()}
                    />
                  </Panel>
                ) : null}

                {!loading && section === "customization" ? (
                  <Panel
                    title={settingsText("customizationTitle")}
                    description={settingsText("customizationDescription")}
                  >
                    <SettingRow
                      title={settingsText("hidePersonalInfo")}
                      description={settingsText("hidePersonalInfoDescription")}
                    >
                      <Switch
                        checked={hidePersonalInfo}
                        onCheckedChange={setHidePersonalInfo}
                        aria-label="Hide personal information"
                      />
                    </SettingRow>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={settingsText("language")}>
                        <Select
                          value={locale}
                          onValueChange={(value) => setLocale(value as Locale)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {locales.map((value) => (
                              <SelectItem key={value} value={value}>
                                {labels[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label={settingsText("typography")}>
                        <div className="flex h-10 items-center rounded-xl border border-white/8 bg-surface px-3 text-sm font-medium text-ink-strong">
                          DM Sans
                          <span className="ml-auto text-[10px] text-ink-subtle">
                            {settingsText("defaultFont")}
                          </span>
                        </div>
                      </Field>
                    </div>
                  </Panel>
                ) : null}

                {!loading && section === "symbols" ? (
                  <Panel
                    title="Trading symbols"
                    description="Add instruments used in manual trade entry."
                  >
                    {customOnly.length ? (
                      <div className="space-y-2">
                        {customOnly.map((item) => (
                          <div
                            key={item}
                            className="flex items-center justify-between rounded-2xl border border-white/8 bg-surface px-4 py-3"
                          >
                            <span className="font-semibold text-white">
                              {item}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeCustomSymbol(item)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-surface px-4 py-8 text-center text-sm text-ink-mute">
                        No custom symbols yet.
                      </div>
                    )}
                    <Button
                      type="button"
                      className="bg-white text-black hover:bg-zinc-200"
                      onClick={() => setSymbolModalOpen(true)}
                    >
                      <Plus size={15} /> Add symbol
                    </Button>
                  </Panel>
                ) : null}
              </main>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={symbolModalOpen} onOpenChange={setSymbolModalOpen}>
        <DialogContent className="border-white/10 bg-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Add custom symbol</DialogTitle>
          </DialogHeader>
          <Field label="Symbol name">
            <Input
              value={symbolDraft}
              maxLength={16}
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(event) =>
                setSymbolDraft(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9._-]/g, ""),
                )
              }
              placeholder="Example: MNQ"
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSymbolModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!symbolDraft.trim()}
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
    </>
  );
}

function SettingsOverview({
  query,
  onQueryChange,
  items,
  onOpen,
  localeLabel,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  items: SettingsItem[];
  onOpen: (destination: SettingsDestination) => void;
  localeLabel: string;
}) {
  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-3 sm:px-6 sm:py-6">
      <label className="flex h-12 items-center gap-3 rounded-xl border border-white/8 bg-surface px-4 text-ink-mute transition focus-within:border-white/15 focus-within:bg-surface-raised sm:max-w-md">
        <Search size={18} strokeWidth={1.8} className="shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search settings"
          className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-ink-mute"
        />
      </label>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 sm:gap-3">
        {items.map(({ id, title, description, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onOpen(id)}
            className="group flex min-h-[82px] w-full items-center gap-3 rounded-2xl border border-white/[.07] bg-surface px-3.5 py-3 text-left transition hover:border-white/15 hover:bg-surface-raised active:scale-[.995] sm:min-h-[96px] sm:items-start sm:p-4"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.045] text-ink-mute transition group-hover:bg-white/[.07] group-hover:text-white sm:size-11">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <strong className="block truncate text-sm font-bold leading-5 text-zinc-100 sm:text-[15px]">
                  {title}
                </strong>
                {id === "customization" ? (
                  <span className="shrink-0 rounded-md bg-white/[.06] px-1.5 py-0.5 text-[9px] font-bold text-ink-soft">
                    {localeLabel}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 line-clamp-2 block text-xs leading-4 text-ink-mute sm:leading-5">
                {description}
              </span>
            </span>
            <ChevronRight
              size={19}
              className="shrink-0 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink-soft sm:mt-2"
            />
          </button>
        ))}
      </div>

      {!items.length ? (
        <div className="grid min-h-52 place-items-center text-center text-sm text-ink-mute">
          No settings match “{query}”.
        </div>
      ) : null}
    </main>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[1.4rem] border border-white/8 bg-surface p-4 sm:p-5">
      <div>
        <h3 className="text-lg font-black text-white">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink-mute">{description}</p>
      </div>
      <Separator className="bg-white/8" />
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-ink-strong">{label}</span>
      {children}
    </label>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-surface p-4">
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-5 text-ink-mute">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LockKeyhole;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/8 bg-surface p-4">
      <Icon size={17} className="text-ink-soft" />
      <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-ink-mute">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold capitalize text-white">
        {value}
      </p>
    </div>
  );
}

function StatusMessage({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" aria-live="polite" className="text-sm text-ink-soft">
      {children}
    </p>
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
    <div className="flex min-h-56 flex-col rounded-[1.25rem] border border-white/8 bg-surface p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-3 text-2xl font-black text-white">{price}</p>
      <p className="mt-2 flex-1 text-sm leading-6 text-ink-mute">
        {description}
      </p>
      <Button
        type="button"
        className={
          disabled
            ? "bg-white/6 text-ink-mute hover:bg-white/6"
            : "bg-white text-black hover:bg-zinc-200"
        }
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
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/8 bg-surface px-4 py-3 text-left transition hover:border-white/15 hover:bg-white/[.04]"
    >
      <div>
        <p className="font-semibold text-white">{label}</p>
        <p className="mt-1 text-sm text-ink-mute">{description}</p>
      </div>
      <ExternalLink size={16} className="shrink-0 text-ink-soft" />
    </button>
  );
}
