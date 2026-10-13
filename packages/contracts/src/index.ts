import { z } from "zod";

export const accountTypeSchema = z.enum(["MANUAL", "MT5", "DEMO"]);
export const tradeSideSchema = z.enum(["BUY", "SELL"]);

export const createTradeSchema = z.object({
  accountId: z.string().uuid(),
  symbol: z.string().trim().min(1).max(24).transform((value) => value.toUpperCase()),
  side: tradeSideSchema,
  volume: z.coerce.number().positive(),
  entryPrice: z.coerce.number().positive(),
  exitPrice: z.coerce.number().positive().optional(),
  stopLoss: z.coerce.number().positive().optional(),
  takeProfit: z.coerce.number().positive().optional(),
  openedAt: z.coerce.date(),
  closedAt: z.coerce.date().optional(),
  notes: z.string().trim().max(5000).optional()
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;

export type ApiResult<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: { code: string; message: string }; requestId: string };

