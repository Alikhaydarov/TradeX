"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CurvePoint = { month: string; balance: number };

/**
 * The calendar's monthly P&L curve.
 *
 * Split out so recharts loads on demand - it is roughly 0.7MB of the 2.4MB
 * client bundle, and was imported at the top of this route whether or not the
 * curve was on screen.
 *
 * Extracted whole rather than as lazily-wrapped primitives: recharts resolves
 * its children by displayName, so wrapping Area or XAxis in a loader would
 * hide that and break the chart.
 */
export function CalendarCurveChart({
  curve,
  cash,
}: {
  curve: CurvePoint[];
  /** Formatter owned by the caller so the calendar controls its currency. */
  cash: Intl.NumberFormat;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={curve} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="calendarYearCurve" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#71717a" }} />
        <YAxis hide />
        <Tooltip formatter={(value) => cash.format(Number(value))} contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }} />
        <Area type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={2} fill="url(#calendarYearCurve)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
