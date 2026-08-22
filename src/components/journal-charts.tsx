"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type JournalEquityPoint = { trade: number; equity: number; label: string };
export type JournalRadarPoint = { subject: string; value: number; fullMark: number };

/**
 * The journal's two charts, kept together because they share one recharts
 * import and always load as a pair.
 *
 * Split out of journal-v2.tsx so recharts loads on demand: it is roughly 0.7MB
 * of the 2.4MB client bundle and was pulled in at the top of the module, so it
 * shipped with the journal whether or not the analytics tab was ever opened.
 *
 * Extracted whole rather than as lazily-wrapped primitives: recharts resolves
 * its children by displayName, so wrapping Area or Radar in a loader would
 * hide that and break the chart.
 */
export function JournalEquityChart({
  equity,
  cash,
}: {
  equity: JournalEquityPoint[];
  cash: Intl.NumberFormat;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={equity}
        margin={{ left: 8, right: 8, top: 16, bottom: 4 }}
      >
        <defs>
          <linearGradient
            id="analyticsBalanceFill"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#22c55e"
              stopOpacity={0.35}
            />
            <stop
              offset="100%"
              stopColor="#171717"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="rgba(255,255,255,.07)"
          vertical={false}
        />
        <XAxis
          dataKey="trade"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "#707b91" }}
        />
        <YAxis
          width={54}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) =>
            `$${Number(value / 1000).toFixed(1)}K`
          }
          tick={{ fontSize: 10, fill: "#707b91" }}
        />
        <Tooltip
          formatter={(v) => cash.format(Number(v))}
          labelFormatter={(_, payload) =>
            payload?.[0]?.payload?.label ?? "Balance"
          }
          contentStyle={{
            background: "#171717",
            border: "1px solid #333333",
            borderRadius: 12,
            color: "#f1f1f1",
          }}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke="#22c55e"
          fill="url(#analyticsBalanceFill)"
          strokeWidth={3}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function JournalScoreRadar({
  scoreRadar,
}: {
  scoreRadar: JournalRadarPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={scoreRadar}>
        <PolarGrid stroke="rgba(255,255,255,.12)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "#d4d4d8", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          dataKey="value"
          stroke="#22c55e"
          fill="#22c55e"
          fillOpacity={0.36}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
