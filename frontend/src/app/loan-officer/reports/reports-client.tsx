"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Download,
  FileBarChart,
  FileText,
  HandCoins,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  EmptyNote,
  Panel,
  StatCard,
  errorBox,
  fetchJson,
  fieldClass,
  fmtDate,
  fmtPercent,
  naira,
  pillButton,
  titleCase,
} from "@/components/loan-officer/officer-ui";
import { BarList, DoughnutChart, LineChart, type LinePoint } from "@/components/loan-officer/officer-charts";
import type { LoanRecord, RepaymentRecord } from "@/components/loan-officer/loan-data";

/* ------------------------------------------------------------------ */
/* Types and period helpers                                            */
/* ------------------------------------------------------------------ */

type ReportApplication = {
  application_id: number;
  application_status?: string | null;
  application_date?: string | null;
  latest_risk_level?: string | null;
};

type Period = "all" | "year" | "12m" | "90d" | "30d";

const PERIODS: { value: Period; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "year", label: "This year" },
  { value: "12m", label: "Last 12 months" },
  { value: "90d", label: "Last 90 days" },
  { value: "30d", label: "Last 30 days" },
];

function periodCutoff(period: Period): Date | null {
  const now = new Date();
  switch (period) {
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "12m":
      return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    case "90d":
      return new Date(now.getTime() - 90 * 86_400_000);
    case "30d":
      return new Date(now.getTime() - 30 * 86_400_000);
    default:
      return null;
  }
}

function inPeriod(value: string | null | undefined, cutoff: Date | null) {
  if (!cutoff) return true;
  if (!value) return false;
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time >= cutoff.getTime();
}

function monthCount(period: Period) {
  if (period === "30d") return 2;
  if (period === "90d") return 4;
  if (period === "year") return new Date().getMonth() + 1;
  return 12;
}

