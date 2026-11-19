"use client";

import { compactNaira } from "@/components/loan-officer/loan-data";

export type Segment = { label: string; value: number; color: string };

/* ------------------------------------------------------------------ */
/* Doughnut                                                            */
/* ------------------------------------------------------------------ */

export function DoughnutChart({
  segments,
  centerLabel,
  ariaLabel,
}: {
  segments: Segment[];
  centerLabel: string;
  ariaLabel: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  const arcs = segments.map((segment) => {
    const length = total > 0 ? (segment.value / total) * circumference : 0;
    const offset = accumulated;
    accumulated += length;
    return { ...segment, length, offset };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={ariaLabel}>
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-slate-100 dark:text-white/[0.07]"
          />
          {arcs
            .filter((arc) => arc.value > 0)
            .map((arc) => (
              <circle
                key={arc.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth="12"
                strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                strokeDashoffset={-arc.offset}
              />
            ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-[#0b2545] dark:text-white">{total}</span>
          <span className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{centerLabel}</span>
        </div>
      </div>

      <ul className="w-full space-y-3 sm:max-w-52">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-zinc-300">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="text-sm font-semibold tabular-nums text-[#0b2545] dark:text-white">
              {segment.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line chart (amounts by month)                                       */
/* ------------------------------------------------------------------ */

export type LinePoint = { key: string; label: string; value: number };

export function LineChart({
  points,
  ariaLabel,
  color = "#0d9488",
}: {
  points: LinePoint[];
  ariaLabel: string;
  color?: string;
}) {
  const width = 560;
  const height = 230;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 34;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const max = Math.max(1, ...points.map((p) => p.value));

  const coords = points.map((point, index) => ({
    ...point,
    x: points.length === 1 ? padLeft + plotWidth / 2 : padLeft + (index / (points.length - 1)) * plotWidth,
    y: padTop + plotHeight - (point.value / max) * plotHeight,
  }));

  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const baseline = padTop + plotHeight;
  const area =
    coords.length > 1
      ? `${coords[0].x},${baseline} ${line} ${coords[coords.length - 1].x},${baseline}`
      : "";

  return (
    <div className="w-full overflow-hidden text-slate-500 dark:text-zinc-400">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={ariaLabel}>
        {[0, 1, 2, 3].map((step) => {
          const y = padTop + (plotHeight / 3) * step;
          const value = max - (max / 3) * step;
          return (
            <g key={step}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity="0.14"
                strokeDasharray="4 5"
              />
              <text x={padLeft - 8} y={y + 3} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.75">
                {compactNaira(value)}
              </text>
            </g>
          );
        })}

        {area && <polygon points={area} fill={color} opacity="0.08" />}

        {coords.length > 1 && (
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {coords.map((c) => (
          <g key={c.key}>
            <circle cx={c.x} cy={c.y} r="3.5" fill={color} />
            <text x={c.x} y={height - 12} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.8">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bars                                                     */
/* ------------------------------------------------------------------ */

export type BarRow = { label: string; value: number; color: string; detail?: string };

export function BarList({ rows }: { rows: BarRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="space-y-4">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-slate-600 dark:text-zinc-300">{row.label}</span>
            <span className="tabular-nums">
              <span className="font-semibold text-[#0b2545] dark:text-white">{row.value}</span>
              {row.detail && <span className="ml-2 text-xs text-slate-500 dark:text-zinc-500">{row.detail}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.07]">
            <div
              className="h-full rounded-full"
              style={{ width: `${(row.value / max) * 100}%`, backgroundColor: row.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}