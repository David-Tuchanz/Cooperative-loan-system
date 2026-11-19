"use client";

import type { ChangeEvent } from "react";
import {
  DetailBlock,
  NA,
  fieldClass,
  fmtPercent,
  labelClass,
  naira,
  titleCase,
} from "@/components/loan-officer/officer-ui";

type Kind = "money" | "integer" | "percent" | "text" | "select";
type Option = { label: string; value: string };

export type FieldDef = {
  key: string;
  label: string;
  kind: Kind;
  group: string;
  options?: Option[];
  hint?: string;
};

const same = (values: string[]): Option[] => values.map((v) => ({ label: v, value: v }));

const FREQUENCIES: Option[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Annually", value: "annually" },
  { label: "Other", value: "other" },
];

const CONTRIBUTION_STATUS: Option[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Irregular", value: "irregular" },
];

export const ASSESSMENT_FIELDS: FieldDef[] = [
  { key: "employment_status", label: "Employment status", kind: "select", group: "Employment and income", options: same(["Employed", "Self-employed", "Unemployed", "Retired", "Student"]) },
  { key: "occupation", label: "Occupation", kind: "text", group: "Employment and income" },
  { key: "monthly_income", label: "Monthly income", kind: "money", group: "Employment and income" },
  { key: "existing_monthly_obligation", label: "Existing monthly obligations", kind: "money", group: "Employment and income" },

  { key: "savings_balance", label: "Savings balance", kind: "money", group: "Savings and contributions" },
  { key: "share_value", label: "Share value", kind: "money", group: "Savings and contributions" },
  { key: "monthly_contribution", label: "Monthly contribution", kind: "money", group: "Savings and contributions" },
  { key: "contribution_frequency", label: "Contribution frequency", kind: "select", group: "Savings and contributions", options: FREQUENCIES },
  { key: "contribution_status", label: "Contribution status", kind: "select", group: "Savings and contributions", options: CONTRIBUTION_STATUS },
  { key: "total_contributions", label: "Total contributions", kind: "money", group: "Savings and contributions" },

  { key: "previous_loan_count", label: "Previous loans", kind: "integer", group: "Credit history" },
  { key: "previous_default_count", label: "Previous defaults", kind: "integer", group: "Credit history" },
  { key: "previous_repayment_rate", label: "Previous repayment rate (%)", kind: "percent", group: "Credit history", hint: "Enter 0 to 100." },

  { key: "marital_status", label: "Marital status", kind: "select", group: "Personal and security", options: same(["Single", "Married", "Divorced", "Widowed"]) },
  { key: "number_of_dependents", label: "Dependents", kind: "integer", group: "Personal and security" },
  { key: "collateral_type", label: "Collateral type", kind: "select", group: "Personal and security", options: same(["None", "Property", "Vehicle", "Savings", "Equipment", "Other"]) },
  { key: "collateral_value", label: "Collateral value", kind: "money", group: "Personal and security" },
  { key: "guarantor_count", label: "Guarantors", kind: "integer", group: "Personal and security" },
];

export const ASSESSMENT_GROUPS = [...new Set(ASSESSMENT_FIELDS.map((f) => f.group))];

export type AssessmentForm = Record<string, string>;

export const emptyAssessmentForm = (): AssessmentForm =>
  Object.fromEntries(ASSESSMENT_FIELDS.map((f) => [f.key, ""]));

export function assessmentToForm(a: Record<string, unknown> | null | undefined): AssessmentForm {
  const form = emptyAssessmentForm();
  if (!a) return form;

  for (const f of ASSESSMENT_FIELDS) {
    const v = a[f.key];
    if (v === null || v === undefined) continue;
    form[f.key] =
      f.kind === "percent" && typeof v === "number" ? String(Number((v * 100).toFixed(2))) : String(v);
  }
  return form;
}

type PayloadResult =
  | { payload: Record<string, unknown>; error?: undefined }
  | { payload?: undefined; error: string };

