import * as React from "react";

type BarDatum = {
  label: string;
  value: number;
};

export function BarChart({ data, maxBars = 8 }: { data: BarDatum[]; maxBars?: number }) {
  const rows = data.slice(0, maxBars);
  const max = rows.reduce((acc, d) => Math.max(acc, Number.isFinite(d.value) ? d.value : 0), 1);

  return (
    <div className="grid gap-3">
      {rows.map((d) => {
        const pct = Math.max(0, Math.min(100, Math.round((d.value / max) * 100)));
        return (
          <div key={d.label} className="grid gap-1">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <div className="truncate">{d.label}</div>
              <div className="tabular-nums">{d.value.toFixed(2)}%</div>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-blue-600" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
