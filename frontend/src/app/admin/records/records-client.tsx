"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  HandCoins,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Rec = Record<string, any>;
type TabKey = "members" | "applications" | "loans" | "repayments" | "predictions";

type Col = {
  header: string;
  cell: (r: Rec) => ReactNode;
  csv: (r: Rec) => string | number | null | undefined;
};
type Item = { label: string; value: ReactNode };
type Section = { title: string; items: Item[] };

type TabConfig = {
  key: TabKey;
  label: string;
  icon: ElementType;
  description: string;
  path: string;
  listKey: string;
  id: (r: Rec) => number;
  statusLabel: string;
  statusOptions: string[];
  status: (r: Rec) => string;
  dateLabel: string;
  date: (r: Rec) => string | null | undefined;
  search: (r: Rec) => string;
  columns: Col[];
  title: (r: Rec) => string;
  subtitle: (r: Rec) => string;
  sections: (r: Rec) => Section[];
  extra?: (r: Rec) => ReactNode;
};

/* ------------------------------------------------------------------ */
/* Theme (same surfaces as the repayments page)                        */
/* ------------------------------------------------------------------ */

const cardSurface =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/[0.07] dark:bg-[#0c0c0e] dark:bg-gradient-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-16px_rgba(0,0,0,0.8)]";

const iconTile =
  "rounded-xl bg-teal-50 p-3 text-teal-800 dark:bg-gradient-to-b dark:from-white/[0.09] dark:to-white/[0.03] dark:text-zinc-300 dark:ring-1 dark:ring-white/[0.07] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

const pillButton =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:rounded-full dark:border-white/[0.1] dark:bg-gradient-to-b dark:from-white/[0.08] dark:to-white/[0.02] dark:px-4 dark:text-zinc-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_-4px_rgba(0,0,0,0.7)] dark:hover:from-white/[0.12] dark:hover:to-white/[0.04]";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 dark:border-white/[0.1] dark:bg-[#111113] dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-teal-500";

const BADGE = {
  good: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/[0.08] dark:text-emerald-300",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-400/[0.08] dark:text-amber-300",
  bad: "bg-red-50 text-red-700 dark:bg-red-400/[0.08] dark:text-red-300",
  neutral: "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300",
};

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
const NA = "Not available";

const isBlank = (v: unknown) => v === null || v === undefined || v === "";
const text = (v: unknown) => (isBlank(v) ? NA : String(v));
const naira = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? money.format(v) : NA);
const yesNo = (v: unknown) => (v === true ? "Yes" : v === false ? "No" : NA);

function titleCase(value: unknown) {
  if (isBlank(value)) return NA;
  return String(value).replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtDate(value: unknown) {
  if (isBlank(value)) return NA;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? NA : d.toLocaleDateString("en-NG");
}

function fmtDateTime(value: unknown) {
  if (isBlank(value)) return NA;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? NA : d.toLocaleString("en-NG");
}

function fmtPercent(value: unknown, scale = 1) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * scale).toFixed(1)}%` : NA;
}

function fullName(r: Rec) {
  return `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || NA;
}

function memberLabel(r: Rec) {
  return r.member_name || (r.member_id ? `Member #${r.member_id}` : NA);
}

function badgeTone(value: string) {
  const v = value.toLowerCase();
  if (["active", "approved", "completed", "low"].includes(v)) return BADGE.good;
  if (["pending", "medium", "overdue"].includes(v)) return BADGE.warn;
  if (["rejected", "failed", "defaulted", "high"].includes(v)) return BADGE.bad;
  return BADGE.neutral;
}