/** Converts the form into the exact shape the backend validates. */
export function buildAssessmentPayload(form: AssessmentForm, requireIncome = false): PayloadResult {
  const payload: Record<string, unknown> = {};

  for (const f of ASSESSMENT_FIELDS) {
    const raw = (form[f.key] ?? "").trim();

    if (raw === "") {
      payload[f.key] = null;
      continue;
    }
    if (f.kind === "text" || f.kind === "select") {
      payload[f.key] = raw;
      continue;
    }

    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return { error: `${f.label} must be a valid non-negative number.` };

    if (f.kind === "integer") {
      if (!Number.isInteger(n)) return { error: `${f.label} must be a whole number.` };
      payload[f.key] = n;
    } else if (f.kind === "percent") {
      if (n > 100) return { error: `${f.label} must be between 0 and 100.` };
      payload[f.key] = Number((n / 100).toFixed(6)); // backend stores 0 to 1
    } else {
      payload[f.key] = n;
    }
  }

  if (requireIncome && payload.monthly_income === null) return { error: "Monthly income is required." };

  const loans = payload.previous_loan_count;
  const defaults = payload.previous_default_count;
  if (typeof loans === "number" && typeof defaults === "number" && defaults > loans) {
    return { error: "Previous defaults cannot exceed previous loans." };
  }

  return { payload };
}

function formatValue(f: FieldDef, v: unknown): string {
  if (v === null || v === undefined || v === "") return NA;
  if (f.kind === "money") return naira(typeof v === "number" ? v : Number(v));
  if (f.kind === "percent") return fmtPercent(typeof v === "number" ? v : Number(v), 100);
  if (f.key === "contribution_frequency" || f.key === "contribution_status") return titleCase(v);
  return String(v);
}

/** Read-only view of a saved assessment. */
export function AssessmentView({ assessment }: { assessment: Record<string, unknown> }) {
  return (
    <>
      {ASSESSMENT_GROUPS.map((group) => (
        <DetailBlock
          key={group}
          title={group}
          items={ASSESSMENT_FIELDS.filter((f) => f.group === group).map((f) => ({
            label: f.label,
            value: formatValue(f, assessment[f.key]),
          }))}
        />
      ))}
    </>
  );
}

/** Editable form, grouped the same way as the read-only view. */
export function AssessmentFields({
  form,
  setForm,
  disabled,
}: {
  form: AssessmentForm;
  setForm: (form: AssessmentForm) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-7">
      {ASSESSMENT_GROUPS.map((group) => (
        <section key={group} className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{group}</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {ASSESSMENT_FIELDS.filter((f) => f.group === group).map((f) => {
              const value = form[f.key] ?? "";
              const set = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                setForm({ ...form, [f.key]: e.target.value });
              const cls = `${fieldClass} mt-2 w-full`;

              const options =
                f.kind === "select" && value && !f.options?.some((o) => o.value === value)
                  ? [...(f.options ?? []), { label: value, value }]
                  : f.options;

              return (
                <label key={f.key} className={labelClass}>
                  {f.label}
                  {f.key === "monthly_income" && <span className="ml-1 text-red-500">*</span>}

                  {f.kind === "select" ? (
                    <select disabled={disabled} value={value} onChange={set} className={cls}>
                      <option value="">Not specified</option>
                      {options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : f.kind === "text" ? (
                    <input disabled={disabled} value={value} onChange={set} maxLength={100} className={cls} />
                  ) : (
                    <input
                      disabled={disabled}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={f.kind === "percent" ? 100 : undefined}
                      step={f.kind === "integer" ? 1 : "0.01"}
                      value={value}
                      onChange={set}
                      className={cls}
                    />
                  )}

                  {f.hint && <span className="mt-1.5 block text-xs font-normal text-slate-500 dark:text-zinc-500">{f.hint}</span>}
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}