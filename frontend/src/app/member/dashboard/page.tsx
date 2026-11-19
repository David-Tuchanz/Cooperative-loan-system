"use client";

import { useCallback, useEffect, useState } from "react";
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
  Settings,
  ShieldCheck,
  Wallet,
  RefreshCw,
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
  role?: string;
  profile_picture_url?: string | null;
};

type LoanApplication = {
  application_id: number;
  member_id?: number;
  amount_requested: number | string;
  loan_type?: string;
  loan_purpose?: string;
  loan_term?: number;
  interest_rate?: number | string | null;
  repayment_frequency?: string;
  application_date?: string;
  application_status?: string;
  decision_date?: string | null;
};

type Repayment = {
  repayment_id: number;
  loan_id: number;
  payment_date: string;
  amount_paid: number | string;
  payment_method?: string;
  payment_status?: string;
  remaining_balance?: number | string | null;
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
  applications: LoanApplication[];
  loans: Loan[];
  repayments: Repayment[];
  message?: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const HERO_IMAGE = "/images/dashboard-hero.jpg";

const cardSurface =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/[0.07] dark:bg-[#0c0c0e] dark:bg-gradient-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-16px_rgba(0,0,0,0.8)]";

const iconTile =
  "rounded-xl bg-teal-50 p-3 text-teal-800 dark:bg-gradient-to-b dark:from-white/[0.09] dark:to-white/[0.03] dark:text-zinc-300 dark:ring-1 dark:ring-white/[0.07] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

const pillButton =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:rounded-full dark:border-white/[0.1] dark:bg-gradient-to-b dark:from-white/[0.08] dark:to-white/[0.02] dark:px-4 dark:text-zinc-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.7)] dark:hover:from-white/[0.12] dark:hover:to-white/[0.04]";

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

