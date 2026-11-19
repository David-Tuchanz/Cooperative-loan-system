"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";

import {
  Badge,
  DetailBlock,
  Drawer,
  EmptyNote,
  Pagination,
  StatCard,
  cardSurface,
  errorBox,
  fetchJson,
  fieldClass,
  fmtDate,
  fmtDateTime,
  naira,
  paginate,
  pillButton,
  titleCase,
} from "@/components/loan-officer/officer-ui";

type RepaymentRecord = {
  repayment_id: number;
  loan_id: number;
  payment_date: string | null;
  amount_paid: number;
  payment_method: string | null;
  payment_status: string | null;
  remaining_balance: number | null;
  recorded_by: number | null;
  created_at: string | null;

  member_id: number;
  member_name: string;
  member_phone: string | null;

  loan_status: string | null;
  loan_type: string | null;
  loan_purpose: string | null;
  amount_approved: number | null;

  recorded_by_name: string | null;
};

type RepaymentResponse = {
  count: number;
  repayments: RepaymentRecord[];
};

const STATUS_TABS = [
  { value: "all", label: "All payments" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const paymentDate = (item: RepaymentRecord) =>
  new Date(item.payment_date ?? 0).getTime();

const SORTERS: Record<
  string,
  (a: RepaymentRecord, b: RepaymentRecord) => number
> = {
  newest: (a, b) =>
    paymentDate(b) - paymentDate(a) ||
    b.repayment_id - a.repayment_id,

  oldest: (a, b) =>
    paymentDate(a) - paymentDate(b) ||
    a.repayment_id - b.repayment_id,

  highest: (a, b) => b.amount_paid - a.amount_paid,

  lowest: (a, b) => a.amount_paid - b.amount_paid,
};

function RepaymentDrawer({
  repayment,
  onClose,
}: {
  repayment: RepaymentRecord;
  onClose: () => void;
}) {
  return (
    <Drawer
      eyebrow={`Repayment #${repayment.repayment_id}`}
      title="Payment details"
      subtitle={`Loan #${repayment.loan_id}`}
      onClose={onClose}
    >
      <section className={`${cardSurface} p-5`}>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Amount paid
        </p>

        <p className="mt-2 text-3xl font-semibold text-[#0b2545] dark:text-white">
          {naira(repayment.amount_paid)}
        </p>

        <div className="mt-4">
          <Badge value={repayment.payment_status} />
        </div>
      </section>

      <DetailBlock
        title="Payment information"
        items={[
          {
            label: "Repayment ID",
            value: `#${repayment.repayment_id}`,
          },
          {
            label: "Loan ID",
            value: `#${repayment.loan_id}`,
          },
          {
            label: "Payment date",
            value: fmtDate(repayment.payment_date),
          },
          {
            label: "Payment method",
            value: titleCase(repayment.payment_method),
          },
          {
            label: "Remaining balance",
            value: naira(repayment.remaining_balance),
          },
          {
            label: "Recorded on",
            value: fmtDateTime(repayment.created_at),
          },
        ]}
      />

      <DetailBlock
        title="Member information"
        items={[
          {
            label: "Member name",
            value: repayment.member_name || "Not available",
          },
          {
            label: "Member ID",
            value: `#${repayment.member_id}`,
          },
          {
            label: "Phone number",
            value: repayment.member_phone || "Not available",
          },
        ]}
      />

      <DetailBlock
        title="Loan information"
        items={[
          {
            label: "Loan type",
            value: titleCase(repayment.loan_type),
          },
          {
            label: "Loan purpose",
            value: repayment.loan_purpose || "Not available",
          },
          {
            label: "Approved amount",
            value: naira(repayment.amount_approved),
          },
          {
            label: "Loan status",
            value: <Badge value={repayment.loan_status} />,
          },
        ]}
      />

      <DetailBlock
        title="Recorded by"
        items={[
          {
            label: "Officer",
            value: repayment.recorded_by_name || "Not available",
          },
          {
            label: "User ID",
            value:
              repayment.recorded_by !== null
                ? `#${repayment.recorded_by}`
                : "Not available",
          },
        ]}
      />
    </Drawer>
  );
}

export default function RepaymentsClient() {
  const [repayments, setRepayments] = useState<RepaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<RepaymentRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const body = await fetchJson<RepaymentResponse>(
        "/api/repayments",
        "repayments"
      );

      setRepayments(body.repayments ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load repayments."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const result: Record<string, number> = {
      all: repayments.length,
      completed: 0,
      pending: 0,
      failed: 0,
    };

    for (const repayment of repayments) {
      const value = repayment.payment_status ?? "";

      if (value in result) {
        result[value] += 1;
      }
    }

    return result;
  }, [repayments]);

  const totalCollected = useMemo(
    () =>
      repayments
        .filter((r) => r.payment_status === "completed")
        .reduce((sum, r) => sum + (r.amount_paid ?? 0), 0),
    [repayments]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return repayments
      .filter((r) => {
        if (status !== "all" && r.payment_status !== status) {
          return false;
        }

        if (!needle) return true;

        return [
          r.repayment_id,
          r.loan_id,
          r.member_id,
          r.member_name,
          r.member_phone,
          r.payment_method,
          r.recorded_by_name,
          r.loan_type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort(SORTERS[sort]);
  }, [repayments, status, search, sort]);

  const pageInfo = paginate(filtered, page, pageSize);

  const show = (value: React.ReactNode) =>
    loading && repayments.length === 0 ? "..." : value;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b2545] dark:text-white">
            Repayments
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            Monitor recorded loan payments and repayment history.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
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

      {/* Error */}
      {error && (
        <div role="alert" className={errorBox}>
          <p>{error}</p>

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

      {/* Summary cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Repayments"
          value={show(repayments.length)}
          detail="All recorded payment transactions"
          icon={Wallet}
        />

        <StatCard
          label="Total Collected"
          value={show(naira(totalCollected))}
          detail="Successful payments received"
          icon={CheckCircle2}
        />

        <StatCard
          label="Completed Payments"
          value={show(counts.completed)}
          detail="Successfully recorded payments"
          icon={CheckCircle2}
        />

        <StatCard
          label="Pending / Failed"
          value={show(counts.pending + counts.failed)}
          detail={`${counts.pending} pending, ${counts.failed} failed`}
          icon={AlertCircle}
        />
      </section>

      {/* Status filters */}
      <div className="overflow-x-auto">
        <div
          role="tablist"
          aria-label="Filter repayments by status"
          className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-white/[0.07] dark:bg-[#0c0c0e]"
        >
          {STATUS_TABS.map((tab) => {
            const active = status === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition ${
                  active
                    ? "bg-teal-50 font-semibold text-teal-800 dark:bg-white/[0.06] dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#0b2545] dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
                }`}
              >
                {tab.label}

                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-white/[0.08] dark:text-zinc-300">
                  {counts[tab.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Repayments table */}
      <section className={`${cardSurface} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-white/[0.07]">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
            />

            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search member, loan, method..."
              aria-label="Search repayments"
              className={`${fieldClass} w-full pl-9`}
            />
          </div>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            aria-label="Sort repayments"
            className={fieldClass}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount first</option>
            <option value="lowest">Lowest amount first</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Loan</th>
                <th className="px-5 py-3 font-medium">Amount paid</th>
                <th className="px-5 py-3 font-medium">Payment date</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading && repayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-slate-500 dark:text-zinc-400"
                  >
                    Loading repayments...
                  </td>
                </tr>
              ) : pageInfo.visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12">
                    <EmptyNote
                      text={
                        repayments.length === 0
                          ? "No repayment records found."
                          : "No repayments match these filters."
                      }
                    />
                  </td>
                </tr>
              ) : (
                pageInfo.visible.map((r) => (
                  <tr
                    key={r.repayment_id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800 dark:text-zinc-100">
                        {r.member_name || `Member #${r.member_id}`}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-zinc-500">
                        Member #{r.member_id}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700 dark:text-zinc-200">
                        Loan #{r.loan_id}
                      </p>

                      <p className="text-xs text-slate-500 dark:text-zinc-500">
                        {titleCase(r.loan_type)}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700 dark:text-zinc-200">
                      {naira(r.amount_paid)}
                    </td>

                    <td className="px-5 py-4 text-slate-600 dark:text-zinc-300">
                      {fmtDate(r.payment_date)}
                    </td>

                    <td className="px-5 py-4 text-slate-600 dark:text-zinc-300">
                      {titleCase(r.payment_method)}
                    </td>

                    <td className="px-5 py-4">
                      <Badge value={r.payment_status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(r);
                        }}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/[0.1] dark:text-zinc-300 dark:hover:bg-white/[0.05]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          total={filtered.length}
          unfilteredTotal={repayments.length}
          info={pageInfo}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      {/* Repayment details */}
      {selected && (
        <RepaymentDrawer
          repayment={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}