function Badge({ value }: { value: unknown }) {
  if (isBlank(value)) return <span className="text-slate-500 dark:text-zinc-500">{NA}</span>;
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeTone(String(value))}`}>
      {titleCase(value)}
    </span>
  );
}

function Person({ name, sub }: { name: string; sub?: string }) {
  return (
    <div>
      <p className="font-medium text-slate-800 dark:text-zinc-100">{name}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-zinc-500">{sub}</p>}
    </div>
  );
}

function csvCell(value: string | number | null | undefined) {
  const t = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/* ------------------------------------------------------------------ */
/* Tab configuration                                                   */
/* ------------------------------------------------------------------ */

const TABS: TabConfig[] = [
  {
    key: "members",
    label: "Members",
    icon: Users,
    description: "Every registered cooperative member.",
    path: "/api/members/",
    listKey: "members",
    id: (r) => r.member_id,
    statusLabel: "Membership status",
    statusOptions: ["active", "inactive"],
    status: (r) => r.membership_status ?? "active",
    dateLabel: "Joined",
    date: (r) => r.membership_date,
    search: (r) =>
      [r.member_id, fullName(r), r.email, r.phone, r.member_category, r.cooperative_unit, r.address].join(" "),
    columns: [
      { header: "Member", cell: (r) => <Person name={fullName(r)} sub={r.email || undefined} />, csv: (r) => fullName(r) },
      { header: "Phone", cell: (r) => text(r.phone), csv: (r) => r.phone },
      { header: "Category", cell: (r) => text(r.member_category), csv: (r) => r.member_category },
      { header: "Unit", cell: (r) => text(r.cooperative_unit), csv: (r) => r.cooperative_unit },
      { header: "Status", cell: (r) => <Badge value={r.membership_status ?? "active"} />, csv: (r) => r.membership_status },
      { header: "Joined", cell: (r) => fmtDate(r.membership_date), csv: (r) => r.membership_date },
    ],
    title: (r) => fullName(r),
    subtitle: (r) => `Member #${r.member_id}`,
    sections: (r) => [
      {
        title: "Personal details",
        items: [
          { label: "Full name", value: fullName(r) },
          { label: "Gender", value: titleCase(r.gender) },
          { label: "Date of birth", value: fmtDate(r.date_of_birth) },
          { label: "Phone", value: text(r.phone) },
          { label: "Email", value: text(r.email) },
          { label: "Address", value: text(r.address) },
        ],
      },
      {
        title: "Membership",
        items: [
          { label: "Member ID", value: text(r.member_id) },
          { label: "User account ID", value: text(r.user_id) },
          { label: "Status", value: <Badge value={r.membership_status ?? "active"} /> },
          { label: "Member since", value: fmtDate(r.membership_date) },
          { label: "Category", value: text(r.member_category) },
          { label: "Cooperative unit", value: text(r.cooperative_unit) },
          { label: "Cooperative ID", value: text(r.cooperative_id) },
        ],
      },
    ],
  },
  {
    key: "applications",
    label: "Applications",
    icon: FileText,
    description: "All loan applications, with who submitted and decided each one.",
    path: "/api/admin/applications",
    listKey: "applications",
    id: (r) => r.application_id,
    statusLabel: "Application status",
    statusOptions: ["pending", "approved", "rejected", "cancelled"],
    status: (r) => r.application_status ?? "",
    dateLabel: "Applied",
    date: (r) => r.application_date,
    search: (r) =>
      [r.application_id, memberLabel(r), r.loan_type, r.loan_purpose, r.submitted_by_username, r.decision_by_username, r.submission_method].join(" "),
    columns: [
      { header: "ID", cell: (r) => `#${r.application_id}`, csv: (r) => r.application_id },
      { header: "Member", cell: (r) => memberLabel(r), csv: (r) => memberLabel(r) },
      { header: "Loan type", cell: (r) => titleCase(r.loan_type), csv: (r) => r.loan_type },
      { header: "Amount", cell: (r) => naira(r.amount_requested), csv: (r) => r.amount_requested },
      { header: "Status", cell: (r) => <Badge value={r.application_status} />, csv: (r) => r.application_status },
      { header: "Submitted by", cell: (r) => text(r.submitted_by_username), csv: (r) => r.submitted_by_username },
      { header: "Decided by", cell: (r) => text(r.decision_by_username), csv: (r) => r.decision_by_username },
      { header: "Applied", cell: (r) => fmtDate(r.application_date), csv: (r) => r.application_date },
    ],
    title: (r) => `Application #${r.application_id}`,
    subtitle: (r) => memberLabel(r),
    sections: (r) => [
      {
        title: "Application",
        items: [
          { label: "Member", value: `${memberLabel(r)} (ID ${text(r.member_id)})` },
          { label: "Loan type", value: titleCase(r.loan_type) },
          { label: "Purpose", value: text(r.loan_purpose) },
          { label: "Amount requested", value: naira(r.amount_requested) },
          { label: "Loan term", value: text(r.loan_term) },
          { label: "Interest rate", value: typeof r.interest_rate === "number" ? `${r.interest_rate}%` : NA },
          { label: "Repayment frequency", value: titleCase(r.repayment_frequency) },
          { label: "Status", value: <Badge value={r.application_status} /> },
        ],
      },
      {
        title: "Submission",
        items: [
          { label: "Method", value: titleCase(r.submission_method) },
          { label: "Submitted by", value: text(r.submitted_by_username) },
          { label: "Applied on", value: fmtDateTime(r.application_date) },
        ],
      },
      {
        title: "Decision",
        items: [
          { label: "Decided by", value: text(r.decision_by_username) },
          { label: "Decided on", value: fmtDateTime(r.decision_date) },
        ],
      },
      {
        title: "Applicant declarations",
        items: [
          { label: "Confirmed 18 or over", value: yesNo(r.legal_age_confirmed) },
          { label: "Terms accepted", value: yesNo(r.terms_accepted) },
          { label: "Terms version", value: text(r.terms_version) },
          { label: "Terms accepted at", value: fmtDateTime(r.terms_accepted_at) },
        ],
      },
    ],
    extra: (r) => <AssessmentSection applicationId={r.application_id} />,
  },
  {
    key: "loans",
    label: "Loans",
    icon: HandCoins,
    description: "Approved and disbursed loans with their current balances.",
    path: "/api/admin/loans",
    listKey: "loans",
    id: (r) => r.loan_id,
    statusLabel: "Loan status",
    statusOptions: ["active", "completed", "overdue", "defaulted"],
    status: (r) => r.loan_status ?? "",
    dateLabel: "Disbursed",
    date: (r) => r.disbursement_date,
    search: (r) => [r.loan_id, r.application_id, memberLabel(r), r.loan_type, r.loan_purpose].join(" "),
    columns: [
      { header: "Loan", cell: (r) => `#${r.loan_id}`, csv: (r) => r.loan_id },
      { header: "Member", cell: (r) => memberLabel(r), csv: (r) => memberLabel(r) },
      { header: "Type", cell: (r) => titleCase(r.loan_type), csv: (r) => r.loan_type },
      { header: "Approved", cell: (r) => naira(r.amount_approved), csv: (r) => r.amount_approved },
      { header: "Outstanding", cell: (r) => naira(r.outstanding_balance), csv: (r) => r.outstanding_balance },
      { header: "Rate", cell: (r) => (typeof r.interest_rate === "number" ? `${r.interest_rate}%` : NA), csv: (r) => r.interest_rate },
      { header: "Disbursed", cell: (r) => fmtDate(r.disbursement_date), csv: (r) => r.disbursement_date },
      { header: "Status", cell: (r) => <Badge value={r.loan_status} />, csv: (r) => r.loan_status },
    ],
    title: (r) => `Loan #${r.loan_id}`,
    subtitle: (r) => memberLabel(r),
    sections: (r) => {
      const repaid =
        typeof r.amount_approved === "number" && typeof r.outstanding_balance === "number"
          ? r.amount_approved - r.outstanding_balance
          : null;
      return [
        {
          title: "Loan",
          items: [
            { label: "Loan ID", value: text(r.loan_id) },
            { label: "Application ID", value: text(r.application_id) },
            { label: "Member", value: `${memberLabel(r)} (ID ${text(r.member_id)})` },
            { label: "Loan type", value: titleCase(r.loan_type) },
            { label: "Purpose", value: text(r.loan_purpose) },
            { label: "Loan term", value: text(r.loan_term) },
            { label: "Repayment frequency", value: titleCase(r.repayment_frequency) },
            { label: "Status", value: <Badge value={r.loan_status} /> },
          ],
        },
        {
          title: "Financials",
          items: [
            { label: "Amount approved", value: naira(r.amount_approved) },
            { label: "Amount due", value: naira(r.amount_due) },
            { label: "Outstanding balance", value: naira(r.outstanding_balance) },
            { label: "Repaid to date", value: repaid === null ? NA : naira(repaid) },
            { label: "Interest rate", value: typeof r.interest_rate === "number" ? `${r.interest_rate}%` : NA },
            { label: "Disbursement date", value: fmtDate(r.disbursement_date) },
          ],
        },
      ];
    },
  },
  {
    key: "repayments",
    label: "Repayments",
    icon: Wallet,
    description: "Every recorded repayment and who recorded it.",
    path: "/api/admin/repayments",
    listKey: "repayments",
    id: (r) => r.repayment_id,
    statusLabel: "Payment status",
    statusOptions: ["completed", "pending", "failed"],
    status: (r) => r.payment_status ?? "",
    dateLabel: "Paid",
    date: (r) => r.payment_date,
    search: (r) => [r.repayment_id, r.loan_id, memberLabel(r), r.payment_method, r.recorded_by_username].join(" "),
    columns: [
      { header: "ID", cell: (r) => `#${r.repayment_id}`, csv: (r) => r.repayment_id },
      { header: "Member", cell: (r) => memberLabel(r), csv: (r) => memberLabel(r) },
      { header: "Loan", cell: (r) => `#${r.loan_id}`, csv: (r) => r.loan_id },
      { header: "Amount paid", cell: (r) => naira(r.amount_paid), csv: (r) => r.amount_paid },
      { header: "Balance after", cell: (r) => naira(r.remaining_balance), csv: (r) => r.remaining_balance },
      { header: "Method", cell: (r) => titleCase(r.payment_method), csv: (r) => r.payment_method },
      { header: "Recorded by", cell: (r) => text(r.recorded_by_username), csv: (r) => r.recorded_by_username },
      { header: "Date", cell: (r) => fmtDate(r.payment_date), csv: (r) => r.payment_date },
      { header: "Status", cell: (r) => <Badge value={r.payment_status} />, csv: (r) => r.payment_status },
    ],
    title: (r) => `Repayment #${r.repayment_id}`,
    subtitle: (r) => memberLabel(r),
    sections: (r) => [
      {
        title: "Payment",
        items: [
          { label: "Repayment ID", value: text(r.repayment_id) },
          { label: "Loan ID", value: text(r.loan_id) },
          { label: "Member", value: `${memberLabel(r)} (ID ${text(r.member_id)})` },
          { label: "Amount paid", value: naira(r.amount_paid) },
          { label: "Balance after payment", value: naira(r.remaining_balance) },
          { label: "Method", value: titleCase(r.payment_method) },
          { label: "Status", value: <Badge value={r.payment_status} /> },
          { label: "Payment date", value: fmtDate(r.payment_date) },
        ],
      },
      {
        title: "Recording",
        items: [
          { label: "Recorded by", value: text(r.recorded_by_username) },
          { label: "Recorded at", value: fmtDateTime(r.created_at) },
        ],
      },
    ],
  },
  {
    key: "predictions",
    label: "Risk Predictions",
    icon: ShieldCheck,
    description: "Every risk score generated for a loan application.",
    path: "/api/admin/risk-predictions",
    listKey: "predictions",
    id: (r) => r.prediction_id,
    statusLabel: "Risk level",
    statusOptions: ["low", "medium", "high"],
    status: (r) => r.risk_level ?? "",
    dateLabel: "Predicted",
    date: (r) => r.prediction_date,
    search: (r) => [r.prediction_id, r.application_id, memberLabel(r), r.loan_type, r.model_name, r.model_version].join(" "),
    columns: [
      { header: "ID", cell: (r) => `#${r.prediction_id}`, csv: (r) => r.prediction_id },
      { header: "Application", cell: (r) => `#${r.application_id}`, csv: (r) => r.application_id },
      { header: "Member", cell: (r) => memberLabel(r), csv: (r) => memberLabel(r) },
      { header: "Loan type", cell: (r) => titleCase(r.loan_type), csv: (r) => r.loan_type },
      { header: "Amount", cell: (r) => naira(r.amount_requested), csv: (r) => r.amount_requested },
      { header: "Risk", cell: (r) => <Badge value={r.risk_level} />, csv: (r) => r.risk_level },
      {
        header: "Default probability",
        cell: (r) => fmtPercent(r.default_probability, 100),
        csv: (r) => (typeof r.default_probability === "number" ? Number((r.default_probability * 100).toFixed(2)) : null),
      },
      { header: "Model", cell: (r) => text(r.model_name), csv: (r) => r.model_name },
      { header: "Date", cell: (r) => fmtDate(r.prediction_date), csv: (r) => r.prediction_date },
    ],
    title: (r) => `Prediction #${r.prediction_id}`,
    subtitle: (r) => `Application #${r.application_id} · ${memberLabel(r)}`,
    sections: (r) => [
      {
        title: "Application",
        items: [
          { label: "Application ID", value: text(r.application_id) },
          { label: "Member", value: `${memberLabel(r)} (ID ${text(r.member_id)})` },
          { label: "Loan type", value: titleCase(r.loan_type) },
          { label: "Amount requested", value: naira(r.amount_requested) },
          { label: "Application status", value: <Badge value={r.application_status} /> },
        ],
      },
      {
        title: "Result",
        items: [
          { label: "Risk level", value: <Badge value={r.risk_level} /> },
          { label: "Default probability", value: fmtPercent(r.default_probability, 100) },
          { label: "Model", value: text(r.model_name) },
          { label: "Model version", value: text(r.model_version) },
          { label: "Predicted on", value: fmtDateTime(r.prediction_date) },
        ],
      },
    ],
    extra: (r) => <SnapshotSection value={r.input_snapshot} />,
  },
];