function statusStyle(status?: string | null) {
  const normalized = status?.toLowerCase().replace(/[\s-]+/g, "_");
  const darkPill =
    "dark:bg-white/[0.06] dark:text-zinc-200 dark:ring-1 dark:ring-white/[0.07]";

  if (
    ["approved", "disbursed", "completed", "active"].includes(
      normalized || ""
    )
  ) {
    return {
      pill: `bg-emerald-50 text-emerald-700 ${darkPill}`,
      dot: "bg-emerald-500 dark:bg-emerald-400/80",
    };
  }

  if (
    ["rejected", "declined", "defaulted", "cancelled"].includes(
      normalized || ""
    )
  ) {
    return {
      pill: `bg-red-50 text-red-700 ${darkPill}`,
      dot: "bg-red-500 dark:bg-red-400/80",
    };
  }

  if (
    ["pending", "under_review", "submitted"].includes(normalized || "")
  ) {
    return {
      pill: `bg-amber-50 text-amber-700 ${darkPill}`,
      dot: "bg-amber-500 dark:bg-amber-400/80",
    };
  }

  return {
    pill: `bg-slate-100 text-slate-600 ${darkPill}`,
    dot: "bg-slate-400 dark:bg-zinc-500",
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

export default function MemberDashboard() {
  const [member, setMember] = useState<Member | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
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
        setDashboard(null);
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load your dashboard."
        );
      }

      setDashboard(data);

// Load the member's saved profile picture and profile details.
    try {
  const profileResponse = await apiFetch(
    `${API_URL}/api/members/me/profile`,
    {
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

    setMember((previous) => ({
      ...previous,
      ...data.member,
      ...profile,
      profile_picture_url:
        profile.profile_picture_url ||
        profileData.profile_picture_url ||
        data.member?.profile_picture_url ||
        previous?.profile_picture_url,
    }));
  } else if (data.member) {
    setMember((previous) => ({
      ...previous,
      ...data.member,
    }));
  }
} catch {
  if (data.member) {
    setMember((previous) => ({
      ...previous,
      ...data.member,
    }));
  }
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

    void loadDashboard();
  }, [loadDashboard]);

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

  const applications = dashboard?.applications ?? [];
  const loans = dashboard?.loans ?? [];
  const repayments = dashboard?.repayments ?? [];
  const summary = dashboard?.summary;

  const pendingApplications = summary?.pending_applications ?? 0;
  const activeLoans = summary?.active_loans ?? 0;
  const totalApplications = summary?.total_applications ?? 0;
  const totalOutstanding = summary?.total_outstanding_balance ?? 0;

  const summaryCards = [
    {
      label: "Loan Applications",
      value: loading ? "..." : String(totalApplications),
      detail: "Total applications submitted",
      icon: HandCoins,
    },
    {
      label: "Active Loans",
      value: loading ? "..." : String(activeLoans),
      detail: "Loans currently being repaid",
      icon: Wallet,
    },
    {
      label: "Outstanding Balance",
      value: loading ? "..." : formatCurrency(totalOutstanding),
      detail: "Remaining balance on active loans",
      icon: CircleDollarSign,
    },
    {
      label: "Repayments Recorded",
      value: loading ? "..." : String(repayments.length),
      detail: "Recorded repayment transactions",
      icon: CalendarDays,
    },
  ];

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
              const active = item.label === "Overview";

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
                Dashboard
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
            <section className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b2545] to-[#176d69] p-6 text-white shadow-lg shadow-slate-900/10 dark:from-[#0a0d0f] dark:via-[#0d1618] dark:to-[#10403d] dark:shadow-black/30 dark:ring-1 dark:ring-white/[0.07] sm:p-8">
              <div className="relative z-10 max-w-2xl">
                <p className="text-sm font-medium text-teal-100 dark:text-teal-200/90">
                  YOUR COOPERATIVE, AT A GLANCE
                </p>

                <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                  Welcome to your dashboard, {displayName}!
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 dark:text-zinc-300">
                  Manage your loan applications, follow repayment progress, and
                  keep track of your cooperative financial activities.
                </p>

                <Link
                  href="/member/apply"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0b2545] transition hover:bg-teal-50"
                >
                  Apply for a loan
                  <ArrowUpRight size={17} />
                </Link>
              </div>

              <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10 dark:hidden" />
              <div className="absolute -right-2 -top-10 h-44 w-44 rounded-full border border-white/10 dark:hidden" />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 hidden h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(95,179,173,0.22),transparent_65%)] dark:block"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 w-3/5 origin-right bg-cover bg-center opacity-25 transition duration-700 ease-out group-focus-within:opacity-60 group-hover:scale-105 group-hover:opacity-60 motion-reduce:transition-opacity motion-reduce:group-hover:scale-100 sm:w-1/2"
                style={{
                  backgroundImage: `url(${HERO_IMAGE})`,
                  WebkitMaskImage:
                    "linear-gradient(to left, #000 0%, transparent 90%)",
                  maskImage:
                    "linear-gradient(to left, #000 0%, transparent 90%)",
                }}
              />
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#0b2545] dark:text-white">
                    Financial overview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    Your actual loan and repayment information.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadDashboard()}
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
                {summaryCards.map((card) => {
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
                            {card.value}
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
                      if (error.toLowerCase().includes("session has expired")) {
                        signOut();
                      } else {
                        void loadDashboard();
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

            <section className="grid gap-6 xl:grid-cols-3">
              <div className={`${cardSurface} p-6 xl:col-span-2`}>
                <div className="flex items-center gap-3">
                  <div className={iconTile}>
                    <FileText size={21} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#0b2545] dark:text-white">
                      Loan applications
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-zinc-400">
                      Your recent loan requests.
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="my-6 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-white/[0.14]">
                    <RefreshCw
                      size={23}
                      className="mx-auto animate-spin text-teal-600 dark:text-zinc-300"
                    />
                    <p className="mt-4 text-sm text-slate-500 dark:text-zinc-400">
                      Loading your applications...
                    </p>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="my-6 rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-white/[0.14]">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-zinc-400">
                      <Clock3 size={22} />
                    </div>
                    <p className="mt-4 font-medium text-slate-700 dark:text-zinc-200">
                      No loan applications yet
                    </p>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-zinc-400">
                      Your applications will appear here after you submit one.
                    </p>
                    <Link
                      href="/member/apply"
                      className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0b2545] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#16395f] dark:rounded-full dark:bg-zinc-100 dark:px-5 dark:text-zinc-900 dark:hover:bg-white"
                    >
                      Start an application
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {applications.slice(0, 5).map((application) => (
                      <article
                        key={application.application_id}
                        className="rounded-xl border border-slate-200 p-4 transition hover:border-teal-200 dark:border-white/[0.07] dark:bg-white/[0.02] dark:hover:border-white/[0.16] dark:hover:bg-white/[0.035]"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0b2545] dark:text-white">
                              {application.loan_type
                                ? formatStatus(application.loan_type)
                                : "Loan application"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                              Application #{application.application_id}
                            </p>
                          </div>
                          <StatusBadge status={application.application_status} />
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-zinc-500">
                              Amount requested
                            </p>
                            <p className="mt-1 font-semibold text-slate-800 dark:text-zinc-100">
                              {formatCurrency(application.amount_requested)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-zinc-500">
                              Submitted on
                            </p>
                            <p className="mt-1 text-sm text-slate-700 dark:text-zinc-300">
                              {formatDate(application.application_date)}
                            </p>
                          </div>
                        </div>

                        {application.loan_purpose && (
                          <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-5 text-slate-500 dark:border-white/[0.06] dark:text-zinc-400">
                            Purpose: {application.loan_purpose}
                          </p>
                        )}
                      </article>
                    ))}

                    {applications.length > 5 && (
                      <p className="pt-2 text-center text-sm text-slate-500 dark:text-zinc-400">
                        Showing 5 of {applications.length} applications.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-5">
                  <Link
                    href="/member/loans"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 dark:text-zinc-200 dark:hover:text-white"
                  >
                    View my loans
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>

              <div className={`${cardSurface} p-6`}>
                <h2 className="font-semibold text-[#0b2545] dark:text-white">
                  Account information
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                  Your account at a glance.
                </p>

                <div className="mt-6 space-y-5">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={19}
                      className="mt-0.5 shrink-0 text-teal-600 dark:text-zinc-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                        Account access
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">
                        Member portal
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-teal-600 dark:text-zinc-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                        Loan tracking
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">
                        {loading
                          ? "Loading application status..."
                          : `${totalApplications} application${
                              totalApplications === 1 ? "" : "s"
                            } recorded, with ${
                              summary?.approved_applications ?? 0
                            } approved.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <CircleDollarSign
                      size={19}
                      className="mt-0.5 shrink-0 text-teal-600 dark:text-zinc-400"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                        Repayment records
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-zinc-400">
                        {loading
                          ? "Loading repayment records..."
                          : `${repayments.length} repayment transaction${
                              repayments.length === 1 ? "" : "s"
                            } recorded.`}
                      </p>
                      <Link
                        href="/member/repayments"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline dark:text-zinc-200"
                      >
                        View repayments
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className={`${cardSurface} p-6`}>
              <div className="flex items-center gap-3">
                <div className={iconTile}>
                  <HandCoins size={21} />
                </div>
                <div>
                  <h2 className="font-semibold text-[#0b2545] dark:text-white">
                    My loans
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Approved loans, including completed loans.
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                  Loading loan records...
                </p>
              ) : loans.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                  No loan records are linked to your account yet.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                        <th className="px-3 py-3 font-medium">Loan</th>
                        <th className="px-3 py-3 font-medium">Approved amount</th>
                        <th className="px-3 py-3 font-medium">Outstanding</th>
                        <th className="px-3 py-3 font-medium">Disbursement</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.map((loan) => (
                        <tr
                          key={loan.loan_id}
                          className="border-b border-slate-100 last:border-0 dark:border-white/[0.05]"
                        >
                          <td className="px-3 py-4 font-medium text-[#0b2545] dark:text-white">
                            #{loan.loan_id}
                          </td>
                          <td className="px-3 py-4">
                            {formatCurrency(loan.amount_approved)}
                          </td>
                          <td className="px-3 py-4">
                            {formatCurrency(loan.outstanding_balance)}
                          </td>
                          <td className="px-3 py-4">
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
            </section>

            <section className={`${cardSurface} p-6`}>
              <div className="flex items-center gap-3">
                <div className={iconTile}>
                  <Wallet size={21} />
                </div>
                <div>
                  <h2 className="font-semibold text-[#0b2545] dark:text-white">
                    Recent repayments
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Payments recorded against your loans.
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                  Loading repayment records...
                </p>
              ) : repayments.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                  No repayment transactions have been recorded yet.
                </p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                        <th className="px-3 py-3 font-medium">Payment</th>
                        <th className="px-3 py-3 font-medium">Loan</th>
                        <th className="px-3 py-3 font-medium">Date</th>
                        <th className="px-3 py-3 font-medium">Amount paid</th>
                        <th className="px-3 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repayments.slice(0, 5).map((repayment) => (
                        <tr
                          key={repayment.repayment_id}
                          className="border-b border-slate-100 last:border-0 dark:border-white/[0.05]"
                        >
                          <td className="px-3 py-4 font-medium text-[#0b2545] dark:text-white">
                            #{repayment.repayment_id}
                          </td>
                          <td className="px-3 py-4">
                            #{repayment.loan_id}
                          </td>
                          <td className="px-3 py-4">
                            {formatDate(repayment.payment_date)}
                          </td>
                          <td className="px-3 py-4 font-medium">
                            {formatCurrency(repayment.amount_paid)}
                          </td>
                          <td className="px-3 py-4">
                            <StatusBadge status={repayment.payment_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {repayments.length > 5 && (
                    <p className="mt-3 text-center text-xs text-slate-500 dark:text-zinc-400">
                      Showing 5 of {repayments.length} repayment transactions.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5">
                <Link
                  href="/member/repayments"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 dark:text-zinc-200 dark:hover:text-white"
                >
                  View all repayments
                  <ArrowUpRight size={16} />
                </Link>
              </div>
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
