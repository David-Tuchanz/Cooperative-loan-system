"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, HandCoins, RefreshCw, Search, Wallet } from "lucide-react";
import {
  Badge,
  Pagination,
  StatCard,
  cardSurface,
  errorBox,
  fetchJson,
  fieldClass,
  fmtDate,
  naira,
  paginate,
  pillButton,
  rowButton,
  titleCase,
} from "@/components/loan-officer/officer-ui";
import { repaidShare, type LoanRecord } from "@/components/loan-officer/loan-data";
import LoanDrawer from "./loan-drawer";

const STATUS_TABS = [
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "defaulted", label: "Defaulted" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

const disbursed = (l: LoanRecord) => new Date(l.disbursement_date ?? 0).getTime();

const SORTERS: Record<string, (a: LoanRecord, b: LoanRecord) => number> = {
  newest: (a, b) => disbursed(b) - disbursed(a) || b.loan_id - a.loan_id,
  oldest: (a, b) => disbursed(a) - disbursed(b) || a.loan_id - b.loan_id,
  balance: (a, b) => (b.outstanding_balance ?? 0) - (a.outstanding_balance ?? 0),
  amount: (a, b) => (b.amount_approved ?? 0) - (a.amount_approved ?? 0),
};

function RepaidBar({ loan }: { loan: LoanRecord }) {
  const share = repaidShare(loan);
  if (share === null) return null;

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
        <div className="h-full rounded-full bg-teal-600 dark:bg-zinc-300" style={{ width: `${Math.round(share * 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-slate-500 dark:text-zinc-500">{Math.round(share * 100)}% repaid</span>
    </div>
  );
}

export default function LoansClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deepLinkId, setDeepLinkId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const body = await fetchJson<{ loans: LoanRecord[] }>("/api/officer/loans", "loans");
      setLoans(body.loans ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load loans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep link: ?id=12 opens that loan once the list has loaded.
  useEffect(() => {
    const id = Number(searchParams.get("id"));
    if (!id) return;
    setDeepLinkId(id);
    router.replace(pathname);
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (deepLinkId === null || loading) return;

    const match = loans.find((l) => l.loan_id === deepLinkId);
    if (match) {
      setStatus("all");
      setSelectedId(deepLinkId);
    } else if (!error) {
      setError(`Loan #${deepLinkId} was not found.`);
    }
    setDeepLinkId(null);
  }, [deepLinkId, loading, loans, error]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: loans.length };
    for (const l of loans) {
      const s = l.loan_status ?? "";
      map[s] = (map[s] ?? 0) + 1;
    }
    return map;
  }, [loans]);

  const outstandingTotal = useMemo(
    () => loans.reduce((sum, l) => sum + (l.outstanding_balance ?? 0), 0),
    [loans]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return loans
      .filter((l) => {
        if (status !== "all" && l.loan_status !== status) return false;
        if (!needle) return true;
        return [l.loan_id, l.application_id, l.member_name, l.loan_type, l.loan_purpose]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort(SORTERS[sort]);
  }, [loans, status, sort, search]);

  const pageInfo = paginate(filtered, page, pageSize);
  const selected = loans.find((l) => l.loan_id === selectedId) ?? null;
  const show = (value: React.ReactNode) => (loading && loans.length === 0 ? "..." : value);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b2545] dark:text-white">Loans</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            Track disbursed loans, update their status and record repayments.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className={pillButton}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </section>

      {error && (
        <div role="alert" className={errorBox}>
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-2">
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Loans" value={show(counts.active ?? 0)} detail="Loans currently being repaid" icon={HandCoins} />
        <StatCard label="Outstanding Balance" value={show(naira(outstandingTotal))} detail="Remaining across all loans" icon={Wallet} />
        <StatCard label="Overdue Loans" value={show(counts.overdue ?? 0)} detail={`${counts.defaulted ?? 0} defaulted`} icon={AlertTriangle} />
        <StatCard label="Completed Loans" value={show(counts.completed ?? 0)} detail="Fully repaid" icon={CheckCircle2} />
      </section>

      <div className="overflow-x-auto">
        <div role="tablist" className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-white/[0.07] dark:bg-[#0c0c0e]">
          {STATUS_TABS.map((t) => {
            const active = status === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setStatus(t.value);
                  setPage(1);
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition ${
                  active
                    ? "bg-teal-50 font-semibold text-teal-800 dark:bg-white/[0.06] dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#0b2545] dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
                }`}
              >
                {t.label}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-white/[0.08] dark:text-zinc-300">
                  {counts[t.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className={`${cardSurface} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-white/[0.07]">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by member, loan number, type..."
              aria-label="Search loans"
              className={`${fieldClass} w-full pl-9`}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            aria-label="Sort by"
            className={fieldClass}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="balance">Highest balance first</option>
            <option value="amount">Largest amount first</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Approved</th>
                <th className="px-5 py-3 font-medium">Outstanding</th>
                <th className="px-5 py-3 font-medium">Disbursed</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading && loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 dark:text-zinc-400">
                    Loading loans...
                  </td>
                </tr>
              ) : pageInfo.visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500 dark:text-zinc-400">
                    {loans.length === 0
                      ? "No loans yet. Loans appear here after an application is approved."
                      : "No loans match these filters."}
                  </td>
                </tr>
              ) : (
                pageInfo.visible.map((l) => (
                  <tr
                    key={l.loan_id}
                    onClick={() => setSelectedId(l.loan_id)}
                    className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800 dark:text-zinc-100">{l.member_name || `Member #${l.member_id}`}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-500">
                        Loan #{l.loan_id} · {titleCase(l.loan_type)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-zinc-300">{naira(l.amount_approved)}</td>
                    <td className="px-5 py-4">
                      <p className="text-slate-600 dark:text-zinc-300">{naira(l.outstanding_balance)}</p>
                      <RepaidBar loan={l} />
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600 dark:text-zinc-300">{fmtDate(l.disbursement_date)}</td>
                    <td className="px-5 py-4">
                      <Badge value={l.loan_status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(l.loan_id);
                        }}
                        className={rowButton}
                      >
                        Open
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
          unfilteredTotal={loans.length}
          info={pageInfo}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      {selectedId !== null && (
        <LoanDrawer
          key={selectedId}
          loanId={selectedId}
          summary={selected}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}