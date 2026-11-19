"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Pencil, ShieldCheck, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  AssessmentFields,
  AssessmentView,
  assessmentToForm,
  buildAssessmentPayload,
  emptyAssessmentForm,
  type AssessmentForm,
} from "@/components/loan-officer/assessment-fields";
import {
  Badge,
  DetailBlock,
  Drawer,
  NA,
  errorBox,
  fetchJson,
  fieldClass,
  fmtDate,
  fmtDateTime,
  fmtPercent,
  labelClass,
  naira,
  pillButton,
  primaryButton,
  readMessage,
  rowButton,
  secondaryButton,
  successBox,
  titleCase,
  waitingLabel,
} from "@/components/loan-officer/officer-ui";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AppRecord = {
  application_id: number;
  member_id: number;
  member_name?: string | null;
  amount_requested?: number | null;
  loan_type?: string | null;
  loan_purpose?: string | null;
  loan_term?: number | null;
  interest_rate?: number | null;
  repayment_frequency?: string | null;
  application_date?: string | null;
  application_status?: string | null;
  decision_date?: string | null;
  decision_by_username?: string | null;
  submission_method?: string | null;
  submitted_by_username?: string | null;
  latest_risk_level?: string | null;
  latest_default_probability?: number | null;
  latest_prediction_date?: string | null;
};

type Prediction = {
  prediction_id: number;
  default_probability: number | null;
  risk_level: string;
  model_name?: string | null;
  model_version?: string | null;
  prediction_date?: string | null;
  input_snapshot?: unknown;
};

type Profile = {
  member: {
    membership_status?: string | null;
    membership_date?: string | null;
    member_category?: string | null;
    cooperative_unit?: string | null;
    cooperative_id?: number | null;
  };
  summary: {
    total_applications: number;
    total_loans: number;
    loans_by_status: Record<string, number>;
    total_outstanding: number;
    total_repaid: number;
  };
};

type Rec = Record<string, unknown>;
type Load<T> = { state: "loading" | "ready" | "missing" | "error"; data: T | null; error: string };

const block = "rounded-xl border border-slate-200 p-4 dark:border-white/[0.07]";
const inputClass = `${fieldClass} mt-2 w-full`;
const today = () => new Date().toISOString().slice(0, 10);

