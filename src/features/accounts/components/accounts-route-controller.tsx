"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useActiveAccountStore } from "@/components/active-account-context";
import {
  accountFromRow,
  type AccountRow,
} from "@/components/accounts/account-data";
import { useAuth } from "@/components/auth-context";
import {
  JournalAccountList,
  type JournalAccountSummary,
} from "@/components/journal/journal-account-list";
import { invalidateJournalUser } from "@/components/journal/journal-data-store";
import { useJournalData } from "@/components/journal/use-journal-data";
import { Skeleton } from "@/components/ui/skeleton";
import type { PropAccount } from "@/components/types";
import { apiRequest } from "@/lib/api-client";

const PropAccountDialog = dynamic(
  () =>
    import("@/components/prop-account-dialog").then(
      (module) => module.PropAccountDialog,
    ),
  { ssr: false },
);

function AccountsSkeleton() {
  return (
    <div className="mx-auto max-w-[1320px] space-y-3 p-3 sm:p-4 lg:p-6" role="status" aria-label="Loading accounts">
      <Skeleton className="h-12 w-64 rounded-xl bg-white/[.05]" />
      <Skeleton className="h-36 rounded-2xl bg-white/[.045]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-48 rounded-2xl bg-white/[.04]" />
        ))}
      </div>
    </div>
  );
}

export function AccountsRouteController() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    accounts,
    activeAccountId,
    loading: accountsLoading,
    setActiveAccount,
    addAccount,
    refreshAccounts,
  } = useActiveAccountStore();
  const { entries, loading: journalLoading, error: journalError } = useJournalData({
    userId: user?.id ?? null,
    mode: "accounts",
    accountId: null,
    accountsLoading,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;
    setDialogOpen(true);
    router.replace("/accounts");
  }, [router]);

  const summaries = useMemo<JournalAccountSummary[]>(
    () =>
      accounts.map((account) => {
        let pnl = 0;
        let wins = 0;
        let trades = 0;
        for (const entry of entries) {
          if (entry.propAccountId !== account.id) continue;
          trades += 1;
          pnl += entry.pnl;
          if (entry.pnl > 0) wins += 1;
        }
        return {
          account,
          trades,
          pnl,
          winRate: trades ? Math.round((wins / trades) * 100) : 0,
          target: account.profitTarget
            ? Math.min(100, Math.max(0, (pnl / account.profitTarget) * 100))
            : 0,
          dd:
            account.maxDrawdown && pnl < 0
              ? Math.min(100, (Math.abs(pnl) / account.maxDrawdown) * 100)
              : 0,
        };
      }),
    [accounts, entries],
  );

  async function createAccount(form: FormData) {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, string> = Object.fromEntries(
        [...form.entries()].map(([key, value]) => [key, String(value)]),
      );
      const mt5Login = (body.mt5Login ?? "").trim();
      const mt5Password = (body.mt5Password ?? "").trim();
      const mt5Server = (body.mt5Server ?? "").trim();
      delete body.mt5Login;
      delete body.mt5Password;
      delete body.mt5Server;

      const response = await apiRequest<{ account: AccountRow }>(
        "/api/prop-accounts",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
      const account = accountFromRow(response.account);
      addAccount(account);
      setDialogOpen(false);

      if (mt5Login && mt5Password && mt5Server) {
        await apiRequest(`/api/prop-accounts/${account.id}/mt5`, {
          method: "PUT",
          body: JSON.stringify({
            login: mt5Login,
            password: mt5Password,
            server: mt5Server,
          }),
        });
      }
      return account;
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Account was not saved.",
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function removeAccount(account: PropAccount) {
    if (!window.confirm(`Delete ${account.name}?`)) return;
    setDeleting(account.id);
    setError(null);
    try {
      await apiRequest(`/api/prop-accounts/${account.id}`, { method: "DELETE" });
      if (user) invalidateJournalUser(user.id);
      await refreshAccounts();
      if (activeAccountId === account.id) setActiveAccount(null);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Account was not deleted.",
      );
    } finally {
      setDeleting(null);
    }
  }

  if (accountsLoading || (journalLoading && !entries.length && accounts.length > 0)) {
    return <AccountsSkeleton />;
  }

  return (
    <>
      <div className="mx-auto max-w-[1320px]">
        {error || journalError ? (
          <div className="mx-3 mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-3 py-2 text-xs text-rose-300 sm:mx-4 lg:mx-6">
            {error || journalError}
          </div>
        ) : null}
        <JournalAccountList
          activeAccountId={activeAccountId}
          summaries={summaries}
          deleting={deleting}
          onAdd={() => setDialogOpen(true)}
          onOpen={(id) => {
            setActiveAccount(id);
            router.push("/dashboard");
          }}
          onDelete={removeAccount}
        />
      </div>
      {dialogOpen ? (
        <PropAccountDialog
          open={dialogOpen}
          saving={saving}
          onOpenChange={setDialogOpen}
          onSave={createAccount}
        />
      ) : null}
    </>
  );
}
