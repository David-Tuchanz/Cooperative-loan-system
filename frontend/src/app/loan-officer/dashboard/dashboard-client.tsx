"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  FileText,
  HandCoins,
  Plus,
  RefreshCw,
  UserPlus,
  Wallet,
} from "lucide-react";
import {
  Badge,
  EmptyNote,
  Panel,
  StatCard,
  daysSince,
  errorBox,
  fetchJson,
  fmtDate,
  iconTile,
  naira,
  cardSurface,
  pillButton,
  rowButton,
  titleCase,
  waitingLabel,
} from "@/components/loan-officer/officer-ui";

type Application = {
  application_id: number;
  member_name?: string | null;
  member_id: number;
  loan_type?: string | null;
  amount_requested?: number | null;
  application_date?: string | null;
  application_status?: string | null;
  latest_risk_level?: string | null;
  latest_default_probability?: number | null;
};

type LoanRow = {
  loan_id: number;
  member_name?: string | null;
  member_id: number;
  loan_type?: string | null;
  amount_approved?: number | null;
  outstanding_balance?: number | null;
  loan_status?: string | null;
  disbursement_date?: string | null;
};

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
};

const quickActions = [
  { href: "/loan-officer/members", icon: UserPlus, title: "Register a member", text: "Add a new cooperative member." },
  { href: "/loan-officer/applications/new", icon: Plus, title: "New application", text: "Submit a loan application for a member." },
  { href: "/loan-officer/repayments", icon: Wallet, title: "Record a repayment", text: "Log a payment against a loan." },
];

