"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import {
  Activity,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileDown,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Loader2,
  Percent,
  RefreshCw,
  ShieldCheck,
  Timer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api";


type Application = {
  application_id: number;
  member_id: number;
  amount_requested: number | null;
  loan_type: string | null;
  loan_purpose: string | null;
  loan_term: number | null;
  repayment_frequency: string | null;
  application_date: string | null;
  application_status: string | null;
  decision_date: string | null;
  submission_method: string | null;
};

type Member = {
  member_id: number;
  first_name: string;
  last_name: string;
  membership_date: string | null;
  membership_status: string | null;
  member_category: string | null;
  cooperative_unit: string | null;
};

type AdminUser = { user_id: number; role: string; status: string };

type DashboardData = {
  applications: { total: number; by_status: Record<string, number> };
  loans: {
    total: number;
    by_status: Record<string, number>;
    total_amount_approved: number;
    total_outstanding_balance: number;
  };
  repayments: { completed_count: number; total_amount_paid: number };
  risk_predictions: { total: number; by_level: Record<string, number> };
  recent_applications: Application[];
};

type Row = { label: string; value: number; color?: string };
type Period = "all" | "3" | "6" | "12";


/* Theme (same surfaces as the repayments page)                        */


const cardSurface =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/[0.07] dark:bg-[#0c0c0e] dark:bg-gradient-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-16px_rgba(0,0,0,0.8)]";

const iconTile =
  "rounded-xl bg-teal-50 p-3 text-teal-800 dark:bg-gradient-to-b dark:from-white/[0.09] dark:to-white/[0.03] dark:text-zinc-300 dark:ring-1 dark:ring-white/[0.07] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

const pillButton =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:rounded-full dark:border-white/[0.1] dark:bg-gradient-to-b dark:from-white/[0.08] dark:to-white/[0.02] dark:px-4 dark:text-zinc-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.7)] dark:hover:from-white/[0.12] dark:hover:to-white/[0.04]";

const DEFAULT_BAR = "bg-teal-600 dark:bg-zinc-300";

const TONE: Record<string, string> = {
  pending: "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  cancelled: "bg-slate-400",
  active: "bg-teal-500",
  completed: "bg-emerald-500",
  overdue: "bg-amber-500",
  defaulted: "bg-red-500",
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
  inactive: "bg-slate-400",
};

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/[0.08] dark:text-emerald-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-400/[0.08] dark:text-amber-300",
  rejected: "bg-red-50 text-red-700 dark:bg-red-400/[0.08] dark:text-red-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  loan_officer: "Loan Officer",
  member: "Member",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

function formatCurrency(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? money.format(value) : "Not available";
}

