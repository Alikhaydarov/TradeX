import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export const designTokens = {
  colors: { background: "#080D17", secondary: "#101827", card: "#141E2E", elevated: "#1B293B", border: "#27364A", primary: "#35D6AD", accent: "#6875F5", text: "#F5F7FB", muted: "#91A0B5" },
  radius: { control: 6, card: 8, dialog: 12 }
} as const;

