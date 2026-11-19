"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  DetailBlock,
  Drawer,
  EmptyNote,
  NA,
  errorBox,
  fetchJson,
  fmtDate,
  fmtPercent,
  naira,
  primaryButton,
  readMessage,
  rowButton,
  secondaryButton,
  successBox,
  titleCase,
} from "@/components/loan-officer/officer-ui";
import {
  canRecordRepayment,
  repaidShare,
  type LoanRecord,
  type RepaymentRecord,
} from "@/components/loan-officer/loan-data";
import { RepaymentForm, type RepaymentResult } from "@/components/loan-officer/repayment-form";

type Detail = { loan: LoanRecord; repayments: RepaymentRecord[] };

type StatusAction = { to: string; label: string; warning?: string };

// Mirrors LOAN_TRANSITIONS in routes/officer.py. Completed is set by the repayment logic.
const STATUS_ACTIONS: Record<string, StatusAction[]> = {
  active: [
    { to: "overdue", label: "Mark as overdue" },
    {
      to: "defaulted",
      label: "Mark as defaulted",
      warning: "A defaulted loan can never be changed back to active or overdue.",
    },
  ],
  overdue: [
    { to: "active", label: "Mark as active" },
    {
      to: "defaulted",
      label: "Mark as defaulted",
      warning: "A defaulted loan can never be changed back to active or overdue.",
    },
  ],
  defaulted: [],
  completed: [],
};

const link = "text-teal-700 hover:underline dark:text-teal-300";

