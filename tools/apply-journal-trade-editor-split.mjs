import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

const journalPath = "src/components/journal-v2.tsx";
let source = readFileSync(journalPath, "utf8");
const editorStart = source.indexOf("function TradeEditor(");
const progressStart = source.indexOf("function ProgressBar(");

if (editorStart === -1 || progressStart === -1 || progressStart <= editorStart) {
  throw new Error("Journal trade editor boundaries were not found.");
}

let editor = source.slice(editorStart, progressStart);
editor = editor.replace("function TradeEditor(", "export function JournalTradeEditor(");

const moduleSource = `"use client";

import { ChevronDown, Download, ImageIcon, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import { MediaImage } from "../media-image";
import { TradingViewChart } from "../tradingview-chart";
import type { JournalEntry } from "../types";

const cash = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

${editor}`;

mkdirSync("src/components/journal", { recursive: true });
writeFileSync("src/components/journal/journal-trade-editor.tsx", moduleSource);

if (!source.includes('import { JournalTradeEditor } from "./journal/journal-trade-editor";')) {
  const anchor = 'import { JournalAccountList } from "./journal/journal-account-list";';
  source = source.replace(
    anchor,
    `${anchor}\nimport { JournalTradeEditor } from "./journal/journal-trade-editor";`,
  );
}
source = source.replace(/<TradeEditor\b/g, "<JournalTradeEditor");
source = `${source.slice(0, editorStart)}${source.slice(progressStart)}`;

for (const icon of ["  ChevronDown,\n", "  Download,\n", "  ImageIcon,\n"]) {
  source = source.replace(icon, "");
}
writeFileSync(journalPath, source);

for (const path of [
  "tools/apply-journal-trade-editor-split.mjs",
  ".github/workflows/apply-journal-trade-editor-split.yml",
]) {
  try {
    unlinkSync(path);
  } catch {
    // Ignore missing one-time files on retry.
  }
}
