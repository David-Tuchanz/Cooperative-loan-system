"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Search } from "lucide-react";
import {
  Badge,
  NA,
  Pagination,
  cardSurface,
  errorBox,
  fetchJson,
  fieldClass,
  fmtDate,
  fmtPercent,
  naira,
  paginate,
  pillButton,
  primaryButton,
  rowButton,
  titleCase,
  waitingLabel,
} from "@/components/loan-officer/officer-ui";
import ReviewDrawer, { type AppRecord } from "./review-drawer";

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const time = (a: AppRecord) => new Date(a.application_date ?? 0).getTime();

const SORTERS: Record<string, (a: AppRecord, b: AppRecord) => number> = {
  oldest: (a, b) => time(a) - time(b),
  newest: (a, b) => time(b) - time(a),
  risk: (a, b) => (b.latest_default_probability ?? -1) - (a.latest_default_probability ?? -1),
  amount: (a, b) => (b.amount_requested ?? 0) - (a.amount_requested ?? 0),
};

export default function ApplicationsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [applications, setApplications] = useState<AppRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState("pending");
  const [risk, setRisk] = useState("all");
  const [sort, setSort] = useState("oldest");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deepLinkId, setDeepLinkId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const body = await fetchJson<{ applications: AppRecord[] }>("/api/officer/applications", "applications");
      setApplications(body.applications ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep link: ?id=12 opens that application once the list has loaded.
  useEffect(() => {
    const id = Number(searchParams.get("id"));
    if (!id) return;
    setDeepLinkId(id);
    router.replace(pathname);
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (deepLinkId === null || loading) return;

    const match = applications.find((a) => a.application_id === deepLinkId);
    if (match) {
      setStatus("all");
      setSelectedId(deepLinkId);
    } else if (!error) {
      setError(`Application #${deepLinkId} was not found.`);
    }
    setDeepLinkId(null);
  }, [deepLinkId, loading, applications, error]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: applications.length };
    for (const a of applications) {
      const s = a.application_status ?? "";
      map[s] = (map[s] ?? 0) + 1;
    }
    return map;
  }, [applications]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return applications
      .filter((a) => {
        if (status !== "all" && a.application_status !== status) return false;

        if (risk !== "all") {
          const level = (a.latest_risk_level ?? "").toLowerCase();
          if (risk === "unscored" ? level !== "" : level !== risk) return false;
        }

        if (!needle) return true;
        return [a.application_id, a.member_name, a.loan_type, a.loan_purpose, a.submitted_by_username]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort(SORTERS[sort]);
  }, [applications, status, risk, sort, search]);

  const pageInfo = paginate(filtered, page, pageSize);
  const selected = applications.find((a) => a.application_id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b2545] dark:text-white">Applications</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            Review loan applications, check risk and decide.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className={pillButton}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link href="/loan-officer/applications/new" className={primaryButton}>
            <Plus size={17} />
            New application
          </Link>
        </div>
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
                onClick={() => { setStatus(t.value); setPage(1); }}
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by member, type, purpose..."
              aria-label="Search applications"
              className={`${fieldClass} w-full pl-9`}
            />
          </div>
          <select value={risk} onChange={(e) => { setRisk(e.target.value); setPage(1); }} aria-label="Risk level" className={fieldClass}>
            <option value="all">All risk levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="unscored">Not scored</option>
          </select>
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sort by" className={fieldClass}>
            <option value="oldest">Oldest first</option>
            <option value="newest">Newest first</option>
            <option value="risk">Highest risk first</option>
            <option value="amount">Largest amount first</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Risk</th>
                <th className="px-5 py-3 font-medium">Applied</th>
                <th className="px-5 py-3 font-medium">Via</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading && applications.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500 dark:text-zinc-400">Loading applications...</td></tr>
              ) : pageInfo.visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 dark:text-zinc-400">
                    {applications.length === 0 ? "No applications yet." : "No applications match these filters."}
                  </td>
                </tr>
              ) : (
                pageInfo.visible.map((a) => (
                  <tr
                    key={a.application_id}
                    onClick={() => setSelectedId(a.application_id)}
                    className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800 dark:text-zinc-100">{a.member_name || `Member #${a.member_id}`}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-500">#{a.application_id} · {titleCase(a.loan_type)}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-zinc-300">{naira(a.amount_requested)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Badge value={a.latest_risk_level} fallback="Not scored" />
                        {a.latest_default_probability != null && (
                          <span className="text-xs tabular-nums text-slate-500 dark:text-zinc-500">{fmtPercent(a.latest_default_probability, 100)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-600 dark:text-zinc-300">{fmtDate(a.application_date)}</p>
                      {a.application_status === "pending" && (
                        <p className="text-xs text-slate-500 dark:text-zinc-500">Waiting {waitingLabel(a.application_date)}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-zinc-500">{a.submission_method ? titleCase(a.submission_method) : NA}</td>
                    <td className="px-5 py-4"><Badge value={a.application_status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(a.application_id); }}
                        className={rowButton}
                      >
                        {a.application_status === "pending" ? "Review" : "View"}
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
          unfilteredTotal={applications.length}
          info={pageInfo}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(size) => { setPageSize(size); setPage(1); }}
        />
      </section>

      {selected && (
        <ReviewDrawer
          key={selected.application_id}
          application={selected}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}