function monthKeys(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

type Cell = string | number | null | undefined;

function csvCell(cell: Cell) {
  let text = cell === null || cell === undefined ? "" : String(cell);
  // Stop spreadsheet apps from running text such as =SUM(...) typed into a name.
  if (typeof cell === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, rows: Cell[][]) {
  const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const sum = (values: (number | null | undefined)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0);

const LOAN_COLORS: Record<string, string> = {
  active: "#0d9488",
  completed: "#64748b",
  overdue: "#d97706",
  defaulted: "#dc2626",
};

const RISK_ROWS = [
  { key: "low", label: "Low", color: "#10b981" },
  { key: "medium", label: "Medium", color: "#d97706" },
  { key: "high", label: "High", color: "#dc2626" },
  { key: "", label: "Not scored", color: "#64748b" },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReportsClient() {
  const [applications, setApplications] = useState<ReportApplication[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [repayments, setRepayments] = useState<RepaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>("12m");

  const load = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    const [apps, lns, reps] = await Promise.allSettled([
      fetchJson<{ applications: ReportApplication[] }>("/api/officer/applications", "applications"),
      fetchJson<{ loans: LoanRecord[] }>("/api/officer/loans", "loans"),
      fetchJson<{ repayments: RepaymentRecord[] }>("/api/repayments", "repayments"),
    ]);

    const failed: string[] = [];
    const reason = (r: PromiseRejectedResult) =>
      r.reason instanceof Error ? r.reason.message : "Could not load some report data.";

    if (apps.status === "fulfilled") setApplications(apps.value.applications ?? []);
    else {
      setApplications([]);
      failed.push(reason(apps));
    }

    if (lns.status === "fulfilled") setLoans(lns.value.loans ?? []);
    else {
      setLoans([]);
      failed.push(reason(lns));
    }

    if (reps.status === "fulfilled") setRepayments(reps.value.repayments ?? []);
    else {
      setRepayments([]);
      failed.push(reason(reps));
    }

    setErrors(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const report = useMemo(() => {
    const cutoff = periodCutoff(period);

    // Activity: filtered to the selected period.
    const apps = applications.filter((a) => inPeriod(a.application_date, cutoff));
    const disbursedLoans = loans.filter((l) => inPeriod(l.disbursement_date, cutoff));
    const payments = repayments.filter((r) => r.payment_status === "completed" && inPeriod(r.payment_date, cutoff));
    const periodRepayments = repayments.filter((r) => inPeriod(r.payment_date, cutoff));

    const byStatus = (s: string) => apps.filter((a) => a.application_status === s).length;
    const approved = byStatus("approved");
    const rejected = byStatus("rejected");
    const decided = approved + rejected;

    const keys = monthKeys(monthCount(period));
    const monthly = new Map<string, number>(keys.map((k) => [k, 0]));
    for (const p of payments) {
      const key = (p.payment_date ?? "").slice(0, 7);
      if (monthly.has(key)) monthly.set(key, (monthly.get(key) ?? 0) + (p.amount_paid ?? 0));
    }
    const trend: LinePoint[] = keys.map((key) => ({ key, label: monthLabel(key), value: monthly.get(key) ?? 0 }));

    const risk = RISK_ROWS.map((row) => {
      const group = apps.filter((a) => (a.latest_risk_level ?? "").toLowerCase() === row.key);
      const ok = group.filter((a) => a.application_status === "approved").length;
      const no = group.filter((a) => a.application_status === "rejected").length;
      const waiting = group.filter((a) => a.application_status === "pending").length;
      return { ...row, total: group.length, approved: ok, rejected: no, pending: waiting, rate: ok + no > 0 ? ok / (ok + no) : null };
    });

    // Portfolio: a snapshot of every loan as it stands today.
    const loanCount = (s: string) => loans.filter((l) => l.loan_status === s).length;
    const outstanding = sum(loans.map((l) => l.outstanding_balance));
    const atRiskLoans = loans.filter((l) => l.loan_status === "overdue" || l.loan_status === "defaulted");
    const atRiskBalance = sum(atRiskLoans.map((l) => l.outstanding_balance));

    const types = new Map<string, LoanRecord[]>();
    for (const l of loans) {
      const key = l.loan_type ?? "";
      types.set(key, [...(types.get(key) ?? []), l]);
    }
    const byType = Array.from(types.entries())
      .map(([type, group]) => {
        const arrears = group.filter((l) => l.loan_status === "overdue" || l.loan_status === "defaulted").length;
        return {
          type,
          loans: group.length,
          disbursed: sum(group.map((l) => l.amount_approved)),
          outstanding: sum(group.map((l) => l.outstanding_balance)),
          arrears,
          arrearsRate: group.length ? arrears / group.length : 0,
        };
      })
      .sort((a, b) => b.disbursed - a.disbursed);

    return {
      received: apps.length,
      approved,
      rejected,
      pending: byStatus("pending"),
      cancelled: byStatus("cancelled"),
      approvalRate: decided > 0 ? approved / decided : null,
      disbursedAmount: sum(disbursedLoans.map((l) => l.amount_approved)),
      disbursedCount: disbursedLoans.length,
      collected: sum(payments.map((p) => p.amount_paid)),
      paymentCount: payments.length,
      periodRepayments,
      trend,
      risk,
      highRiskApproved: risk.find((r) => r.key === "high")?.approved ?? 0,
      outstanding,
      loanTotal: loans.length,
      statusCounts: {
        active: loanCount("active"),
        completed: loanCount("completed"),
        overdue: loanCount("overdue"),
        defaulted: loanCount("defaulted"),
      },
      atRiskCount: atRiskLoans.length,
      atRiskBalance,
      atRiskShare: outstanding > 0 ? atRiskBalance / outstanding : null,
      byType,
    };
  }, [applications, loans, repayments, period]);

  const show = (value: React.ReactNode) => (loading && loans.length === 0 ? "..." : value);
  const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase() ?? "";

  function exportLoans() {
    downloadCsv("concord-loans.csv", [
      ["Loan ID", "Member", "Loan type", "Purpose", "Amount approved (NGN)", "Interest rate (%)", "Amount due (NGN)", "Outstanding balance (NGN)", "Disbursed", "Status"],
      ...loans.map((l) => [
        l.loan_id,
        l.member_name,
        titleCase(l.loan_type),
        l.loan_purpose,
        l.amount_approved,
        l.interest_rate,
        l.amount_due,
        l.outstanding_balance,
        l.disbursement_date,
        titleCase(l.loan_status),
      ]),
    ]);
  }

  function exportRepayments() {
    downloadCsv("concord-repayments.csv", [
      ["Repayment ID", "Loan ID", "Member", "Payment date", "Amount paid (NGN)", "Method", "Status", "Balance after (NGN)", "Recorded by"],
      ...report.periodRepayments.map((r) => [
        r.repayment_id,
        r.loan_id,
        r.member_name,
        r.payment_date,
        r.amount_paid,
        r.payment_method,
        titleCase(r.payment_status),
        r.remaining_balance,
        r.recorded_by_username,
      ]),
    ]);
  }

  const statusSegments = [
    { label: "Active", value: report.statusCounts.active, color: LOAN_COLORS.active },
    { label: "Completed", value: report.statusCounts.completed, color: LOAN_COLORS.completed },
    { label: "Overdue", value: report.statusCounts.overdue, color: LOAN_COLORS.overdue },
    { label: "Defaulted", value: report.statusCounts.defaulted, color: LOAN_COLORS.defaulted },
  ];

  const hasTrend = report.trend.some((p) => p.value > 0);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b2545] dark:text-white">Reports</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            Lending activity, collections and portfolio health in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            aria-label="Reporting period"
            className={fieldClass}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void load()} disabled={loading} className={pillButton}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {errors.length > 0 && (
        <div role="alert" className={errorBox}>
          {errors.map((message) => (
            <p key={message}>{message}</p>
          ))}
          <button type="button" onClick={() => void load()} className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-2">
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#0b2545] dark:text-white">Activity</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">What happened in the selected period ({periodLabel}).</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Applications Received"
            value={show(report.received)}
            detail={`${report.pending} pending, ${report.cancelled} cancelled`}
            icon={FileText}
          />
          <StatCard
            label="Approval Rate"
            value={show(report.approvalRate === null ? "No decisions" : fmtPercent(report.approvalRate, 100))}
            detail={`${report.approved} approved, ${report.rejected} rejected`}
            icon={ShieldCheck}
          />
          <StatCard
            label="Amount Disbursed"
            value={show(naira(report.disbursedAmount))}
            detail={`${report.disbursedCount} ${report.disbursedCount === 1 ? "loan" : "loans"} disbursed`}
            icon={HandCoins}
          />
          <StatCard
            label="Repayments Collected"
            value={show(naira(report.collected))}
            detail={`${report.paymentCount} completed ${report.paymentCount === 1 ? "payment" : "payments"}`}
            icon={Wallet}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Collections by month" description="Completed repayments received each month." icon={CalendarDays}>
          {hasTrend ? (
            <LineChart points={report.trend} ariaLabel="Repayments collected each month" />
          ) : (
            <EmptyNote text="No completed repayments in this period." />
          )}
        </Panel>

        <Panel title="Application outcomes" description="Where applications from this period stand." icon={Activity}>
          {report.received === 0 ? (
            <EmptyNote text="No applications in this period." />
          ) : (
            <BarList
              rows={[
                { label: "Approved", value: report.approved, color: "#10b981" },
                { label: "Pending", value: report.pending, color: "#d97706" },
                { label: "Rejected", value: report.rejected, color: "#dc2626" },
                { label: "Cancelled", value: report.cancelled, color: "#64748b" },
              ]}
            />
          )}
        </Panel>
      </div>

      <section>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[#0b2545] dark:text-white">Portfolio today</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">A snapshot of every loan as it stands now. The period filter does not apply here.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Outstanding Balance" value={show(naira(report.outstanding))} detail="Remaining across all loans" icon={Wallet} />
          <StatCard label="Loans In Portfolio" value={show(report.loanTotal)} detail={`${report.statusCounts.active} active, ${report.statusCounts.completed} completed`} icon={HandCoins} />
          <StatCard label="Overdue Or Defaulted" value={show(report.atRiskCount)} detail={`${naira(report.atRiskBalance)} outstanding`} icon={AlertTriangle} />
          <StatCard
            label="Balance At Risk"
            value={show(report.atRiskShare === null ? "None" : fmtPercent(report.atRiskShare, 100))}
            detail="Share of the balance on overdue or defaulted loans"
            icon={FileBarChart}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Loan status" description="All loans by current status." icon={HandCoins}>
          {report.loanTotal === 0 ? (
            <EmptyNote text="No loans yet." />
          ) : (
            <DoughnutChart segments={statusSegments} centerLabel="Loans" ariaLabel={`${report.loanTotal} loans by status`} />
          )}
        </Panel>

        <Panel
          title="Decisions by risk level"
          description="How applications from this period were decided."
          icon={ShieldCheck}
        >
          {report.received === 0 ? (
            <EmptyNote text="No applications in this period." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                      <th className="px-3 py-3 font-medium">Risk level</th>
                      <th className="px-3 py-3 text-right font-medium">Applications</th>
                      <th className="px-3 py-3 text-right font-medium">Approved</th>
                      <th className="px-3 py-3 text-right font-medium">Rejected</th>
                      <th className="px-3 py-3 text-right font-medium">Approval rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                    {report.risk.map((row) => (
                      <tr key={row.label}>
                        <td className="px-3 py-3">
                          <span className="flex items-center gap-2 text-slate-700 dark:text-zinc-200">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                            {row.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-zinc-300">{row.total}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-zinc-300">{row.approved}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-zinc-300">{row.rejected}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-zinc-300">
                          {row.rate === null ? "No decisions" : fmtPercent(row.rate, 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.highRiskApproved > 0 && (
                <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
                  {report.highRiskApproved} approved {report.highRiskApproved === 1 ? "application was" : "applications were"} rated
                  high risk in this period.
                </p>
              )}
            </>
          )}
        </Panel>
      </div>

      <Panel
        title="Portfolio by loan type"
        description="Lending and arrears for each type of loan."
        icon={FileBarChart}
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportLoans} disabled={loans.length === 0} className={pillButton}>
              <Download size={15} />
              Export loans
            </button>
            <button type="button" onClick={exportRepayments} disabled={report.periodRepayments.length === 0} className={pillButton}>
              <Download size={15} />
              Export repayments
            </button>
          </div>
        }
      >
        {report.byType.length === 0 ? (
          <EmptyNote text="No loans yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                  <th className="px-3 py-3 font-medium">Loan type</th>
                  <th className="px-3 py-3 text-right font-medium">Loans</th>
                  <th className="px-3 py-3 text-right font-medium">Disbursed</th>
                  <th className="px-3 py-3 text-right font-medium">Outstanding</th>
                  <th className="px-3 py-3 text-right font-medium">Overdue or defaulted</th>
                  <th className="px-3 py-3 text-right font-medium">Arrears rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {report.byType.map((row) => (
                  <tr key={row.type}>
                    <td className="px-3 py-3 font-medium text-slate-800 dark:text-zinc-100">{row.type ? titleCase(row.type) : "Not recorded"}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-zinc-300">{row.loans}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-600 dark:text-zinc-300">{naira(row.disbursed)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-600 dark:text-zinc-300">{naira(row.outstanding)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-zinc-300">{row.arrears}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-zinc-300">{fmtPercent(row.arrearsRate, 100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500 dark:text-zinc-500">
          Loan exports include the whole portfolio. Repayment exports cover the selected period ({periodLabel}).
          {loading ? "" : ` Report generated ${fmtDate(new Date().toISOString())}.`}
        </p>
      </Panel>
    </div>
  );
}