function currentUsername() {
  try {
    const raw = sessionStorage.getItem("current_user");
    return raw ? (JSON.parse(raw) as { username?: string }).username ?? null : null;
  } catch {
    return null;
  }
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/[0.06] dark:text-amber-300">
      <AlertTriangle size={17} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function RiskMeter({ level, probability }: { level: string; probability: number | null }) {
  const tone = level === "High" ? "bg-red-500" : level === "Medium" ? "bg-amber-500" : "bg-emerald-500";
  const pct = Math.min(100, Math.max(0, (probability ?? 0) * 100));

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Default probability</p>
          <p className="mt-1 text-xl font-semibold text-[#0b2545] dark:text-white">{fmtPercent(probability, 100)}</p>
        </div>
        <Badge value={level} />
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-white/[0.06]">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer                                                              */
/* ------------------------------------------------------------------ */

export default function ReviewDrawer({
  application,
  onClose,
  onChanged,
}: {
  application: AppRecord;
  onClose: () => void;
  onChanged: () => void;
}) {
  const id = application.application_id;
  const [app, setApp] = useState<AppRecord>(application);
  const pending = app.application_status === "pending";

  const [assessment, setAssessment] = useState<Load<Rec>>({ state: "loading", data: null, error: "" });
  const [predictions, setPredictions] = useState<Load<Prediction[]>>({ state: "loading", data: null, error: "" });
  const [profile, setProfile] = useState<Load<Profile>>({ state: "loading", data: null, error: "" });
  const [stale, setStale] = useState(false);
  const [loanId, setLoanId] = useState<number | null>(null);

  useEffect(() => {
    let live = true;

    (async () => {
      const [a, p, b] = await Promise.allSettled([
        apiFetch(`/api/assessments/${id}`),
        fetchJson<{ predictions: Prediction[] }>(`/api/officer/applications/${id}/predictions`, "risk predictions"),
        fetchJson<Profile>(`/api/officer/members/${application.member_id}/profile`, "borrower information"),
      ]);
      if (!live) return;

      if (a.status === "fulfilled") {
        if (a.value.status === 404) setAssessment({ state: "missing", data: null, error: "" });
        else if (!a.value.ok) setAssessment({ state: "error", data: null, error: `Could not load the assessment (${a.value.status}).` });
        else {
          const body = await a.value.json();
          if (live) setAssessment({ state: "ready", data: body.assessment as Rec, error: "" });
        }
      } else {
        setAssessment({ state: "error", data: null, error: "Could not load the assessment." });
      }

      setPredictions(
        p.status === "fulfilled"
          ? { state: "ready", data: p.value.predictions ?? [], error: "" }
          : { state: "error", data: null, error: p.reason instanceof Error ? p.reason.message : "Could not load predictions." }
      );

      setProfile(
        b.status === "fulfilled"
          ? { state: "ready", data: b.value, error: "" }
          : { state: "error", data: null, error: b.reason instanceof Error ? b.reason.message : "Could not load borrower information." }
      );
    })();

    return () => {
      live = false;
    };
  }, [id, application.member_id]);

  // For approved applications, find the loan so we can link to it.
  useEffect(() => {
    if (app.application_status !== "approved" || loanId !== null) return;
    let live = true;
    fetchJson<{ loans: { loan_id: number; application_id: number }[] }>("/api/officer/loans", "loans")
      .then((body) => {
        const match = body.loans.find((l) => l.application_id === id);
        if (live && match) setLoanId(match.loan_id);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [app.application_status, loanId, id]);

  const latest = predictions.data?.[0] ?? null;
  const hasIncome = assessment.data?.monthly_income !== null && assessment.data?.monthly_income !== undefined;
  const markStale = () => {
    if (latest) setStale(true);
  };

  return (
    <Drawer
      eyebrow={`Application #${id}`}
      title={app.member_name || `Member #${app.member_id}`}
      subtitle={`${titleCase(app.loan_type)} · ${naira(app.amount_requested)}`}
      onClose={onClose}
      wide
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge value={app.application_status} />
        {pending && <span className="text-xs text-slate-500 dark:text-zinc-400">Waiting {waitingLabel(app.application_date)}</span>}
      </div>

      <DetailBlock
        title="Request"
        items={[
          { label: "Loan type", value: titleCase(app.loan_type) },
          { label: "Purpose", value: app.loan_purpose || NA },
          { label: "Amount requested", value: naira(app.amount_requested) },
          { label: "Term", value: app.loan_term ?? NA },
          { label: "Repayment frequency", value: titleCase(app.repayment_frequency) },
          { label: "Submitted via", value: titleCase(app.submission_method) },
          { label: "Submitted by", value: app.submitted_by_username || NA },
          { label: "Applied on", value: fmtDateTime(app.application_date) },
        ]}
      />

      <BorrowerSection memberId={app.member_id} profile={profile} />

      <AssessmentSection
        id={id}
        editable={pending}
        load={assessment}
        onSaved={(data) => {
          setAssessment({ state: "ready", data, error: "" });
          markStale();
        }}
      />

      <RiskSection
        app={app}
        pending={pending}
        hasIncome={hasIncome}
        missingCooperative={profile.state === "ready" && !profile.data?.member.cooperative_id}
        load={predictions}
        stale={stale}
        onRateSaved={(updated) => {
          setApp((prev) => ({ ...prev, ...updated }));
          markStale();
          onChanged();
        }}
        onPredicted={(prediction) => {
          setPredictions((prev) => ({ state: "ready", data: [prediction, ...(prev.data ?? [])], error: "" }));
          setApp((prev) => ({
            ...prev,
            latest_risk_level: prediction.risk_level,
            latest_default_probability: prediction.default_probability,
            latest_prediction_date: prediction.prediction_date,
          }));
          setStale(false);
          onChanged();
        }}
      />

      {pending ? (
        <DecisionSection
          app={app}
          latest={latest}
          stale={stale}
          onDecided={(updated, loan) => {
            setApp((prev) => ({ ...prev, ...updated, decision_by_username: currentUsername() }));
            if (loan) setLoanId(loan.loan_id);
            onChanged();
          }}
        />
      ) : (
        <section className="space-y-3">
          <DetailBlock
            title="Decision"
            items={[
              { label: "Outcome", value: <Badge value={app.application_status} /> },
              { label: "Decided by", value: app.decision_by_username || NA },
              { label: "Decided on", value: fmtDateTime(app.decision_date) },
            ]}
          />
          {app.application_status === "approved" && loanId !== null && (
            <Link href={`/loan-officer/loans?id=${loanId}`} className={rowButton}>
              Open loan #{loanId}
            </Link>
          )}
        </section>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Borrower information                                                */
/* ------------------------------------------------------------------ */

function BorrowerSection({ memberId, profile }: { memberId: number; profile: Load<Profile> }) {
  if (profile.state === "loading") return <p className="text-sm text-slate-500 dark:text-zinc-400">Loading borrower information...</p>;
  if (profile.state === "error" || !profile.data) return <div role="alert" className={errorBox}>{profile.error}</div>;

  const { member, summary } = profile.data;
  const s = summary.loans_by_status;

  return (
    <section className="space-y-3">
      <DetailBlock
        title="Borrower information"
        items={[
          { label: "Membership", value: <Badge value={member.membership_status ?? "active"} /> },
          { label: "Member since", value: fmtDate(member.membership_date) },
          { label: "Category", value: member.member_category || NA },
          { label: "Cooperative unit", value: member.cooperative_unit || NA },
          { label: "Applications on record", value: summary.total_applications },
          { label: "Loans taken", value: summary.total_loans },
          { label: "Active / overdue / defaulted", value: `${s.active ?? 0} / ${s.overdue ?? 0} / ${s.defaulted ?? 0}` },
          { label: "Outstanding balance", value: naira(summary.total_outstanding) },
          { label: "Total repaid", value: naira(summary.total_repaid) },
        ]}
      />
      <Link href={`/loan-officer/members?id=${memberId}`} className={rowButton}>Open member profile</Link>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Assessment                                                          */
/* ------------------------------------------------------------------ */

function AssessmentSection({
  id,
  editable,
  load,
  onSaved,
}: {
  id: number;
  editable: boolean;
  load: Load<Rec>;
  onSaved: (data: Rec) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AssessmentForm>(emptyAssessmentForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const result = buildAssessmentPayload(form, true);
    if (result.error) return setError(result.error);

    setBusy(true);
    try {
      const response = await apiFetch(`/api/assessments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.payload),
      });
      if (!response.ok) throw new Error(await readMessage(response, "Could not save the assessment"));

      const data = await response.json();
      onSaved(data.assessment as Rec);
      setNotice("Assessment updated.");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the assessment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[#0b2545] dark:text-white">Applicant assessment</h4>
        {editable && load.state === "ready" && !editing && (
          <button
            type="button"
            onClick={() => { setForm(assessmentToForm(load.data)); setEditing(true); setNotice(""); setError(""); }}
            className={pillButton}
          >
            <Pencil size={14} />
            Edit
          </button>
        )}
      </div>

      {notice && <div role="status" className={successBox}>{notice}</div>}
      {error && <div role="alert" className={errorBox}>{error}</div>}

      {load.state === "loading" ? (
        <p className="text-sm text-slate-500 dark:text-zinc-400">Loading assessment...</p>
      ) : load.state === "error" ? (
        <div role="alert" className={errorBox}>{load.error}</div>
      ) : load.state === "missing" || !load.data ? (
        <p className="text-sm text-slate-500 dark:text-zinc-400">No assessment on record for this application.</p>
      ) : editing ? (
        <form onSubmit={save} className="space-y-5">
          <AssessmentFields form={form} setForm={setForm} disabled={busy} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setError(""); }} className={secondaryButton}>Cancel</button>
            <button type="submit" disabled={busy} className={primaryButton}>{busy ? "Saving..." : "Save assessment"}</button>
          </div>
        </form>
      ) : (
        <AssessmentView assessment={load.data} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Interest rate + risk prediction                                     */
/* ------------------------------------------------------------------ */

function RiskSection({
  app,
  pending,
  hasIncome,
  missingCooperative,
  load,
  stale,
  onRateSaved,
  onPredicted,
}: {
  app: AppRecord;
  pending: boolean;
  hasIncome: boolean;
  missingCooperative: boolean;
  load: Load<Prediction[]>;
  stale: boolean;
  onRateSaved: (updated: Partial<AppRecord>) => void;
  onPredicted: (prediction: Prediction) => void;
}) {
  const id = app.application_id;
  const [rate, setRate] = useState(app.interest_rate != null ? String(app.interest_rate) : "");
  const [rateBusy, setRateBusy] = useState(false);
  const [rateError, setRateError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  const predictions = load.data ?? [];
  const latest = predictions[0] ?? null;

  const blockers: string[] = [];
  if (app.interest_rate == null) blockers.push("set an interest rate");
  if (!hasIncome) blockers.push("add the applicant's monthly income in the assessment");
  if (missingCooperative) blockers.push("the member has no cooperative ID");

  async function saveRate() {
    const n = Number(rate);
    if (rate.trim() === "" || !Number.isFinite(n) || n < 0 || n > 100) {
      return setRateError("Enter an interest rate between 0 and 100.");
    }

    setRateBusy(true);
    setRateError("");
    try {
      const response = await apiFetch(`/api/officer/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interest_rate: n }),
      });
      if (!response.ok) throw new Error(await readMessage(response, "Could not save the rate"));

      const data = await response.json();
      onRateSaved(data.application as Partial<AppRecord>);
    } catch (e) {
      setRateError(e instanceof Error ? e.message : "Could not save the rate.");
    } finally {
      setRateBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch(`/api/predictions/${id}`, { method: "POST" });
      if (!response.ok) throw new Error(await readMessage(response, "Prediction failed"));

      const data = await response.json();
      onPredicted(data.prediction as Prediction);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the prediction.");
    } finally {
      setBusy(false);
    }
  }

  const snapshot =
    latest && latest.input_snapshot && typeof latest.input_snapshot === "object"
      ? Object.entries(latest.input_snapshot as Record<string, unknown>)
      : [];

  return (
    <section className="space-y-4">
      <h4 className="text-sm font-semibold text-[#0b2545] dark:text-white">Interest rate and risk prediction</h4>

      <div className={block}>
        <label className={labelClass}>
          Interest rate (%)
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              disabled={!pending || rateBusy}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className={`${fieldClass} w-full`}
              placeholder="e.g. 12"
            />
            {pending && (
              <button
                type="button"
                onClick={() => void saveRate()}
                disabled={rateBusy || rate.trim() === "" || Number(rate) === app.interest_rate}
                className={primaryButton}
              >
                {rateBusy ? "Saving..." : "Save"}
              </button>
            )}
          </div>
        </label>
        <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">
          {app.interest_rate == null
            ? "No rate set yet. The risk model needs one."
            : "Used as a risk-model input and as the default rate if you approve."}
        </p>
        {rateError && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{rateError}</p>}
      </div>

      <div className={block}>
        {load.state === "loading" ? (
          <p className="text-sm text-slate-500 dark:text-zinc-400">Loading predictions...</p>
        ) : load.state === "error" ? (
          <div role="alert" className={errorBox}>{load.error}</div>
        ) : latest ? (
          <div className="space-y-4">
            <RiskMeter level={latest.risk_level} probability={latest.default_probability} />
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              Scored {fmtDateTime(latest.prediction_date)} · {latest.model_name || "Model"} {latest.model_version || ""}
            </p>
            {stale && pending && (
              <Warning>The assessment or interest rate changed after this score. Re-run the prediction for an up-to-date result.</Warning>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-zinc-300">No risk prediction has been generated for this application yet.</p>
        )}

        {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p>}

        {pending && (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => void generate()}
              disabled={busy || blockers.length > 0}
              className={primaryButton}
            >
              <ShieldCheck size={16} />
              {busy ? "Generating..." : latest ? "Re-run prediction" : "Generate prediction"}
            </button>
            {blockers.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-zinc-500">To generate a prediction, first {blockers.join(" and ")}.</p>
            )}
          </div>
        )}

        {(predictions.length > 1 || snapshot.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.07]">
            {predictions.length > 1 && (
              <button type="button" onClick={() => setShowHistory((v) => !v)} className={rowButton}>
                {showHistory ? "Hide" : "Show"} history ({predictions.length})
              </button>
            )}
            {snapshot.length > 0 && (
              <button type="button" onClick={() => setShowSnapshot((v) => !v)} className={rowButton}>
                {showSnapshot ? "Hide" : "Show"} model inputs
              </button>
            )}
          </div>
        )}

        {showHistory && (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.06]">
            {predictions.map((p) => (
              <li key={p.prediction_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-slate-500 dark:text-zinc-400">{fmtDateTime(p.prediction_date)}</span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums text-slate-600 dark:text-zinc-300">{fmtPercent(p.default_probability, 100)}</span>
                  <Badge value={p.risk_level} />
                </span>
              </li>
            ))}
          </ul>
        )}

        {showSnapshot && (
          <dl className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.06]">
            {snapshot.map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-4 py-2 text-xs">
                <dt className="text-slate-500 dark:text-zinc-400">{key.replace(/_/g, " ")}</dt>
                <dd className="break-words text-right font-medium text-slate-800 dark:text-zinc-100">
                  {value === null || value === undefined || value === "" ? NA : typeof value === "object" ? JSON.stringify(value) : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Decision                                                            */
/* ------------------------------------------------------------------ */

function DecisionSection({
  app,
  latest,
  stale,
  onDecided,
}: {
  app: AppRecord;
  latest: Prediction | null;
  stale: boolean;
  onDecided: (application: Partial<AppRecord>, loan: { loan_id: number } | null) => void;
}) {
  const id = app.application_id;
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("");
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const warnings: string[] = [];
  if (!latest) warnings.push("No risk prediction has been generated yet. You can still decide, but a score is recommended.");
  else if (latest.risk_level === "High") warnings.push(`This application is scored High risk (${fmtPercent(latest.default_probability, 100)} default probability). Review it carefully before approving.`);
  if (latest && stale) warnings.push("The assessment or interest rate changed after the last prediction. Re-run it for an up-to-date score.");

  function openApprove() {
    setAmount(app.amount_requested != null ? String(app.amount_requested) : "");
    setRate(app.interest_rate != null ? String(app.interest_rate) : "");
    setDate(today());
    setError("");
    setMode("approve");
  }

  async function submit(decision: "approved" | "rejected", body: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch(`/api/loan-decisions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ...body }),
      });
      if (!response.ok) throw new Error(await readMessage(response, "The decision could not be saved"));

      const data = await response.json();
      setDone(decision === "approved" ? "Application approved and the loan has been created." : "Application rejected.");
      setMode("idle");
      onDecided(data.application as Partial<AppRecord>, (data.loan as { loan_id: number } | undefined) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The decision could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function approve(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return setError("The approved amount must be greater than zero.");
    if (app.amount_requested != null && amt > app.amount_requested) {
      return setError(`The approved amount cannot exceed the requested ${naira(app.amount_requested)}.`);
    }

    const r = Number(rate);
    if (rate.trim() === "" || !Number.isFinite(r) || r < 0 || r > 100) {
      return setError("Enter an interest rate between 0 and 100.");
    }

    void submit("approved", { amount_approved: amt, interest_rate: r, disbursement_date: date || undefined });
  }

  if (done) return <div role="status" className={successBox}>{done}</div>;

  return (
    <section className="space-y-4">
      <h4 className="text-sm font-semibold text-[#0b2545] dark:text-white">Decision</h4>

      {warnings.map((w) => (
        <Warning key={w}>{w}</Warning>
      ))}
      {error && <div role="alert" className={errorBox}>{error}</div>}

      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openApprove} className={primaryButton}>
            <CheckCircle2 size={17} />
            Approve…
          </button>
          <button type="button" onClick={() => { setError(""); setMode("reject"); }} className={secondaryButton}>
            <XCircle size={17} />
            Reject…
          </button>
        </div>
      )}

      {mode === "approve" && (
        <form onSubmit={approve} className={`${block} space-y-4`}>
          <p className="text-sm font-semibold text-[#0b2545] dark:text-white">Approve this loan</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Amount approved (₦)
              <input type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
              <span className="mt-1.5 block text-xs font-normal text-slate-500 dark:text-zinc-500">Requested: {naira(app.amount_requested)}</span>
            </label>
            <label className={labelClass}>
              Interest rate (%)
              <input type="number" min={0} max={100} step="0.01" required value={rate} onChange={(e) => setRate(e.target.value)} className={inputClass} />
              {app.interest_rate != null && Number(rate) !== app.interest_rate && (
                <span className="mt-1.5 block text-xs font-normal text-amber-700 dark:text-amber-300">Application rate is {app.interest_rate}%.</span>
              )}
            </label>
            <label className={`${labelClass} sm:col-span-2`}>
              Disbursement date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode("idle")} disabled={busy} className={secondaryButton}>Cancel</button>
            <button type="submit" disabled={busy} className={primaryButton}>{busy ? "Approving..." : "Confirm approval"}</button>
          </div>
        </form>
      )}

      {mode === "reject" && (
        <div className={`${block} space-y-4`}>
          <p className="text-sm font-semibold text-[#0b2545] dark:text-white">Reject this application?</p>
          <p className="text-sm text-slate-600 dark:text-zinc-300">
            This cannot be undone. The system does not store a rejection reason, so tell the member separately if they need one.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMode("idle")} disabled={busy} className={secondaryButton}>Cancel</button>
            <button type="button" onClick={() => void submit("rejected")} disabled={busy} className={primaryButton}>
              {busy ? "Rejecting..." : "Confirm rejection"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}