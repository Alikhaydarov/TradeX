"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import type { PropAccount } from "@/components/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function JournalFilters({
  accounts,
  activeAccountId,
  query,
  onAccountChange,
  onQueryChange,
}: {
  accounts: PropAccount[];
  activeAccountId: string | null;
  query: string;
  onAccountChange: (accountId: string) => void;
  onQueryChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-white/8 bg-[#080808] p-2 sm:grid-cols-[minmax(180px,260px)_minmax(220px,1fr)]">
      <Select
        value={activeAccountId || undefined}
        onValueChange={onAccountChange}
      >
        <SelectTrigger className="h-10 w-full border-white/8 bg-[#0d0d0d]">
          <SlidersHorizontal className="size-4 text-zinc-500" />
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
        <Input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search symbol, setup, session or note"
          className="h-10 border-white/8 bg-[#0d0d0d] pl-9"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>
    </div>
  );
}