export default function DashboardClient() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [displayName, setDisplayName] = useState("Loan Officer");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("current_user");
      if (saved) {
        const u = JSON.parse(saved) as { full_name?: string; name?: string; username?: string };
        setDisplayName(u.full_name || u.name || u.username || "Loan Officer");
      }
    } catch {
      /* keep the default name */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    // Trailing slash on /api/dashboard/ matters: Flask redirects the slash-less path.
    const [dash, apps, lns] = await Promise.allSettled([
      fetchJson<DashboardData>("/api/dashboard/", "dashboard figures"),
      fetchJson<{ applications: Application[] }>("/api/officer/applications", "applications"),
      fetchJson<{ loans: LoanRow[] }>("/api/officer/loans", "loans"),
    ]);

    const failed: string[] = [];
    const reason = (r: PromiseRejectedResult) =>
      r.reason instanceof Error ? r.reason.message : "Could not load some dashboard data.";

    if (dash.status === "fulfilled") setDashboard(dash.value);
    else { setDashboard(null); failed.push(reason(dash)); }

    if (apps.status === "fulfilled") setApplications(apps.value.applications ?? []);
    else { setApplications([]); failed.push(reason(apps)); }

    if (lns.status === "fulfilled") setLoans(lns.value.loans ?? []);
    else { setLoans([]); failed.push(reason(lns)); }

    setErrors(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () =>
      applications
        .filter((a) => a.application_status === "pending")
        .sort((a, b) => new Date(a.application_date ?? 0).getTime() - new Date(b.application_date ?? 0).getTime()),
    [applications]
  );

  const attention = useMemo(() => {
    const rank = (s?: string | null) => (s === "overdue" ? 0 : 1);
    return loans
      .filter((l) => l.loan_status === "overdue" || l.loan_status === "defaulted")
      .sort((a, b) => rank(a.loan_status) - rank(b.loan_status) || (b.outstanding_balance ?? 0) - (a.outstanding_balance ?? 0));
  }, [loans]);

  const oldestDays = pending.length ? daysSince(pending[0].application_date) : null;
  const loanStatus = dashboard?.loans.by_status ?? {};
  const show = (value: React.ReactNode) => (loading ? "..." : value);

  return (
    <div className="space-y-8">
      <section className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b2545] to-[#176d69] p-6 text-white shadow-lg shadow-slate-900/10 dark:from-[#0a0d0f] dark:via-[#0d1618] dark:to-[#10403d] dark:shadow-black/30 dark:ring-1 dark:ring-white/[0.07] sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-medium text-teal-100 dark:text-teal-200/90">LOAN OFFICER WORKSPACE</p>
          <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">Welcome back, {displayName}!</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 dark:text-zinc-300">
            {loading
              ? "Loading your workload..."
              : pending.length === 0
                ? "There are no applications waiting for review right now."
                : `${pending.length} ${pending.length === 1 ? "application is" : "applications are"} waiting for review.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/loan-officer/applications" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0b2545] transition hover:bg-teal-50">
              Review applications <ArrowUpRight size={17} />
            </Link>
            <Link href="/loan-officer/applications/new" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              <Plus size={17} /> New application
            </Link>
          </div>
        </div>
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10 dark:hidden" />
        <div className="absolute -right-2 -top-10 h-44 w-44 rounded-full border border-white/10 dark:hidden" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 hidden h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(95,179,173,0.22),transparent_65%)] dark:block" />
      </section>

      {errors.length > 0 && (
        <div role="alert" className={errorBox}>
          {errors.map((message) => <p key={message}>{message}</p>)}
          <button type="button" onClick={() => void load()} className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-2">
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#0b2545] dark:text-white">Portfolio overview</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Live figures across all members.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className={pillButton}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Pending Applications"
            value={show(dashboard?.applications.by_status.pending ?? pending.length)}
            detail={oldestDays === null ? "Nothing waiting for review" : `Oldest has waited ${oldestDays} ${oldestDays === 1 ? "day" : "days"}`}
            icon={FileText}
          />
          <StatCard label="Active Loans" value={show(loanStatus.active ?? 0)} detail="Loans currently being repaid" icon={HandCoins} />
          <StatCard label="Overdue Loans" value={show(loanStatus.overdue ?? 0)} detail={`${loanStatus.defaulted ?? 0} defaulted`} icon={AlertTriangle} />
          <StatCard label="Outstanding Balance" value={show(naira(dashboard?.loans.total_outstanding_balance))} detail="Remaining across all loans" icon={Wallet} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Awaiting review"
          description="Oldest applications first."
          icon={FileText}
          action={<Link href="/loan-officer/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300">View all <ArrowUpRight size={15} /></Link>}
        >
          {loading ? (
            <EmptyNote text="Loading applications..." />
          ) : pending.length === 0 ? (
            <EmptyNote text="No applications are waiting for review." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                    <th className="px-3 py-3 font-medium">Member</th>
                    <th className="px-3 py-3 font-medium">Amount</th>
                    <th className="px-3 py-3 font-medium">Risk</th>
                    <th className="px-3 py-3 font-medium">Waiting</th>
                    <th className="px-3 py-3 font-medium"><span className="sr-only">Review</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {pending.slice(0, 5).map((a) => (
                    <tr key={a.application_id}>
                      <td className="px-3 py-4">
                        <p className="font-medium text-slate-800 dark:text-zinc-100">{a.member_name || `Member #${a.member_id}`}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-500">{titleCase(a.loan_type)} · #{a.application_id}</p>
                      </td>
                      <td className="px-3 py-4 text-slate-600 dark:text-zinc-300">{naira(a.amount_requested)}</td>
                      <td className="px-3 py-4"><Badge value={a.latest_risk_level} fallback="Not scored" /></td>
                      <td className="px-3 py-4 text-xs text-slate-500 dark:text-zinc-500">{waitingLabel(a.application_date)}</td>
                      <td className="px-3 py-4 text-right">
                        <Link href={`/loan-officer/applications?id=${a.application_id}`} className={rowButton}>Review</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Loans needing attention"
          description="Overdue first, then defaulted."
          icon={AlertTriangle}
          action={<Link href="/loan-officer/loans" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300">View all <ArrowUpRight size={15} /></Link>}
        >
          {loading ? (
            <EmptyNote text="Loading loans..." />
          ) : attention.length === 0 ? (
            <EmptyNote text="No overdue or defaulted loans. Nice work." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                    <th className="px-3 py-3 font-medium">Member</th>
                    <th className="px-3 py-3 font-medium">Outstanding</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Disbursed</th>
                    <th className="px-3 py-3 font-medium"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {attention.slice(0, 5).map((l) => (
                    <tr key={l.loan_id}>
                      <td className="px-3 py-4">
                        <p className="font-medium text-slate-800 dark:text-zinc-100">{l.member_name || `Member #${l.member_id}`}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-500">{titleCase(l.loan_type)} · Loan #{l.loan_id}</p>
                      </td>
                      <td className="px-3 py-4 text-slate-600 dark:text-zinc-300">{naira(l.outstanding_balance)}</td>
                      <td className="px-3 py-4"><Badge value={l.loan_status} /></td>
                      <td className="px-3 py-4 text-xs text-slate-500 dark:text-zinc-500">{fmtDate(l.disbursement_date)}</td>
                      <td className="px-3 py-4 text-right">
                        <Link href={`/loan-officer/loans?id=${l.loan_id}`} className={rowButton}>Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-[#0b2545] dark:text-white">Quick actions</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map(({ href, icon: Icon, title, text }) => (
            <Link key={href} href={href} className={`${cardSurface} group p-5 transition hover:border-teal-300 dark:hover:border-white/[0.14]`}>
              <div className="flex items-center justify-between">
                <div className={iconTile}><Icon size={21} /></div>
                <ArrowUpRight className="text-slate-400 transition group-hover:-translate-y-1 group-hover:translate-x-1 dark:text-zinc-500" />
              </div>
              <h4 className="mt-4 font-semibold text-[#0b2545] dark:text-white">{title}</h4>
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{text}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}