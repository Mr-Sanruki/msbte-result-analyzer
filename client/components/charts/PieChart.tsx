import * as React from "react";

type PieDatum = {
  label: string;
  value: number;
  color: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    "L",
    cx,
    cy,
    "Z",
  ].join(" ");
}

export function PieChart({ data, size = 180 }: { data: PieDatum[]; size?: number }) {
  const total = data.reduce((acc, d) => acc + (Number.isFinite(d.value) ? d.value : 0), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.95;

  let angle = 0;
  const slices = total > 0 ? data : [];

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((d, idx) => {
          const sweep = (d.value / total) * 360;
          const startAngle = angle;
          const endAngle = angle + sweep;
          angle = endAngle;
          return <path key={idx} d={arcPath(cx, cy, r, startAngle, endAngle)} fill={d.color} />;
        })}
        {total <= 0 ? <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" /> : null}
      </svg>

      <div className="grid gap-2">
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.label} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-slate-700">{d.label}</span>
              </div>
              <div className="tabular-nums text-slate-700">
                {d.value} ({pct}%)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
