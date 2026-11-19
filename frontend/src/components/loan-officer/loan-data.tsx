/* Shared types and helpers for the Loans, Repayments and Reports pages. */

export type LoanRecord = {
  loan_id: number;
  application_id: number;
  member_id: number;
  member_name?: string | null;
  loan_type?: string | null;
  loan_purpose?: string | null;
  loan_term?: number | null;
  repayment_frequency?: string | null;
  amount_approved?: number | null;
  interest_rate?: number | null;
  amount_due?: number | null;
  outstanding_balance?: number | null;
  disbursement_date?: string | null;
  loan_status?: string | null;
};

export type RepaymentRecord = {
  repayment_id: number;
  loan_id: number;
  payment_date?: string | null;
  amount_paid?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  remaining_balance?: number | null;
  recorded_by?: number | null;
  recorded_by_username?: string | null;
  created_at?: string | null;
  // Only present on GET /api/officer/repayments
  member_id?: number;
  member_name?: string | null;
  loan_type?: string | null;
  loan_status?: string | null;
};

/** Loans that can still receive a payment (the backend enforces the same rule). */
export const PAYING_STATUSES = ["active", "overdue", "defaulted"];

export function canRecordRepayment(loan: LoanRecord) {
  return PAYING_STATUSES.includes(loan.loan_status ?? "") && (loan.outstanding_balance ?? 0) > 0;
}

export const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Salary Deduction (Check-off)",
  "Cheque",
  "Mobile Money",
  "POS",
];

/** Today as YYYY-MM-DD in the officer's local time zone. */
export function todayIso() {
  return new Date().toLocaleDateString("en-CA");
}

/** Share of the amount due that has been repaid, from 0 to 1. */
export function repaidShare(loan: LoanRecord): number | null {
  const due = loan.amount_due ?? loan.amount_approved;
  if (!due || due <= 0) return null;
  const paid = due - (loan.outstanding_balance ?? due);
  return Math.min(1, Math.max(0, paid / due));
}

/** Short naira amounts for chart axes: ₦1.2M, ₦350K. */
export function compactNaira(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `₦${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `₦${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `₦${Math.round(value / 1e3)}K`;
  return `₦${Math.round(value)}`;
}