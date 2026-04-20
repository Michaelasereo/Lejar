"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNaira } from "@/lib/utils/currency";

interface WealthProjectionChartProps {
  data: { year: number; value: number }[];
}

export function WealthProjectionChart({ data }: WealthProjectionChartProps) {
  const chartData = data.map((d) => ({
    label: `Year ${d.year}`,
    value: d.value,
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => {
              if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(0)}M`;
              if (v >= 1_000) return `₦${Math.round(v / 1_000)}k`;
              return `₦${v}`;
            }}
            tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const v = payload[0].value as number;
              return (
                <div className="border border-white/10 bg-[#111] px-3 py-2 text-xs text-white/80">
                  {formatNaira(v)}
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill="#16a34a" radius={[0, 0, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
