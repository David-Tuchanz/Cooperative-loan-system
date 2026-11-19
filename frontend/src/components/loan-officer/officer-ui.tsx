"use client";

import { useEffect, type ElementType, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Theme (same surfaces as the member / repayments pages)              */
/* ------------------------------------------------------------------ */

export const cardSurface =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/[0.07] dark:bg-[#0c0c0e] dark:bg-gradient-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-16px_rgba(0,0,0,0.8)]";

export const iconTile =
  "rounded-xl bg-teal-50 p-3 text-teal-800 dark:bg-gradient-to-b dark:from-white/[0.09] dark:to-white/[0.03] dark:text-zinc-300 dark:ring-1 dark:ring-white/[0.07] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

export const pillButton =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:rounded-full dark:border-white/[0.1] dark:bg-gradient-to-b dark:from-white/[0.08] dark:to-white/[0.02] dark:px-4 dark:text-zinc-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.7)] dark:hover:from-white/[0.12] dark:hover:to-white/[0.04]";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b2545] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16395f] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[0.1] dark:text-zinc-300 dark:hover:bg-white/[0.05]";

export const rowButton =
  "inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/[0.1] dark:text-zinc-300 dark:hover:bg-white/[0.05]";

export const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 disabled:cursor-not-allowed disabled:bg-slate-50 dark:border-white/[0.1] dark:bg-[#111113] dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-teal-500 dark:disabled:bg-white/[0.03]";

export const labelClass = "block text-sm font-medium text-slate-700 dark:text-zinc-300";

export const errorBox =
  "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300";

export const successBox =
  "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/[0.06] dark:text-emerald-300";

export const BADGE = {
  good: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/[0.08] dark:text-emerald-300",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-400/[0.08] dark:text-amber-300",
  bad: "bg-red-50 text-red-700 dark:bg-red-400/[0.08] dark:text-red-300",
  neutral: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300",
};

/* ------------------------------------------------------------------ */
/* Formatting + fetching helpers                                       */
/* ------------------------------------------------------------------ */

export const NA = "Not available";
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

export const naira = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? money.format(v) : NA;

export function titleCase(value: unknown) {
  if (value === null || value === undefined || value === "") return NA;
  return String(value).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function fmtDate(value: unknown) {
  if (!value) return NA;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? NA : d.toLocaleDateString("en-NG");
}

export function fmtDateTime(value: unknown) {
  if (!value) return NA;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? NA : d.toLocaleString("en-NG");
}

export function fmtPercent(value: unknown, scale = 1) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * scale).toFixed(1)}%` : NA;
}

export function daysSince(value?: string | null): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export function waitingLabel(value?: string | null) {
  const days = daysSince(value);
  if (days === null) return NA;
  if (days === 0) return "Today";
  return days === 1 ? "1 day" : `${days} days`;
}

export async function fetchJson<T>(path: string, name: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error(`Could not load ${name} (${response.status}).`);
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

export function badgeTone(value: string) {
  const v = value.toLowerCase();
  if (["active", "approved", "completed", "low"].includes(v)) return BADGE.good;
  if (["pending", "medium", "overdue"].includes(v)) return BADGE.warn;
  if (["rejected", "failed", "defaulted", "high"].includes(v)) return BADGE.bad;
  return BADGE.neutral;
}

export function Badge({ value, fallback = NA }: { value?: string | null; fallback?: string }) {
  if (!value) return <span className="text-xs text-slate-500 dark:text-zinc-500">{fallback}</span>;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeTone(value)}`}>
      {titleCase(value)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ElementType;
}) {
  return (
    <article className={`${cardSurface} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-zinc-400">{label}</p>
          <p className="mt-3 break-words text-xl font-semibold text-[#0b2545] dark:text-white">{value}</p>
        </div>
        <div className={iconTile}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500 dark:text-zinc-500">{detail}</p>
    </article>
  );
}

export function Panel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon: ElementType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${cardSurface} p-6 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={iconTile}>
            <Icon size={21} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[#0b2545] dark:text-white">{title}</h3>
            {description && <p className="text-sm text-slate-500 dark:text-zinc-400">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/[0.14] dark:text-zinc-400">
      {text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer, detail block, pagination, error helper                      */
/* ------------------------------------------------------------------ */

export type Section = { title: string; items: { label: string; value: ReactNode }[] };

export function DetailBlock({ title, items }: Section) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{title}</h4>
      <dl className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.06]">
        {items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
            <dt className="shrink-0 text-slate-500 dark:text-zinc-400">{item.label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-slate-800 dark:text-zinc-100">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function Drawer({
  eyebrow,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`ml-auto flex h-full w-full ${wide ? "max-w-xl" : "max-w-md"} flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#09090a]`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/[0.07]">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{eyebrow}</p>
            )}
            <h3 className="mt-1 truncate text-lg font-semibold text-[#0b2545] dark:text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-zinc-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/[0.06]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 dark:border-white/[0.07]">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

export type PageInfo = { current: number; pages: number; first: number; last: number };

export function paginate<T>(items: T[], page: number, pageSize: number): PageInfo & { visible: T[] } {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  return {
    visible: items.slice(start, start + pageSize),
    current,
    pages,
    first: items.length ? start + 1 : 0,
    last: Math.min(start + pageSize, items.length),
  };
}

export function Pagination({
  total,
  unfilteredTotal,
  info,
  pageSize,
  onPage,
  onPageSize,
}: {
  total: number;
  unfilteredTotal?: number;
  info: PageInfo;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-white/[0.07] dark:text-zinc-500">
      <span>
        {total === 0 ? "0 records" : `${info.first}–${info.last} of ${total}`}
        {unfilteredTotal !== undefined && unfilteredTotal !== total && ` (filtered from ${unfilteredTotal})`}
      </span>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-white/[0.1] dark:bg-[#111113] dark:text-zinc-200"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(info.current - 1)}
            disabled={info.current <= 1}
            aria-label="Previous page"
            className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.1] dark:hover:bg-white/[0.05]"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="px-2 tabular-nums">Page {info.current} of {info.pages}</span>
          <button
            type="button"
            onClick={() => onPage(info.current + 1)}
            disabled={info.current >= info.pages}
            aria-label="Next page"
            className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.1] dark:hover:bg-white/[0.05]"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Pull the backend's { message } out of a failed response. */
export async function readMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return data.message || data.error || `${fallback} (${response.status}).`;
}