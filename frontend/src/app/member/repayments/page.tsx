
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  HandCoins,
  Home,
  Image,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  Wallet,
  XCircle,
  Download,
  Eye,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { MemberAvatar } from "@/components/member-avatar";
import { apiFetch } from "@/lib/api";
import MemberNotifications from "@/components/member-notifications";

type Member = {
  username?: string;
  name?: string;
  profile_picture_url?: string | null;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

type Repayment = {
  repayment_id: number;
  loan_id: number;
  payment_date: string;
  amount_paid: number | string;
  payment_method?: string | null;
  payment_status?: string | null;
  remaining_balance?: number | string | null;
  created_at?: string | null;
};

type Loan = {
  loan_id: number;
  application_id: number;
  amount_approved: number | string;
  amount_due: number | string | null;
  outstanding_balance: number | string | null;
  loan_status: string;
  repayments: Repayment[];
};

type DashboardResponse = {
  member: Member;
  loans: Loan[];
  repayments: Repayment[];
  message?: string;
};

type RepaymentRow = Repayment & {
  member_name: string;
  amount_due: number | null;
  outstanding_balance: number | null;
  loan_status: string;
};

type PaymentFilter = "all" | "completed" | "pending" | "failed";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const PAGE_SIZE = 8;

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

function numericValue(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

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

function normalizeStatus(status?: string | null) {
  return status?.toLowerCase().trim().replace(/[\s-]+/g, "_") || "";
}

function formatStatus(status?: string | null) {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function paymentStatusStyle(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === "completed") {
    return {
      pill:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/[0.08] dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  }

  if (normalized === "failed") {
    return {
      pill:
        "bg-red-50 text-red-700 dark:bg-red-400/[0.08] dark:text-red-300",
      dot: "bg-red-500",
    };
  }

  if (normalized === "pending") {
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
  const style = paymentStatusStyle(status);

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

function DoughnutChart({ rows }: { rows: RepaymentRow[] }) {
  const segments = [
    {
      label: "Completed",
      count: rows.filter(
        (row) => normalizeStatus(row.payment_status) === "completed"
      ).length,
      color: "#0d9488",
    },
    {
      label: "Pending",
      count: rows.filter(
        (row) => normalizeStatus(row.payment_status) === "pending"
      ).length,
      color: "#d97706",
    },
    {
      label: "Failed",
      count: rows.filter(
        (row) => normalizeStatus(row.payment_status) === "failed"
      ).length,
      color: "#dc2626",
    },
  ];

  const total = rows.length;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  const chartSegments = segments.map((segment) => {
    const length =
      total > 0 ? (segment.count / total) * circumference : 0;
    const offset = accumulated;
    accumulated += length;

    return { ...segment, length, offset };
  });

  return (
    <article className={`${cardSurface} p-5 sm:p-6`}>
      <div>
        <h2 className="font-semibold text-[#0b2545] dark:text-white">
          Payment status breakdown
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Status of your recorded repayment transactions.
        </p>
      </div>

      {total === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center text-center">
          <Wallet size={28} className="text-slate-400 dark:text-zinc-500" />
          <p className="mt-3 text-sm font-medium">No repayment data yet</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Your payment breakdown will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          <div className="relative h-44 w-44 shrink-0">
            <svg
              viewBox="0 0 100 100"
              className="h-full w-full -rotate-90"
              role="img"
              aria-label={`${total} repayment transactions`}
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
                    strokeDasharray={`${segment.length} ${
                      circumference - segment.length
                    }`}
                    strokeDashoffset={-segment.offset}
                  />
                ) : null
              )}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-[#0b2545] dark:text-white">
                {total}
              </span>
              <span className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Transactions
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

function RepaymentTrendChart({ rows }: { rows: RepaymentRow[] }) {
  const monthlyData = useMemo(() => {
    const months = new Map<string, number>();

    rows.forEach((row) => {
      if (!row.payment_date) return;

      const date = new Date(row.payment_date);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      months.set(
        key,
        (months.get(key) || 0) +
          (normalizeStatus(row.payment_status) === "completed"
            ? numericValue(row.amount_paid)
            : 0)
      );
    });

    return [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, amount]) => {
        const [year, month] = key.split("-").map(Number);
        const label = new Date(year, month - 1, 1).toLocaleDateString(
          "en-GB",
          { month: "short", year: "2-digit" }
        );

        return { key, label, amount };
      });
  }, [rows]);

  const width = 520;
  const height = 210;
  const paddingX = 30;
  const paddingTop = 20;
  const paddingBottom = 36;
  const plotHeight = height - paddingTop - paddingBottom;
  const plotWidth = width - paddingX * 2;
  const maxAmount = Math.max(
    1,
    ...monthlyData.map((item) => item.amount)
  );

  const points = monthlyData.map((item, index) => {
    const x =
      monthlyData.length === 1
        ? width / 2
        : paddingX +
          (index / (monthlyData.length - 1)) * plotWidth;
    const y =
      paddingTop + plotHeight - (item.amount / maxAmount) * plotHeight;

    return { ...item, x, y };
  });

  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <article className={`${cardSurface} p-5 sm:p-6`}>
      <div>
        <h2 className="font-semibold text-[#0b2545] dark:text-white">
          Repayment trends
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Completed payments grouped by month.
        </p>
      </div>

      {monthlyData.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center text-center">
          <CalendarDays
            size={28}
            className="text-slate-400 dark:text-zinc-500"
          />
          <p className="mt-3 text-sm font-medium">No trend data available</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Payment trends will appear after repayments are recorded.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full"
              role="img"
              aria-label="Monthly completed repayment amounts"
            >
              {[0, 1, 2, 3].map((step) => {
                const y = paddingTop + (plotHeight / 3) * step;

                return (
                  <line
                    key={step}
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.12"
                    strokeDasharray="4 5"
                  />
                );
              })}

              {points.length > 1 && (
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {points.map((point) => (
                <g key={point.key}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4.5"
                    fill="#0d9488"
                    stroke="currentColor"
                    strokeOpacity="0.15"
                    strokeWidth="1"
                  />
                  <text
                    x={point.x}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fill="currentColor"
                    opacity="0.7"
                  >
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="mt-2 space-y-2">
            {monthlyData.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <span className="text-slate-500 dark:text-zinc-400">
                  {item.label}
                </span>
                <span className="font-medium text-[#0b2545] dark:text-white">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </article>
  );
}

export default function MemberRepaymentsPage() {
  const [selectedReceipt, setSelectedReceipt] =
  useState<RepaymentRow | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  const [exportError, setExportError] = useState("");  
  const [member, setMember] = useState<Member | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rows, setRows] = useState<RepaymentRow[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const loadRepayments = useCallback(async () => {
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
        setRows([]);
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load your repayment records."
        );
      }

      const memberName =
        data.member?.full_name ||
        [data.member?.first_name, data.member?.last_name]
          .filter(Boolean)
          .join(" ") ||
        data.member?.name ||
        data.member?.username ||
        "Member";

      const loanList = data.loans ?? [];
      setLoans(loanList);

      const loanMap = new Map(
        loanList.map((loan) => [loan.loan_id, loan])
      );

      // Use the endpoint's repayment list, with loan-level repayments
      // as a fallback if the top-level list is missing.
      const repayments =
        data.repayments ??
        loanList.flatMap((loan) => loan.repayments ?? []);

      const uniqueRepayments = Array.from(
        new Map(
          repayments.map((repayment) => [
            repayment.repayment_id,
            repayment,
          ])
        ).values()
      );

      const repaymentRows: RepaymentRow[] = uniqueRepayments.map(
        (repayment) => {
          const loan = loanMap.get(repayment.loan_id);

          return {
            ...repayment,
            member_name: memberName,
            amount_due:
              loan?.amount_due === null ||
              loan?.amount_due === undefined
                ? null
                : numericValue(loan.amount_due),
            outstanding_balance:
              loan?.outstanding_balance === null ||
              loan?.outstanding_balance === undefined
                ? null
                : numericValue(loan.outstanding_balance),
            loan_status: loan?.loan_status || "unknown",
          };
        }
      );

      setRows(
        repaymentRows.sort((a, b) => {
          const dateDifference =
            new Date(b.payment_date).getTime() -
            new Date(a.payment_date).getTime();

          return (
            (Number.isFinite(dateDifference) ? dateDifference : 0) ||
            b.repayment_id - a.repayment_id
          );
        })
      );

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

    void loadRepayments();
  }, [loadRepayments]);

  const displayName =
    member?.full_name ||
    member?.name ||
    [member?.first_name, member?.last_name].filter(Boolean).join(" ") ||
    member?.username ||
    "Member";

  const username = member?.username || "Member";

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const completedRows = useMemo(
    () =>
      rows.filter(
        (row) => normalizeStatus(row.payment_status) === "completed"
      ),
    [rows]
  );

  const totalRepaid = completedRows.reduce(
    (total, row) => total + numericValue(row.amount_paid),
    0
  );

  const totalOutstanding = loans.reduce(
    (total, loan) => total + numericValue(loan.outstanding_balance),
    0
  );

  const overdueLoans = loans.filter(
    (loan) => normalizeStatus(loan.loan_status) === "overdue"
  ).length;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        String(row.loan_id).includes(query) ||
        String(row.repayment_id).includes(query) ||
        row.member_name.toLowerCase().includes(query) ||
        (row.payment_method || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        normalizeStatus(row.payment_status) === statusFilter;

      // ISO YYYY-MM-DD dates sort chronologically as strings.
      const matchesStart =
        !startDate || row.payment_date >= startDate;
      const matchesEnd =
        !endDate || row.payment_date <= endDate;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesStart &&
        matchesEnd
      );
    });
  }, [rows, search, statusFilter, startDate, endDate]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );

  const safePage = Math.min(page, totalPages);

  const paginatedRows = filteredRows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, startDate, endDate]);

  function signOut() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("current_user");
    window.location.href = "/login";
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  async function exportReceipt(format: "pdf" | "png") {
  if (!receiptRef.current || !selectedReceipt) return;

  try {
    setExporting(format);
    setExportError("");

    const imageData = await toPng(receiptRef.current, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });

    const repaymentId = selectedReceipt.repayment_id;

    if (format === "png") {
      const link = document.createElement("a");
      link.download = `CONCORD-Receipt-${repaymentId}.png`;
      link.href = imageData;
      link.click();
      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight =
      (receiptRef.current.offsetHeight / receiptRef.current.offsetWidth) *
      imageWidth;

    const finalWidth = imageHeight > pageHeight - margin * 2
      ? imageWidth * ((pageHeight - margin * 2) / imageHeight)
      : imageWidth;

    const finalHeight =
      (receiptRef.current.offsetHeight / receiptRef.current.offsetWidth) *
      finalWidth;

    pdf.addImage(
      imageData,
      "PNG",
      (pageWidth - finalWidth) / 2,
      margin,
      finalWidth,
      finalHeight
    );

    pdf.save(`CONCORD-Receipt-${repaymentId}.pdf`);
  } catch (err) {
    console.error("Receipt export failed:", err);
    setExportError(
      "Unable to generate the receipt. Please try again."
    );
  } finally {
    setExporting(null);
  }
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
              const active = item.label === "Repayments";

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
                Repayments
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

          <div className="mx-auto max-w-7xl space-y-6 px-5 py-8 sm:px-8">
            <section className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-[#0b2545] dark:text-white">
                  Repayment history
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                  Review your payments and track the balances on your loans.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadRepayments()}
                disabled={loading}
                className={pillButton}
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (error.toLowerCase().includes("session has expired")) {
                      signOut();
                    } else {
                      void loadRepayments();
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

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total Repaid",
                  value: formatCurrency(totalRepaid),
                  detail: "Completed payment transactions",
                  icon: CircleDollarSign,
                },
                {
                  label: "Outstanding Balance",
                  value: formatCurrency(totalOutstanding),
                  detail: "Remaining balance across your loans",
                  icon: Wallet,
                },
                {
                  label: "Completed Payments",
                  value: completedRows.length,
                  detail: "Transactions marked completed",
                  icon: CheckCircle2,
                },
                {
                  label: "Overdue Loans",
                  value: overdueLoans,
                  detail: "Loans marked overdue by the system",
                  icon: Clock3,
                },
              ].map((card) => {
                const Icon = card.icon;

                return (
                  <article key={card.label} className={`${cardSurface} p-5`}>
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
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <DoughnutChart rows={loading ? [] : rows} />
              <RepaymentTrendChart rows={loading ? [] : rows} />
            </section>

            <section className={`${cardSurface} p-5 sm:p-6`}>
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <h2 className="font-semibold text-[#0b2545] dark:text-white">
                    All repayments
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    Search and filter your recorded payment transactions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className={pillButton}
                >
                  <XCircle size={15} />
                  Clear filters
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="relative block xl:col-span-2">
                  <span className="sr-only">
                    Search by member, loan ID, repayment ID, or method
                  </span>
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search member, loan ID, or method..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-teal-400"
                  />
                </label>

                <label className="block">
                  <span className="sr-only">Filter by payment status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as PaymentFilter)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-600 dark:border-white/[0.1] dark:bg-[#111113] dark:text-white"
                  >
                    <option value="all">All payment statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500 dark:text-zinc-400">
                      From
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs outline-none focus:border-teal-600 dark:border-white/[0.1] dark:bg-[#111113] dark:text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-500 dark:text-zinc-400">
                      To
                    </span>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs outline-none focus:border-teal-600 dark:border-white/[0.1] dark:bg-[#111113] dark:text-white"
                    />
                  </label>
                </div>
              </div>

              {loading ? (
                <div className="my-6 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-white/[0.14]">
                  <RefreshCw
                    size={24}
                    className="mx-auto animate-spin text-teal-600 dark:text-zinc-300"
                  />
                  <p className="mt-4 text-sm text-slate-500 dark:text-zinc-400">
                    Loading your repayment history...
                  </p>
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="my-6 rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center dark:border-white/[0.14]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-zinc-400">
                    <Wallet size={22} />
                  </div>
                  <p className="mt-4 font-medium text-slate-700 dark:text-zinc-200">
                    {rows.length === 0
                      ? "No repayment records yet"
                      : "No matching repayments"}
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-zinc-400">
                    {rows.length === 0
                      ? "Repayment transactions recorded against your loans will appear here."
                      : "Try changing your search, payment status, or date range."}
                  </p>
                  {rows.length > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 text-sm font-semibold text-teal-700 hover:text-teal-900 dark:text-teal-300 dark:hover:text-white"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                          <th className="px-3 py-3 font-medium">Member</th>
                          <th className="px-3 py-3 font-medium">Receipt</th>
                          <th className="px-3 py-3 font-medium">Loan ID</th>
                          <th className="px-3 py-3 font-medium">Amount Due</th>
                          <th className="px-3 py-3 font-medium">Amount Paid</th>
                          <th className="px-3 py-3 font-medium">Payment Date</th>
                          <th className="px-3 py-3 font-medium">Method</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedRows.map((row) => (
                          <tr
                            key={row.repayment_id}
                            className="border-b border-slate-100 last:border-0 dark:border-white/[0.05]"
                          >
                            <td className="px-3 py-4">
                              <p className="font-medium text-[#0b2545] dark:text-white">
                                {row.member_name}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                                Repayment #{row.repayment_id}
                              </p>
                            </td>
                            <td className="px-3 py-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                    setExportError("");
                                    setSelectedReceipt(row);
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg border border-teal-200 px-3 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 dark:border-white/[0.1] dark:text-teal-300 dark:hover:bg-white/[0.06]"
                                >
                                    <Eye size={14} />
                                    View Receipt
                                </button>
                            </td>
                            <td className="px-3 py-4 font-medium text-[#0b2545] dark:text-white">
                              #{row.loan_id}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              {formatCurrency(row.amount_due)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap font-medium">
                              {formatCurrency(row.amount_paid)}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              {formatDate(row.payment_date)}
                            </td>
                            <td className="px-3 py-4">
                              {row.payment_method || "Not recorded"}
                            </td>
                            <td className="px-3 py-4">
                              <StatusBadge status={row.payment_status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Showing {(safePage - 1) * PAGE_SIZE + 1} to{" "}
                      {Math.min(safePage * PAGE_SIZE, filteredRows.length)} of{" "}
                      {filteredRows.length} repayments
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((current) => current - 1)}
                        disabled={safePage <= 1}
                        className={pillButton}
                      >
                        Previous
                      </button>
                      <span className="px-2 text-sm text-slate-600 dark:text-zinc-300">
                        {safePage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((current) => current + 1)}
                        disabled={safePage >= totalPages}
                        className={pillButton}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
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
                      Keep track of payments
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-zinc-400">
                      Review recorded payments regularly and contact your loan
                      officer if a transaction needs clarification.
                    </p>
                    <Link
                      href="/member/loans"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 dark:text-zinc-200 dark:hover:text-white"
                    >
                      View my loans
                      <HandCoins size={16} />
                    </Link>
                  </div>
                </div>
              </article>

              <article className={`${cardSurface} p-6`}>
                <div className="flex items-start gap-3">
                  <div className={iconTile}>
                    <CircleDollarSign size={21} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#0b2545] dark:text-white">
                      Understand your balance
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-zinc-400">
                      Your outstanding balance is taken from your current loan
                      records. Contact your loan officer about any discrepancy.
                    </p>
                    <Link
                      href="/member/profile"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 dark:text-zinc-200 dark:hover:text-white"
                    >
                      My profile
                      <Settings size={16} />
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
       {selectedReceipt && (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
            if (event.target === event.currentTarget && !exporting) {
                setSelectedReceipt(null);
            }
            }}
        >
            <div className="my-auto w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl dark:bg-[#111113] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                <h2 className="text-lg font-semibold text-[#0b2545] dark:text-white">
                    Repayment receipt
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    Preview your transaction receipt before downloading.
                </p>
                </div>

                <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                disabled={Boolean(exporting)}
                aria-label="Close receipt"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/[0.06]"
                >
                <XCircle size={20} />
                </button>
            </div>

            <div
                ref={receiptRef}
                className="mx-auto w-full max-w-md border border-slate-200 bg-white p-6 text-slate-800 sm:p-8"
                style={{ fontFamily: "Arial, sans-serif" }}
            >
                <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
                <LogoMark className="h-12 w-12 shrink-0 text-[#0b2545]" />

                <div>
                    <h3 className="text-xl font-bold tracking-[0.16em] text-[#0b2545]">
                    CONCORD
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                    Cooperative Loan Management System
                    </p>
                </div>
                </div>

                <div className="py-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                    Repayment receipt
                </p>

                <p className="mt-3 break-words text-3xl font-bold text-[#0b2545]">
                    {formatCurrency(selectedReceipt.amount_paid)}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                    Amount recorded
                </p>

                <div className="mt-4 flex justify-center">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {formatStatus(selectedReceipt.payment_status)}
                    </span>
                </div>
                </div>

                <div className="space-y-4 border-t border-slate-200 py-5 text-sm">
                {[
                    ["Receipt number", `RCP-${selectedReceipt.repayment_id}`],
                    ["Repayment ID", `#${selectedReceipt.repayment_id}`],
                    ["Loan ID", `#${selectedReceipt.loan_id}`],
                    ["Member", selectedReceipt.member_name],
                    ["Payment date", formatDate(selectedReceipt.payment_date)],
                    ["Payment method", selectedReceipt.payment_method || "Not recorded"],
                    ["Amount due", formatCurrency(selectedReceipt.amount_due)],
                    [
                    "Remaining balance",
                    formatCurrency(selectedReceipt.remaining_balance),
                    ],
                ].map(([label, value]) => (
                    <div
                    key={label}
                    className="flex items-start justify-between gap-4"
                    >
                    <span className="shrink-0 text-slate-500">{label}</span>
                    <span className="break-words text-right font-semibold text-[#0b2545]">
                        {value}
                    </span>
                    </div>
                ))}
                </div>

                <div className="border-t border-slate-200 pt-5 text-center">
                <p className="text-xs leading-5 text-slate-500">
                    This document records a repayment transaction stored in CONCORD.
                    It is not a bank-generated payment confirmation.
                </p>
                <p className="mt-3 text-xs font-semibold tracking-wide text-teal-700">
                    Thank you for being a member of your cooperative.
                </p>
                </div>
            </div>

            {exportError && (
                <p role="alert" className="mt-4 text-sm text-red-600">
                {exportError}
                </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                type="button"
                onClick={() => void exportReceipt("pdf")}
                disabled={Boolean(exporting)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0b2545] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#12365f] disabled:opacity-50"
                >
                <Download size={16} />
                {exporting === "pdf" ? "Generating PDF..." : "Download PDF"}
                </button>

                <button
                type="button"
                onClick={() => void exportReceipt("png")}
                disabled={Boolean(exporting)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.1] dark:text-zinc-200 dark:hover:bg-white/[0.05]"
                >
                <Image size={16} />
                {exporting === "png" ? "Generating image..." : "Download Image"}
                </button>
            </div>
            </div>
        </div>
        )}
    </main>
  );
}