/* ------------------------------------------------------------------ */
/* Detail panel pieces                                                 */
/* ------------------------------------------------------------------ */

function DetailBlock({ title, items }: Section) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{title}</h4>
      <dl className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.06]">
        {items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
            <dt className="shrink-0 text-slate-500 dark:text-zinc-400">{item.label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-slate-800 dark:text-zinc-100">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AssessmentSection({ applicationId }: { applicationId: number }) {
  const [state, setState] = useState<{ loading: boolean; error: string; data: Rec | null }>({
    loading: true,
    error: "",
    data: null,
  });

  useEffect(() => {
    let live = true;
    setState({ loading: true, error: "", data: null });

    apiFetch(`/api/assessments/${applicationId}`)
      .then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Could not load the assessment (${response.status}).`);
        const body = await response.json();
        return (body.assessment ?? null) as Rec | null;
      })
      .then((data) => live && setState({ loading: false, error: "", data }))
      .catch((e) =>
        live &&
        setState({ loading: false, error: e instanceof Error ? e.message : "Could not load the assessment.", data: null })
      );

    return () => {
      live = false;
    };
  }, [applicationId]);

  if (state.loading) return <p className="text-sm text-slate-500 dark:text-zinc-400">Loading assessment...</p>;
  if (state.error) return <p className="text-sm text-red-600 dark:text-red-300">{state.error}</p>;
  if (!state.data) {
    return (
      <DetailBlock title="Applicant assessment" items={[{ label: "Assessment", value: "No assessment on record" }]} />
    );
  }

  const a = state.data;
  return (
    <DetailBlock
      title="Applicant assessment"
      items={[
        { label: "Employment status", value: titleCase(a.employment_status) },
        { label: "Occupation", value: text(a.occupation) },
        { label: "Monthly income", value: naira(a.monthly_income) },
        { label: "Existing monthly obligation", value: naira(a.existing_monthly_obligation) },
        { label: "Savings balance", value: naira(a.savings_balance) },
        { label: "Share value", value: naira(a.share_value) },
        { label: "Monthly contribution", value: naira(a.monthly_contribution) },
        { label: "Contribution frequency", value: titleCase(a.contribution_frequency) },
        { label: "Contribution status", value: titleCase(a.contribution_status) },
        { label: "Total contributions", value: naira(a.total_contributions) },
        { label: "Previous loans", value: text(a.previous_loan_count) },
        { label: "Previous defaults", value: text(a.previous_default_count) },
        { label: "Previous repayment rate", value: fmtPercent(a.previous_repayment_rate, 100) },
        { label: "Marital status", value: titleCase(a.marital_status) },
        { label: "Dependents", value: text(a.number_of_dependents) },
        { label: "Collateral type", value: titleCase(a.collateral_type) },
        { label: "Collateral value", value: naira(a.collateral_value) },
        { label: "Guarantors", value: text(a.guarantor_count) },
      ]}
    />
  );
}

function SnapshotSection({ value }: { value: unknown }) {
  let snapshot: unknown = value;
  if (typeof snapshot === "string") {
    try {
      snapshot = JSON.parse(snapshot);
    } catch {
      /* leave as a plain string */
    }
  }

  if (!snapshot || typeof snapshot !== "object") {
    return <DetailBlock title="Model input snapshot" items={[{ label: "Snapshot", value: NA }]} />;
  }

  const items = Object.entries(snapshot as Record<string, unknown>).map(([key, v]) => ({
    label: key.replace(/_/g, " "),
    value: isBlank(v) ? NA : typeof v === "object" ? JSON.stringify(v) : String(v),
  }));

  return <DetailBlock title="Model input snapshot" items={items} />;
}

function DetailDrawer({ config, row, onClose }: { config: TabConfig; row: Rec; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${config.title(row)} details`}
        onClick={(e) => e.stopPropagation()}
        className="ml-auto flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#09090a]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5 dark:border-white/[0.07]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{config.label}</p>
            <h3 className="mt-1 truncate text-lg font-semibold text-[#0b2545] dark:text-white">{config.title(row)}</h3>
            <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-zinc-400">{config.subtitle(row)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/[0.06]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          {config.sections(row).map((section) => (
            <DetailBlock key={section.title} {...section} />
          ))}
          {config.extra?.(row)}
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RecordsClient() {
  const [tab, setTab] = useState<TabKey>("members");
  const [data, setData] = useState<Partial<Record<TabKey, Rec[]>>>({});
  const [errors, setErrors] = useState<Partial<Record<TabKey, string>>>({});
  const [loadingTab, setLoadingTab] = useState<TabKey | null>(null);
  const loaded = useRef<Set<TabKey>>(new Set());

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Rec | null>(null);

  const config = TABS.find((t) => t.key === tab)!;

  const loadTab = useCallback(async (key: TabKey) => {
    const cfg = TABS.find((t) => t.key === key)!;
    setLoadingTab(key);
    setErrors((prev) => ({ ...prev, [key]: "" }));

    try {
      const response = await apiFetch(cfg.path);
      if (!response.ok) throw new Error(`Could not load ${cfg.label.toLowerCase()} (${response.status}).`);
      const body = await response.json();
      setData((prev) => ({ ...prev, [key]: (body[cfg.listKey] ?? []) as Rec[] }));
      loaded.current.add(key);
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        [key]: e instanceof Error ? e.message : `Could not load ${cfg.label.toLowerCase()}.`,
      }));
    } finally {
      setLoadingTab((current) => (current === key ? null : current));
    }
  }, []);

  useEffect(() => {
    if (!loaded.current.has(tab)) void loadTab(tab);
  }, [tab, loadTab]);

  function switchTab(key: TabKey) {
    setTab(key);
    setSearch("");
    setStatus("all");
    setFrom("");
    setTo("");
    setPage(1);
    setSelected(null);
  }

  const rows = data[tab] ?? [];
  const loading = loadingTab === tab;

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && !config.search(row).toLowerCase().includes(needle)) return false;
      if (status !== "all" && config.status(row).toLowerCase() !== status) return false;

      if (from || to) {
        const day = String(config.date(row) ?? "").slice(0, 10);
        if (!day) return false;
        if (from && day < from) return false;
        if (to && day > to) return false;
      }
      return true;
    });
  }, [rows, search, status, from, to, config]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const firstShown = filtered.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastShown = Math.min(current * pageSize, filtered.length);
  const hasFilters = Boolean(search || status !== "all" || from || to);

  function exportCsv() {
    const header = config.columns.map((c) => csvCell(c.header)).join(",");
    const lines = filtered.map((row) => config.columns.map((c) => csvCell(c.csv(row))).join(","));
    const csv = "\uFEFF" + [header, ...lines].join("\r\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `concord-${config.key}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setFrom("");
    setTo("");
    setPage(1);
  }

  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b2545] dark:text-white">System records</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            Browse and search the records held in the system.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void loadTab(tab)} disabled={loading} className={pillButton}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button" onClick={exportCsv} disabled={loading || filtered.length === 0} className={pillButton}>
            <FileSpreadsheet size={15} />
            Export CSV
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <div role="tablist" className="inline-flex min-w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-white/[0.07] dark:bg-[#0c0c0e] sm:min-w-0">
          {TABS.map((t) => {
            const TabIcon = t.icon;
            const active = t.key === tab;
            const count = data[t.key]?.length;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => switchTab(t.key)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm transition ${
                  active
                    ? "bg-teal-50 font-semibold text-teal-800 dark:bg-white/[0.06] dark:text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-[#0b2545] dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
                }`}
              >
                <TabIcon size={17} />
                {t.label}
                {count !== undefined && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-white/[0.08] dark:text-zinc-300">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className={`${cardSurface} overflow-hidden`}>
        <div className="flex items-center gap-3 border-b border-slate-200 p-5 dark:border-white/[0.07]">
          <div className={iconTile}>
            <Icon size={21} />
          </div>
          <div>
            <h3 className="font-semibold text-[#0b2545] dark:text-white">{config.label}</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">{config.description}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-4 dark:border-white/[0.07]">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={`Search ${config.label.toLowerCase()}...`}
              aria-label={`Search ${config.label}`}
              className={`${fieldClass} w-full pl-9`}
            />
          </div>

          <label className="text-xs text-slate-500 dark:text-zinc-400">
            <span className="mb-1 block">{config.statusLabel}</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={fieldClass}>
              <option value="all">All</option>
              {config.statusOptions.map((s) => (
                <option key={s} value={s}>{titleCase(s)}</option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-500 dark:text-zinc-400">
            <span className="mb-1 block">{config.dateLabel} from</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={fieldClass} />
          </label>

          <label className="text-xs text-slate-500 dark:text-zinc-400">
            <span className="mb-1 block">{config.dateLabel} to</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={fieldClass} />
          </label>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="pb-2.5 text-sm font-semibold text-teal-700 hover:underline dark:text-teal-300">
              Clear filters
            </button>
          )}
        </div>

        {errors[tab] && (
          <div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300">
            <p>{errors[tab]}</p>
            <button type="button" onClick={() => void loadTab(tab)} className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-2">
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                {config.columns.map((c) => (
                  <th key={c.header} className="px-5 py-3 font-medium">{c.header}</th>
                ))}
                <th className="px-5 py-3 font-medium"><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="px-5 py-12 text-center text-slate-500 dark:text-zinc-400">
                    Loading {config.label.toLowerCase()}...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="px-5 py-12 text-center text-slate-500 dark:text-zinc-400">
                    {rows.length === 0 ? `No ${config.label.toLowerCase()} on record yet.` : "No records match your filters."}
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr
                    key={config.id(row)}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                  >
                    {config.columns.map((c) => (
                      <td key={c.header} className="px-5 py-4 text-slate-600 dark:text-zinc-300">{c.cell(row)}</td>
                    ))}
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-white/[0.1] dark:text-zinc-300 dark:hover:bg-white/[0.05]"
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

        {/* Footer / pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-white/[0.07] dark:text-zinc-500">
          <span>
            {filtered.length === 0 ? "0 records" : `${firstShown}–${lastShown} of ${filtered.length}`}
            {hasFilters && ` (filtered from ${rows.length})`}
          </span>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              Rows
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-white/[0.1] dark:bg-[#111113] dark:text-zinc-200"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(current - 1)}
                disabled={current <= 1}
                aria-label="Previous page"
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.1] dark:hover:bg-white/[0.05]"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="px-2 tabular-nums">Page {current} of {pages}</span>
              <button
                type="button"
                onClick={() => setPage(current + 1)}
                disabled={current >= pages}
                aria-label="Next page"
                className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.1] dark:hover:bg-white/[0.05]"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {selected && <DetailDrawer config={config} row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}