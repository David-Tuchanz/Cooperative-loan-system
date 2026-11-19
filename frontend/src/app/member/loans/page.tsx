
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  HandCoins,
  Home,
  LogOut,
  RefreshCw,
  Settings,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { MemberAvatar } from "@/components/member-avatar";
import { apiFetch } from "@/lib/api";
import MemberNotifications from "@/components/member-notifications";

type Member = {
  username?: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  profile_picture_url?: string | null;
};

type Repayment = {
  repayment_id: number;
  loan_id: number;
  payment_date: string;
  amount_paid: number | string;
  payment_status?: string;
};

type Loan = {
  loan_id: number;
  application_id: number;
  amount_approved: number | string;
  amount_due: number | string | null;
  interest_rate: number | string | null;
  disbursement_date: string | null;
  loan_status: string;
  outstanding_balance: number | string | null;
  repayments: Repayment[];
};

type DashboardResponse = {
  member: Member;
  summary: {
    total_applications: number;
    approved_applications: number;
    pending_applications: number;
    active_loans: number;
    total_outstanding_balance: number;
  };
  loans: Loan[];
  message?: string;
};

type LoanFilter = "all" | "active" | "completed";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const cardSurface =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/[0.07] dark:bg-[#0c0c0e] dark:bg-gradient-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-16px_rgba(0,0,0,0.8)]";

const iconTile =
  "rounded-xl bg-teal-50 p-3 text-teal-800 dark:bg-gradient-to-b dark:from-white/[0.09] dark:to-white/[0.03] dark:text-zinc-300 dark:ring-1 dark:ring-white/[0.07]";

const pillButton =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:rounded-full dark:border-white/[0.1] dark:bg-white/[0.04] dark:px-4 dark:text-zinc-200 dark:hover:bg-white/[0.08]";

const navigation = [
  { label: "Overview", href: "/member/dashboard", icon: Home },
  { label: "My Loans", href: "/member/loans", icon: HandCoins },
  { label: "Apply for Loan", href: "/member/apply", icon: FileText },
  { label: "Repayments", href: "/member/repayments", icon: Wallet },
  { label: "My Profile", href: "/member/profile", icon: Settings },
];

function formatCurrency(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Not available";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status?: string | null) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeStatus(status?: string | null) {
  return status?.toLowerCase().replace(/[\s-]+/g, "_") || "";
}

function statusStyle(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (
    ["approved", "disbursed", "completed", "active"].includes(normalized)
  ) {
    return {
      pill:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/[0.08] dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }

  if (
    ["rejected", "declined", "defaulted", "cancelled"].includes(normalized)
  ) {
    return {
      pill:
        "bg-red-50 text-red-700 dark:bg-red-400/[0.08] dark:text-red-300",
      dot: "bg-red-500",
    };
  }

  if (
    ["pending", "under_review", "submitted"].includes(normalized)
  ) {
    return {
      pill:
        "bg-amber-50 text-amber-700 dark:bg-amber-400/[0.08] dark:text-amber-300",
      dot: "bg-amber-500",
    };
  }

  return {
    pill:
      "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300",
    dot: "bg-slate-400",
  };
}

function StatusBadge({ status }: { status?: string | null }) {
  const style = statusStyle(status);

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${style.pill}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {formatStatus(status)}
    </span>
  );
}

function getRepaymentProgress(loan: Loan) {
  const amountDue = Number(loan.amount_due);
  const outstanding = Number(loan.outstanding_balance);

  if (
    loan.amount_due === null ||
    loan.amount_due === "" ||
    loan.outstanding_balance === null ||
    !Number.isFinite(amountDue) ||
    !Number.isFinite(outstanding) ||
    amountDue <= 0 ||
    outstanding < 0
  ) {
    return null;
  }

  const remaining = Math.min(outstanding, amountDue);
  const repaid = Math.max(0, amountDue - remaining);

  return {
    percentage: Math.round((repaid / amountDue) * 100),
    repaid,
    remaining,
  };
}

function LoanStatusChart({ loans }: { loans: Loan[] }) {
  const segments = useMemo(() => {
    const active = loans.filter(
      (loan) => normalizeStatus(loan.loan_status) === "active"
    ).length;

    const completed = loans.filter(
      (loan) => normalizeStatus(loan.loan_status) === "completed"
    ).length;

    const other = loans.length - active - completed;

    return [
      {
        label: "Active",
        count: active,
        color: "#0d9488",
      },
      {
        label: "Completed",
        count: completed,
        color: "#64748b",
      },
      {
        label: "Other statuses",
        count: other,
        color: "#d97706",
      },
    ];
  }, [loans]);

  const total = loans.length;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;

  const chartSegments = segments.map((segment) => {
    const fraction = total > 0 ? segment.count / total : 0;
    const dashLength = fraction * circumference;
    const offset = accumulated;
    accumulated += dashLength;

    return {
      ...segment,
      dashLength,
      offset,
    };
  });

  return (
    <article className={`${cardSurface} p-5 sm:p-6`}>
      <div>
        <h2 className="font-semibold text-[#0b2545] dark:text-white">
          Loan status breakdown
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          The current status of your recorded loans.
        </p>
      </div>

      {total === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center text-center">
          <HandCoins
            size={28}
            className="text-slate-400 dark:text-zinc-500"
          />
          <p className="mt-3 text-sm font-medium">No loan data yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Your loan breakdown will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          <div className="relative h-44 w-44 shrink-0">
            <svg
              viewBox="0 0 100 100"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={`${total} total loans: ${segments
                .map((segment) => `${segment.count} ${segment.label}`)
                .join(", ")}`}
            >
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-slate-100 dark:text-white/[0.07]"
              />

              {chartSegments.map((segment) =>
                segment.count > 0 ? (
                  <circle
                    key={segment.label}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="12"
                    strokeDasharray={`${segment.dashLength} ${
                      circumference - segment.dashLength
                    }`}
                    strokeDashoffset={-segment.offset}
                    strokeLinecap="butt"
                  />
                ) : null
              )}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-[#0b2545] dark:text-white">
                {total}
              </span>
              <span className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Total loans
              </span>
            </div>
          </div>

          <div className="w-full space-y-4 sm:max-w-52">
            {segments.map((segment) => (
              <div
                key={segment.label}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-slate-600 dark:text-zinc-300">
                    {segment.label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#0b2545] dark:text-white">
                  {segment.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function RepaymentProgress({ loan }: { loan: Loan }) {
  const progress = getRepaymentProgress(loan);

  if (!progress) {
    return (
      <div className="min-w-40">
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Progress unavailable
        </p>
      </div>
    );
  }

  const isCompleted =
    normalizeStatus(loan.loan_status) === "completed";

  const percentage = isCompleted ? 100 : progress.percentage;

  return (
    <div className="min-w-40 max-w-56">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#0b2545] dark:text-white">
          {percentage}%
        </span>
        <span className="text-xs text-slate-500 dark:text-zinc-400">
          repaid
        </span>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]"
        role="progressbar"
        aria-label={`Repayment progress for loan ${loan.loan_id}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-teal-600 transition-all duration-500 dark:bg-teal-400"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
        {formatCurrency(progress.remaining)} remaining
      </p>
    </div>
  );
}

export default function MemberLoansPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] =
    useState<DashboardResponse["summary"] | null>(null);
  const [filter, setFilter] = useState<LoanFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLoans = useCallback(async () => {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        `${API_URL}/api/members/me/dashboard`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const data = (await response.json()) as DashboardResponse;

      if (response.status === 401) {
        setError("Your session has expired. Please sign in again.");
        setLoans([]);
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Unable to load your loans.");
      }

      setLoans(data.loans ?? []);
      setSummary(data.summary ?? null);

      let profilePictureUrl: string | null = null;

try {
  const profileResponse = await apiFetch(
    `${API_URL}/api/members/me/profile`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (profileResponse.ok) {
    const profileData = await profileResponse.json();
    const profile = profileData.profile || profileData.member || profileData;

    profilePictureUrl = profile.profile_picture_url ?? null;
  }
} catch {
  // Keep the existing member information if profile retrieval fails.
}

if (data.member || profilePictureUrl) {
  setMember((previous) => ({
    ...previous,
    ...data.member,
    profile_picture_url:
      profilePictureUrl ?? previous?.profile_picture_url ?? null,
  }));
}
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const savedUser = sessionStorage.getItem("current_user");

      if (savedUser) {
        setMember(JSON.parse(savedUser) as Member);
      }
    } catch {
      setMember(null);
    }

    void loadLoans();
  }, [loadLoans]);

  const username = member?.username || "Member";

const displayName =
  member?.full_name ||
  [member?.first_name, member?.last_name].filter(Boolean).join(" ") ||
  member?.name ||
  username;

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const filteredLoans = useMemo(() => {
    if (filter === "active") {
      return loans.filter(
        (loan) => normalizeStatus(loan.loan_status) === "active"
      );
    }

    if (filter === "completed") {
      return loans.filter(
        (loan) => normalizeStatus(loan.loan_status) === "completed"
      );
    }

    return loans;
  }, [filter, loans]);

  const activeLoans = loans.filter(
    (loan) => normalizeStatus(loan.loan_status) === "active"
  ).length;

  const completedLoans = loans.filter(
    (loan) => normalizeStatus(loan.loan_status) === "completed"
  ).length;

  const totalOutstanding = loans.reduce((total, loan) => {
    const balance = Number(loan.outstanding_balance ?? 0);

    return total + (Number.isFinite(balance) ? balance : 0);
  }, 0);

  function signOut() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("current_user");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 transition-colors dark:bg-[#060607] dark:bg-[radial-gradient(60rem_28rem_at_50%_-8%,rgba(255,255,255,0.045),transparent)] dark:bg-no-repeat dark:text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/[0.07] dark:bg-[#09090a] lg:flex">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-6 dark:border-white/[0.07]">
            <LogoMark className="h-10 w-10 shrink-0 text-[#0b2545] dark:text-white" />
            <div>
              <p className="text-base font-semibold tracking-[0.18em] text-[#0b2545] dark:text-white">
                CONCORD
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Member Portal
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Workspace
            </p>

            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.label === "My Loans";

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                    active
                      ? "bg-teal-50 font-semibold text-teal-800 dark:bg-white/[0.06] dark:text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#0b2545] dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-teal-600 dark:bg-zinc-300" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 p-4 dark:border-white/[0.07]">
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-400/10 dark:hover:text-red-300"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-white/[0.07] dark:bg-[#09090a] sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <LogoMark className="h-9 w-9 shrink-0 text-[#0b2545] dark:text-white" />
              <div>
                <p className="text-sm font-semibold tracking-[0.15em] text-[#0b2545] dark:text-white">
                  CONCORD
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Member Portal
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Member Portal
              </p>
              <h1 className="mt-1 text-xl font-semibold text-[#0b2545] dark:text-white">
                My Loans
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="rounded-full border border-white/70 bg-white/80 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <ThemeToggle />
              </div>

              <MemberNotifications />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-expanded={profileOpen}
                  aria-label="Open member profile menu"
                  className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                >
                  <MemberAvatar
                        imageUrl={member?.profile_picture_url}
                        name={displayName}
                        sizeClassName="h-10 w-10"
                        className="ring-2 ring-teal-100 dark:ring-white/10"
                      />
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-32 truncate text-sm font-medium text-slate-800 dark:text-zinc-100">
                      {displayName}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-zinc-400">
                      Member
                    </span>
                  </span>

                  <ChevronDown size={16} className="hidden sm:block" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 z-30 mt-3 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/[0.08] dark:bg-[#111113] dark:shadow-black/50">
                    <div className="border-b border-slate-100 px-3 py-3 dark:border-white/[0.07]">
                      <p className="truncate text-sm font-semibold">
                        {displayName}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-zinc-400">
                        {member?.email || `@${username}`}
                      </p>
                    </div>

                    <Link
                      href="/member/profile"
                      onClick={() => setProfileOpen(false)}
                      className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                    >
                      <Settings size={17} />
                      My Profile
                    </Link>

                    <button
                      type="button"
                      onClick={signOut}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
                    >
                      <LogOut size={17} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b2545] to-[#176d69] p-6 text-white shadow-lg shadow-slate-900/10 dark:from-[#0a0d0f] dark:via-[#0d1618] dark:to-[#10403d] dark:shadow-black/30 dark:ring-1 dark:ring-white/[0.07] sm:p-8">
              <div className="relative z-10 max-w-2xl">
                <p className="text-sm font-medium text-teal-100 dark:text-teal-200/90">
                  YOUR LOAN PORTFOLIO
                </p>

                <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                  Your loans, {displayName}
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 dark:text-zinc-300">
                  Review your approved loans, check outstanding balances, and
                  follow the progress of your repayments in one place.
                </p>

                <Link
                  href="/member/apply"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0b2545] transition hover:bg-teal-50"
                >
                  Apply for a loan
                  <ArrowUpRight size={17} />
                </Link>
              </div>

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-10 h-44 w-44 rounded-full border border-white/10"
              />
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#0b2545] dark:text-white">
                    Loan overview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    A summary of your recorded loan activity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadLoans()}
                  disabled={loading}
                  className={pillButton}
                >
                  <RefreshCw
                    size={15}
                    className={loading ? "animate-spin" : ""}
                  />
                  Refresh
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Total Loans",
                    value: loans.length,
                    detail: "Loans recorded on your account",
                    icon: HandCoins,
                  },
                  {
                    label: "Active Loans",
                    value: activeLoans,
                    detail: "Loans currently being repaid",
                    icon: Wallet,
                  },
                  {
                    label: "Completed Loans",
                    value: completedLoans,
                    detail: "Loans marked as completed",
                    icon: CheckCircle2,
                  },
                  {
                    label: "Outstanding Balance",
                    value: formatCurrency(totalOutstanding),
                    detail: "Remaining balance across your loans",
                    icon: CircleDollarSign,
                  },
                ].map((card) => {
                  const Icon = card.icon;

                  return (
                    <article
                      key={card.label}
                      className={`${cardSurface} p-5`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-slate-500 dark:text-zinc-400">
                            {card.label}
                          </p>
                          <p className="mt-3 break-words text-xl font-semibold text-[#0b2545] dark:text-white">
                            {loading ? "..." : card.value}
                          </p>
                        </div>

                        <div className={iconTile}>
                          <Icon size={21} />
                        </div>
                      </div>

                      <p className="mt-4 text-xs text-slate-500 dark:text-zinc-500">
                        {card.detail}
                      </p>
                    </article>
                  );
                })}
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300"
                >
                  <p>{error}</p>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        error.toLowerCase().includes("session has expired")
                      ) {
                        signOut();
                      } else {
                        void loadLoans();
                      }
                    }}
                    className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-2"
                  >
                    <RefreshCw size={14} />
                    {error.toLowerCase().includes("session has expired")
                      ? "Sign in again"
                      : "Try again"}
                  </button>
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <LoanStatusChart loans={loading ? [] : loans} />

              <article className={`${cardSurface} p-5 sm:p-6`}>
                <div>
                  <h2 className="font-semibold text-[#0b2545] dark:text-white">
                    Repayment progress
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    How much of each loan has been repaid.
                  </p>
                </div>

                {loading ? (
                  <div className="flex min-h-48 items-center justify-center">
                    <RefreshCw
                      size={22}
                      className="animate-spin text-teal-600 dark:text-zinc-300"
                    />
                  </div>
                ) : loans.length === 0 ? (
                  <div className="flex min-h-48 flex-col items-center justify-center text-center">
                    <Wallet
                      size={28}
                      className="text-slate-400 dark:text-zinc-500"
                    />
                    <p className="mt-3 text-sm font-medium">
                      No loans to track
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      Progress will appear when loan records are available.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    {loans.slice(0, 4).map((loan) => (
                      <div key={loan.loan_id}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-[#0b2545] dark:text-white">
                            Loan #{loan.loan_id}
                          </p>
                          <StatusBadge status={loan.loan_status} />
                        </div>
                        <RepaymentProgress loan={loan} />
                      </div>
                    ))}

                    {loans.length > 4 && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400">
                        Showing progress for 4 of {loans.length} loans. View
                        the table below for all your records.
                      </p>
                    )}
                  </div>
                )}
              </article>
            </section>

            <section className={`${cardSurface} p-5 sm:p-6`}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold text-[#0b2545] dark:text-white">
                    All loan records
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    View active and completed loans.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { label: "All loans", value: "all" },
                      { label: "Active", value: "active" },
                      { label: "Completed", value: "completed" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      aria-pressed={filter === item.value}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        filter === item.value
                          ? "bg-[#0b2545] text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/[0.1] dark:text-zinc-300 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="my-6 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-white/[0.14]">
                  <RefreshCw
                    size={24}
                    className="mx-auto animate-spin text-teal-600 dark:text-zinc-300"
                  />
                  <p className="mt-4 text-sm text-slate-500 dark:text-zinc-400">
                    Loading your loan records...
                  </p>
                </div>
              ) : filteredLoans.length === 0 ? (
                <div className="my-6 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-white/[0.14]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-zinc-400">
                    <Clock3 size={22} />
                  </div>

                  <p className="mt-4 font-medium text-slate-700 dark:text-zinc-200">
                    {loans.length === 0
                      ? "No loan records yet"
                      : `No ${filter} loans found`}
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-zinc-400">
                    {loans.length === 0
                      ? "Approved loan records will appear here when they are linked to your account."
                      : "Try another filter to view your other loan records."}
                  </p>

                  {loans.length === 0 && (
                    <Link
                      href="/member/apply"
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0b2545] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#16395f] dark:rounded-full dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                    >
                      Apply for a loan
                      <ArrowUpRight size={16} />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                        <th className="px-3 py-3 font-medium">Loan ID</th>
                        <th className="px-3 py-3 font-medium">
                          Approved amount
                        </th>
                        <th className="px-3 py-3 font-medium">Amount due</th>
                        <th className="px-3 py-3 font-medium">
                          Outstanding
                        </th>
                        <th className="px-3 py-3 font-medium">
                          Repayment progress
                        </th>
                        <th className="px-3 py-3 font-medium">Interest</th>
                        <th className="px-3 py-3 font-medium">
                          Disbursement date
                        </th>
                        <th className="px-3 py-3 font-medium">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredLoans.map((loan) => (
                        <tr
                          key={loan.loan_id}
                          className="border-b border-slate-100 last:border-0 dark:border-white/[0.05]"
                        >
                          <td className="px-3 py-4 font-medium text-[#0b2545] dark:text-white">
                            #{loan.loan_id}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            {formatCurrency(loan.amount_approved)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            {formatCurrency(loan.amount_due)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap font-medium">
                            {formatCurrency(loan.outstanding_balance)}
                          </td>
                          <td className="px-3 py-4">
                            <RepaymentProgress loan={loan} />
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            {loan.interest_rate === null ||
                            loan.interest_rate === undefined
                              ? "Not available"
                              : `${Number(loan.interest_rate).toLocaleString(
                                  "en-NG"
                                )}%`}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            {formatDate(loan.disbursement_date)}
                          </td>
                          <td className="px-3 py-4">
                            <StatusBadge status={loan.loan_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && filteredLoans.length > 0 && (
                <p className="mt-4 text-xs text-slate-500 dark:text-zinc-400">
                  Showing {filteredLoans.length} of {loans.length} loan records.
                </p>
              )}
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <article className={`${cardSurface} p-6`}>
                <div className="flex items-start gap-3">
                  <div className={iconTile}>
                    <CalendarDays size={21} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#0b2545] dark:text-white">
                      Track your repayments
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-zinc-400">
                      Review payments recorded against your loans and monitor
                      your repayment history.
                    </p>
                    <Link
                      href="/member/repayments"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 dark:text-zinc-200 dark:hover:text-white"
                    >
                      View repayments
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>
              </article>

              <article className={`${cardSurface} p-6`}>
                <div className="flex items-start gap-3">
                  <div className={iconTile}>
                    <ShieldCheck size={21} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#0b2545] dark:text-white">
                      Loan account information
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-zinc-400">
                      Your loan records reflect the information stored by your
                      cooperative. Contact your loan officer if a record needs
                      clarification.
                    </p>
                    <Link
                      href="/member/dashboard"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 dark:text-zinc-200 dark:hover:text-white"
                    >
                      Back to overview
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            </section>

            <footer className="pb-3 text-center text-xs text-slate-400 dark:text-zinc-500">
              Concord Cooperative Loan Management System
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
