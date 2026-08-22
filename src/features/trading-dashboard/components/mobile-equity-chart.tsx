"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

/**
 * The mobile dashboard's equity curve.
 *
 * Split out so recharts loads on demand. It is ~0.7MB of the 2.4MB client
 * bundle and was imported at the top of four route components, so it shipped
 * with the first byte of each screen whether or not a chart was on show.
 *
 * It has to be a whole component rather than lazily-wrapped primitives:
 * recharts identifies its children by displayName, and wrapping Area or XAxis
 * in a loader would hide that and break the chart.
 */
export type MobileEquityPoint = { trade: number; equity: number; label: string }

export function MobileEquityChart({
  equity,
  formatBalance,
}: {
  equity: MobileEquityPoint[]
  /** The caller owns formatting, including whether balances are masked. */
  formatBalance: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={equity} margin={{ left: 0, right: 0, top: 16, bottom: 8 }}>
        <defs>
          <linearGradient id="tradoxMobileEquity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
            <stop offset="72%" stopColor="#22c55e" stopOpacity={0.05} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.025)" vertical={false} />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={44}
          tick={{ fontSize: 12, fontWeight: 600, fill: "#52525b" }}
          tickMargin={16}
        />
        <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
        <Tooltip
          formatter={(value) => formatBalance(Number(value))}
          contentStyle={{
            background: "#0b0b0b",
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 12,
            color: "#f4f4f5",
            fontSize: 11,
          }}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#tradoxMobileEquity)"
          dot={false}
          activeDot={{ r: 4, fill: "#22c55e", stroke: "#050505", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