function titleCase(value?: string | null) {
  const text = (value ?? "").trim();
  if (!text) return "Not specified";
  return text.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function percent(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : null;
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function formatDuration(ms: number | null) {
  if (ms === null) return "Not available";
  const hours = ms / 3_600_000;
  if (hours >= 24) return `${(hours / 24).toFixed(1)} days`;
  if (hours >= 1) return `${hours.toFixed(1)} hrs`;
  return `${Math.max(1, Math.round(ms / 60_000))} mins`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Not available" : d.toLocaleDateString("en-NG");
}

function countBy<T>(items: T[], key: (item: T) => string | null | undefined, limit = 6): Row[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const name = titleCase(key(item));
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  const rows = [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  if (rows.length <= limit) return rows;
  const other = rows.slice(limit).reduce((sum, r) => sum + r.value, 0);
  return [...rows.slice(0, limit), { label: "Other", value: other }];
}

function monthKey(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthBuckets(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-NG", { month: "short", year: "2-digit" }),
    };
  });
}

function countByMonth(dates: (string | null | undefined)[], buckets: { key: string; label: string }[]) {
  const counts = new Map<string, number>();
  for (const value of dates) {
    const key = monthKey(value);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return buckets.map((b) => ({ label: b.label, value: counts.get(b.key) ?? 0 }));
}

async function fetchJson<T>(path: string, name: string): Promise<T> {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error(`Could not load ${name} (${response.status}).`);
  return (await response.json()) as T;
}

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Small presentational components                                     */
/* ------------------------------------------------------------------ */

function StatCard({
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

function Panel({
  title,
  description,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon: ElementType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${cardSurface} p-6 ${className}`}>
      <div className="flex items-center gap-3">
        <div className={iconTile}>
          <Icon size={21} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-[#0b2545] dark:text-white">{title}</h3>
          {description && <p className="text-sm text-slate-500 dark:text-zinc-400">{description}</p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/[0.14] dark:text-zinc-400">
      {text}
    </div>
  );
}

function Distribution({ rows, emptyText = "No data available." }: { rows: Row[]; emptyText?: string }) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  if (total === 0) return <EmptyNote text={emptyText} />;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
        {rows
          .filter((r) => r.value > 0)
          .map((r) => (
            <div
              key={r.label}
              className={r.color ?? DEFAULT_BAR}
              style={{ width: `${(r.value / total) * 100}%` }}
              title={`${r.label}: ${r.value}`}
            />
          ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-slate-600 dark:text-zinc-300">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${r.color ?? DEFAULT_BAR}`} />
              <span className="truncate">{r.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-slate-500 dark:text-zinc-400">
              <span className="font-semibold text-[#0b2545] dark:text-white">{r.value}</span>
              {" · "}
              {formatPercent((r.value / total) * 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarList({ rows, emptyText = "No data available." }: { rows: Row[]; emptyText?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (max === 0) return <EmptyNote text={emptyText} />;

  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-600 dark:text-zinc-300">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[#0b2545] dark:text-white">{r.value}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-white/[0.06]">
            <div
              className={`h-2 rounded-full ${r.color ?? DEFAULT_BAR}`}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MonthChart({ data, emptyText }: { data: { label: string; value: number }[]; emptyText: string }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  if (max === 0) return <EmptyNote text={emptyText} />;

  return (
    <div className="flex h-52 items-end gap-2">
      {data.map((d) => {
        const height = (d.value / max) * 85;
        return (
          <div key={d.label} className="flex h-full min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 w-full flex-1">
              <span
                className="absolute inset-x-0 text-center text-xs tabular-nums text-slate-500 dark:text-zinc-400"
                style={{ bottom: `calc(${height}% + 3px)` }}
              >
                {d.value}
              </span>
              <div
                className={`absolute inset-x-1 bottom-0 rounded-t-md ${DEFAULT_BAR}`}
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="mt-2 truncate text-center text-[10px] text-slate-500 dark:text-zinc-500">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReportsClient() {
  const reportRef = useRef<HTMLDivElement>(null);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("all");
  const [generatedAt, setGeneratedAt] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    // Trailing slashes matter: Flask redirects the slash-less versions.
    const [dash, apps, mems, usrs] = await Promise.allSettled([
      fetchJson<DashboardData>("/api/dashboard/", "dashboard figures"),
      fetchJson<{ applications: Application[] }>("/api/loan-applications/", "loan applications"),
      fetchJson<{ members: Member[] }>("/api/members/", "members"),
      fetchJson<{ users: AdminUser[] }>("/api/admin/users", "user accounts"),
    ]);

    const failed: string[] = [];
    const reason = (r: PromiseRejectedResult) =>
      r.reason instanceof Error ? r.reason.message : "Could not load some report data.";

    if (dash.status === "fulfilled") setDashboard(dash.value);
    else { setDashboard(null); failed.push(reason(dash)); }

    if (apps.status === "fulfilled") setApplications(apps.value.applications ?? []);
    else { setApplications([]); failed.push(reason(apps)); }

    if (mems.status === "fulfilled") setMembers(mems.value.members ?? []);
    else { setMembers([]); failed.push(reason(mems)); }

    if (usrs.status === "fulfilled") setUsers(usrs.value.users ?? []);
    else { setUsers([]); failed.push(reason(usrs)); }

    setErrors(failed);
    setGeneratedAt(new Date().toLocaleString("en-NG"));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ---------------- derived figures ---------------- */

  const memberNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of members) map.set(m.member_id, `${m.first_name} ${m.last_name}`.trim());
    return map;
  }, [members]);

  const analysis = useMemo(() => {
    const trendBuckets = monthBuckets(period === "all" ? 12 : Number(period));
    const allowed = new Set(trendBuckets.map((b) => b.key));
    const scoped =
      period === "all"
        ? applications
        : applications.filter((a) => {
            const key = monthKey(a.application_date);
            return key !== null && allowed.has(key);
          });

    const outcomes: Row[] = ["pending", "approved", "rejected", "cancelled"].map((s) => ({
      label: titleCase(s),
      value: scoped.filter((a) => a.application_status === s).length,
      color: TONE[s],
    }));

    const durations = applications
      .map((a) =>
        a.application_date && a.decision_date
          ? new Date(a.decision_date).getTime() - new Date(a.application_date).getTime()
          : NaN
      )
      .filter((ms) => Number.isFinite(ms) && ms >= 0);

    const avgDecisionMs = durations.length
      ? durations.reduce((sum, ms) => sum + ms, 0) / durations.length
      : null;

    return {
      scopedCount: scoped.length,
      outcomes,
      trend: countByMonth(scoped.map((a) => a.application_date), trendBuckets),
      byType: countBy(scoped, (a) => a.loan_type),
      byPurpose: countBy(scoped, (a) => a.loan_purpose),
      byMethod: countBy(scoped, (a) => a.submission_method),
      avgDecisionMs,
      decidedCount: durations.length,
    };
  }, [applications, period]);

  const membership = useMemo(
    () => ({
      status: ["active", "inactive"].map((s) => ({
        label: titleCase(s),
        value: members.filter((m) => (m.membership_status ?? "active") === s).length,
        color: TONE[s],
      })) as Row[],
      byCategory: countBy(members, (m) => m.member_category),
      byUnit: countBy(members, (m) => m.cooperative_unit),
      growth: countByMonth(members.map((m) => m.membership_date), monthBuckets(12)),
    }),
    [members]
  );

  const accounts = useMemo(
    () => ({
      byRole: ["admin", "loan_officer", "member"].map((r) => ({
        label: ROLE_LABELS[r],
        value: users.filter((u) => u.role === r).length,
      })) as Row[],
      byStatus: ["active", "inactive"].map((s) => ({
        label: titleCase(s),
        value: users.filter((u) => (u.status ?? "active") === s).length,
        color: TONE[s],
      })) as Row[],
    }),
    [users]
  );

  const approvedAmount = dashboard?.loans.total_amount_approved ?? null;
  const paidAmount = dashboard?.repayments.total_amount_paid ?? null;
  const outstanding = dashboard?.loans.total_outstanding_balance ?? null;
  const repaymentRate =
    approvedAmount !== null && paidAmount !== null ? percent(paidAmount, approvedAmount) : null;

  const appStatus = dashboard?.applications.by_status ?? {};
  const approvalRate = dashboard
    ? percent(appStatus.approved ?? 0, (appStatus.approved ?? 0) + (appStatus.rejected ?? 0))
    : null;

  const loanRows: Row[] = ["active", "completed", "overdue", "defaulted"].map((s) => ({
    label: titleCase(s),
    value: dashboard?.loans.by_status[s] ?? 0,
    color: TONE[s],
  }));

  const riskRows: Row[] = ["Low", "Medium", "High"].map((level) => ({
    label: level,
    value: dashboard?.risk_predictions.by_level[level] ?? 0,
    color: TONE[level.toLowerCase()],
  }));

  const show = (value: ReactNode) => (loading ? "..." : value);

  /* ---------------- exports ---------------- */

  function exportCsv() {
    const rows: (string | number | null)[][] = [];
    const add = (...cells: (string | number | null)[]) => rows.push(cells);
    const section = (title: string) => {
      if (rows.length) rows.push([]);
      rows.push([title]);
    };
    const distribution = (title: string, data: Row[]) => {
      section(title);
      add("Category", "Count");
      data.forEach((r) => add(r.label, r.value));
    };

    add("CONCORD administrator report");
    add("Generated", generatedAt);
    add("Application analysis period", period === "all" ? "All time (trend: last 12 months)" : `Last ${period} months`);

    section("Financial summary (all time, NGN)");
    add("Metric", "Value");
    add("Total amount approved", approvedAmount);
    add("Total repaid", paidAmount);
    add("Outstanding balance", outstanding);
    add("Repayment rate (%)", repaymentRate === null ? null : Number(repaymentRate.toFixed(1)));
    add("Completed repayments", dashboard?.repayments.completed_count ?? null);

    section("Application summary (all time)");
    add("Metric", "Value");
    add("Total applications", dashboard?.applications.total ?? null);
    add("Approval rate (%)", approvalRate === null ? null : Number(approvalRate.toFixed(1)));
    add("Pending applications", appStatus.pending ?? null);
    add("Average decision time (hours)", analysis.avgDecisionMs === null ? null : Number((analysis.avgDecisionMs / 3_600_000).toFixed(1)));

    distribution("Loan portfolio by status", loanRows);
    distribution(
      `Risk distribution (${dashboard?.risk_predictions.total ?? 0} of ${dashboard?.applications.total ?? 0} applications scored)`,
      riskRows
    );
    distribution("Application outcomes (selected period)", analysis.outcomes);

    section("Applications per month");
    add("Month", "Applications");
    analysis.trend.forEach((d) => add(d.label, d.value));

    distribution("Applications by loan type (selected period)", analysis.byType);
    distribution("Applications by loan purpose (selected period)", analysis.byPurpose);
    distribution("Applications by submission method (selected period)", analysis.byMethod);
    distribution("Members by status", membership.status);
    distribution("Members by category", membership.byCategory);
    distribution("Members by cooperative unit", membership.byUnit);

    section("New members per month");
    add("Month", "Members");
    membership.growth.forEach((d) => add(d.label, d.value));

    distribution("User accounts by role", accounts.byRole);
    distribution("User accounts by status", accounts.byStatus);

    section("Recent applications");
    add("Application ID", "Member", "Loan type", "Amount requested (NGN)", "Application date", "Status");
    (dashboard?.recent_applications ?? []).forEach((a) =>
      add(
        a.application_id,
        memberNames.get(a.member_id) ?? `Member #${a.member_id}`,
        titleCase(a.loan_type),
        a.amount_requested,
        formatDate(a.application_date),
        titleCase(a.application_status)
      )
    );

    const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `concord-report-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async function exportPdf() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      const dark = document.documentElement.classList.contains("dark");

      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: dark ? "#060607" : "#f8fafc",
      });

      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not render the report for export."));
        image.src = dataUrl;
      });

      // One continuous page (A4 width) so no card is cut across a page break.
      const width = 595;
      const height = Math.round((image.naturalHeight / image.naturalWidth) * width);
      const pdf = new jsPDF({
        unit: "pt",
        format: [width, height],
        orientation: width > height ? "landscape" : "portrait",
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, width, height);
      pdf.save(`concord-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "PDF export failed."]);
    } finally {
      setExporting(false);
    }
  }

  /* ---------------- render ---------------- */

  const periods: { value: Period; label: string }[] = [
    { value: "all", label: "All" },
    { value: "3", label: "3M" },
    { value: "6", label: "6M" },
    { value: "12", label: "12M" },
  ];

  const periodNote =
    period === "all"
      ? "All applications. The monthly chart shows the last 12 months."
      : `Applications from the last ${period} months.`;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b2545] dark:text-white">Reports</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            Review summary information about cooperative operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className={pillButton}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button" onClick={exportCsv} disabled={loading} className={pillButton}>
            <FileSpreadsheet size={15} />
            Export CSV
          </button>
          <button type="button" onClick={() => void exportPdf()} disabled={loading || exporting} className={pillButton}>
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            {exporting ? "Preparing..." : "Export PDF"}
          </button>
        </div>
      </section>

      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300"
        >
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-2"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      <div ref={reportRef} className="space-y-8 p-1">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-zinc-500">
          <span className="font-semibold tracking-[0.15em] text-[#0b2545] dark:text-white">CONCORD · ADMINISTRATOR REPORT</span>
          <span>{generatedAt ? `Generated ${generatedAt}` : ""}</span>
        </div>

        {/* 1. Financial overview */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[#0b2545] dark:text-white">Financial overview</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">All-time totals across every loan.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Approved" value={show(formatCurrency(approvedAmount))} detail={`${dashboard?.loans.total ?? 0} loans issued`} icon={HandCoins} />
            <StatCard label="Total Repaid" value={show(formatCurrency(paidAmount))} detail={`${dashboard?.repayments.completed_count ?? 0} completed payments`} icon={CircleDollarSign} />
            <StatCard label="Outstanding Balance" value={show(formatCurrency(outstanding))} detail="Remaining across all loans" icon={Wallet} />
            <StatCard label="Repayment Rate" value={show(formatPercent(repaymentRate))} detail="Repaid as a share of approved" icon={Percent} />
          </div>
        </section>

        {/* 2. Application activity */}
        <section>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[#0b2545] dark:text-white">Application activity</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">All-time loan application performance.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Applications" value={show(dashboard?.applications.total ?? "Not available")} detail="Submitted by members and officers" icon={FileText} />
            <StatCard label="Approval Rate" value={show(formatPercent(approvalRate))} detail="Approved of decided applications" icon={CheckCircle2} />
            <StatCard label="Pending Queue" value={show(appStatus.pending ?? "Not available")} detail="Awaiting a decision" icon={Clock3} />
            <StatCard label="Avg. Decision Time" value={show(formatDuration(analysis.avgDecisionMs))} detail={`Across ${analysis.decidedCount} decided applications`} icon={Timer} />
          </div>
        </section>

        {/* 3. Loan portfolio + risk */}
        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="Loan portfolio" description="Loans grouped by current status." icon={HandCoins}>
            <Distribution rows={loanRows} emptyText={loading ? "Loading..." : "No loans have been issued yet."} />
          </Panel>
          <Panel
            title="Risk distribution"
            description={
              dashboard
                ? `${dashboard.risk_predictions.total} of ${dashboard.applications.total} applications have a risk score (latest score each).`
                : "Latest risk score per application."
            }
            icon={ShieldCheck}
          >
            <Distribution rows={riskRows} emptyText={loading ? "Loading..." : "No risk predictions have been generated yet."} />
          </Panel>
        </section>

        {/* 4. Application analysis (period-aware) */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0b2545] dark:text-white">Application analysis</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                {periodNote} The period applies to this section only. {analysis.scopedCount} applications in range.
              </p>
            </div>
            <div className="inline-flex rounded-full border border-slate-200 p-1 dark:border-white/[0.1]" role="group" aria-label="Period">
              {periods.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPeriod(p.value)}
                  aria-pressed={period === p.value}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                    period === p.value
                      ? "bg-[#0b2545] text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Application outcomes" description="Status of applications in the selected period." icon={FileText}>
              <Distribution rows={analysis.outcomes} emptyText={loading ? "Loading..." : "No applications in this period."} />
            </Panel>
            <Panel title="Applications per month" description="Volume of applications submitted." icon={TrendingUp}>
              <MonthChart data={analysis.trend} emptyText={loading ? "Loading..." : "No applications in this period."} />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="By loan type" icon={HandCoins}>
              <BarList rows={analysis.byType} emptyText="No applications in this period." />
            </Panel>
            <Panel title="By loan purpose" icon={FileText}>
              <BarList rows={analysis.byPurpose} emptyText="No applications in this period." />
            </Panel>
            <Panel title="By submission method" icon={Users}>
              <BarList rows={analysis.byMethod} emptyText="No applications in this period." />
            </Panel>
          </div>
        </section>

        {/* 5. Membership */}
        <section className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[#0b2545] dark:text-white">Membership</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{members.length} registered members.</p>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Membership status" icon={Users}>
              <Distribution rows={membership.status} emptyText={loading ? "Loading..." : "No members registered yet."} />
            </Panel>
            <Panel title="New members per month" description="Last 12 months." icon={TrendingUp}>
              <MonthChart data={membership.growth} emptyText={loading ? "Loading..." : "No new members in the last 12 months."} />
            </Panel>
            <Panel title="By member category" icon={Users}>
              <BarList rows={membership.byCategory} emptyText="No category data recorded." />
            </Panel>
            <Panel title="By cooperative unit" icon={Users}>
              <BarList rows={membership.byUnit} emptyText="No cooperative unit data recorded." />
            </Panel>
          </div>
        </section>

        {/* 6. Accounts */}
        <section className="grid gap-6 xl:grid-cols-2">
          <Panel title="User accounts by role" description={`${users.length} system accounts.`} icon={ShieldCheck}>
            <Distribution rows={accounts.byRole} emptyText={loading ? "Loading..." : "No accounts found."} />
          </Panel>
          <Panel title="User accounts by status" icon={Activity}>
            <Distribution rows={accounts.byStatus} emptyText={loading ? "Loading..." : "No accounts found."} />
          </Panel>
        </section>

        {/* 7. Recent applications */}
        <section className={`${cardSurface} p-6`}>
          <div className="flex items-center gap-3">
            <div className={iconTile}>
              <FileText size={21} />
            </div>
            <div>
              <h3 className="font-semibold text-[#0b2545] dark:text-white">Recent applications</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400">The five most recent loan applications.</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                  <th className="px-3 py-3 font-medium">Application</th>
                  <th className="px-3 py-3 font-medium">Member</th>
                  <th className="px-3 py-3 font-medium">Loan type</th>
                  <th className="px-3 py-3 font-medium">Amount</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-slate-500 dark:text-zinc-400">Loading applications...</td>
                  </tr>
                ) : (dashboard?.recent_applications ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-slate-500 dark:text-zinc-400">No applications to display.</td>
                  </tr>
                ) : (
                  dashboard!.recent_applications.map((a) => (
                    <tr key={a.application_id}>
                      <td className="px-3 py-4 font-medium text-slate-800 dark:text-zinc-100">#{a.application_id}</td>
                      <td className="px-3 py-4 text-slate-600 dark:text-zinc-300">{memberNames.get(a.member_id) ?? `Member #${a.member_id}`}</td>
                      <td className="px-3 py-4 text-slate-600 dark:text-zinc-300">{titleCase(a.loan_type)}</td>
                      <td className="px-3 py-4 text-slate-600 dark:text-zinc-300">{formatCurrency(a.amount_requested)}</td>
                      <td className="px-3 py-4 text-xs text-slate-500 dark:text-zinc-500">{formatDate(a.application_date)}</td>
                      <td className="px-3 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[a.application_status ?? ""] ?? STATUS_BADGE.cancelled}`}>
                          {titleCase(a.application_status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}