export default function LoanDrawer({
  loanId,
  summary,
  onClose,
  onChanged,
}: {
  loanId: number;
  summary: LoanRecord | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState<StatusAction | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        setDetail(await fetchJson<Detail>(`/api/officer/loans/${loanId}`, "loan details"));
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load the loan.");
      } finally {
        setLoading(false);
      }
    },
    [loanId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const loan = detail?.loan ?? summary;
  const repayments = detail?.repayments ?? [];
  const actions = STATUS_ACTIONS[loan?.loan_status ?? ""] ?? [];
  const share = loan ? repaidShare(loan) : null;

  async function changeStatus(action: StatusAction) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/api/officer/loans/${loanId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.to }),
      });

      if (!response.ok) throw new Error(await readMessage(response, "Could not update the loan status"));

      setPending(null);
      setNotice(`Loan marked as ${action.to}.`);
      await load(true);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the loan status.");
    } finally {
      setBusy(false);
    }
  }

  async function recorded(result: RepaymentResult) {
    setShowForm(false);
    setError("");
    setNotice(
      result.loan.loan_status === "completed"
        ? `Repayment of ${naira(result.repayment.amount_paid)} recorded. The loan is now fully repaid.`
        : `Repayment of ${naira(result.repayment.amount_paid)} recorded. Remaining balance: ${naira(result.repayment.remaining_balance)}.`
    );
    await load(true);
    onChanged();
  }

  return (
    <Drawer
      wide
      eyebrow={`Loan #${loanId}`}
      title={loan?.member_name || (loan ? `Member #${loan.member_id}` : "Loan")}
      subtitle={loan ? titleCase(loan.loan_type) : undefined}
      onClose={onClose}
    >
      {error && (
        <div role="alert" className={errorBox}>
          <p>{error}</p>
          {!detail && (
            <button type="button" onClick={() => void load()} className="mt-2 font-semibold underline underline-offset-2">
              Try again
            </button>
          )}
        </div>
      )}

      {notice && (
        <div role="status" className={successBox}>
          {notice}
        </div>
      )}

      {!loan ? (
        <EmptyNote text={loading ? "Loading loan details..." : "This loan could not be found."} />
      ) : (
        <>
          <section>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Approved", value: naira(loan.amount_approved) },
                { label: "Repaid", value: naira((loan.amount_due ?? loan.amount_approved ?? 0) - (loan.outstanding_balance ?? 0)) },
                { label: "Outstanding", value: naira(loan.outstanding_balance) },
              ].map((cell) => (
                <div key={cell.label} className="rounded-xl border border-slate-200 px-2 py-3 dark:border-white/[0.07]">
                  <p className="text-xs text-slate-500 dark:text-zinc-500">{cell.label}</p>
                  <p className="mt-1 break-words text-sm font-semibold text-[#0b2545] dark:text-white">{cell.value}</p>
                </div>
              ))}
            </div>
            {share !== null && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
                  <div className="h-full rounded-full bg-teal-600 dark:bg-zinc-300" style={{ width: `${Math.round(share * 100)}%` }} />
                </div>
                <p className="mt-1.5 text-right text-xs text-slate-500 dark:text-zinc-500">{Math.round(share * 100)}% repaid</p>
              </div>
            )}
          </section>

          <DetailBlock
            title="Loan details"
            items={[
              { label: "Status", value: <Badge value={loan.loan_status} /> },
              { label: "Member", value: <Link href={`/loan-officer/members?id=${loan.member_id}`} className={link}>{loan.member_name || `Member #${loan.member_id}`}</Link> },
              { label: "Application", value: <Link href={`/loan-officer/applications?id=${loan.application_id}`} className={link}>#{loan.application_id}</Link> },
              { label: "Loan type", value: titleCase(loan.loan_type) },
              { label: "Purpose", value: loan.loan_purpose || NA },
              { label: "Interest rate", value: fmtPercent(loan.interest_rate) },
              { label: "Term", value: loan.loan_term ? `${loan.loan_term} months` : NA },
              { label: "Repayment frequency", value: titleCase(loan.repayment_frequency) },
              { label: "Disbursed", value: fmtDate(loan.disbursement_date) },
            ]}
          />

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Loan status</h4>

            {actions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">
                {loan.loan_status === "completed"
                  ? "This loan is fully repaid. Its status can no longer change."
                  : "A defaulted loan is final. Its status cannot be changed, but payments can still be recorded."}
              </p>
            ) : pending ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/[0.06] dark:text-amber-300">
                <p className="flex items-start gap-2 font-medium">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  {pending.label}?
                </p>
                {pending.warning && <p className="mt-1 pl-6">{pending.warning}</p>}
                <div className="mt-3 flex flex-wrap gap-2 pl-6">
                  <button type="button" onClick={() => void changeStatus(pending)} disabled={busy} className={primaryButton}>
                    {busy ? "Saving..." : "Confirm"}
                  </button>
                  <button type="button" onClick={() => setPending(null)} disabled={busy} className={secondaryButton}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {actions.map((action) => (
                  <button
                    key={action.to}
                    type="button"
                    onClick={() => (action.warning ? setPending(action) : void changeStatus(action))}
                    disabled={busy}
                    className={secondaryButton}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Record repayment</h4>
              {canRecordRepayment(loan) && !showForm && (
                <button type="button" onClick={() => { setShowForm(true); setNotice(""); }} className={rowButton}>
                  <Wallet size={14} className="mr-1.5" />
                  New repayment
                </button>
              )}
            </div>

            {!canRecordRepayment(loan) ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">
                {loan.loan_status === "completed"
                  ? "Nothing left to pay on this loan."
                  : "Repayments can only be recorded for active, overdue or defaulted loans with a balance."}
              </p>
            ) : showForm ? (
              <div className="mt-4">
                <RepaymentForm
                  loanId={loanId}
                  outstanding={loan.outstanding_balance ?? 0}
                  onRecorded={(result) => void recorded(result)}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">
                Log a payment received against this loan.
              </p>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Repayment history
            </h4>

            {loading && !detail ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">Loading repayments...</p>
            ) : repayments.length === 0 ? (
              <div className="mt-3">
                <EmptyNote text="No repayments recorded yet." />
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.06]">
                {repayments.map((r) => (
                  <li key={r.repayment_id} className="py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-zinc-100">{naira(r.amount_paid)}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-500">
                          {fmtDate(r.payment_date)} · {r.payment_method || NA}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge value={r.payment_status} />
                        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">Balance {naira(r.remaining_balance)}</p>
                      </div>
                    </div>
                    {r.recorded_by_username && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-500">
                        <CheckCircle2 size={12} />
                        Recorded by {r.recorded_by_username}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Drawer>
  );
}