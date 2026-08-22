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

export type EquityPoint = { trade: number; equity: number; label: string }

/**
 * The dashboard equity curve, split out so recharts can be loaded on demand.
 *
 * recharts is ~0.7MB of the 2.4MB client bundle and it was imported at the top
 * of four route components, so it shipped with the first byte of the dashboard
 * whether or not a chart was ever on screen. Isolating each chart lets
 * next/dynamic pull it as its own chunk after the page has painted.
 *
 * It has to be a whole component rather than lazily-wrapped primitives:
 * recharts identifies its children by displayName, and wrapping Area or XAxis
 * in a loader would hide that and break the chart.
 */
export function EquityAreaChart({
  equity,
  formatBalance,
}: {
  equity: EquityPoint[]
  /** Passed in because the caller decides whether balances are masked. */
  formatBalance: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={equity}
        margin={{ left: 0, right: 10, top: 14, bottom: 0 }}
      >
        <defs>
          <linearGradient
            id="tradoxResponsiveEquity"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.24} />
            <stop offset="62%" stopColor="#22c55e" stopOpacity={0.07} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
        <XAxis
          dataKey="trade"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: "#71717a" }}
        />
        <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
        <Tooltip
          formatter={(value) => formatBalance(Number(value))}
          labelFormatter={(_, payload) =>
            payload?.[0]?.payload?.label ?? "Balance"
          }
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
          fill="url(#tradoxResponsiveEquity)"
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 4,
            fill: "#22c55e",
            stroke: "#050505",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
