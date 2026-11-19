
"use client";

import { useState } from "react";
import { PAYMENT_METHODS } from "./loan-data";

export type RepaymentResult = {
  message: string;
  repayment: {
    repayment_id: number;
    loan_id: number;
    amount_paid: number | string;
    payment_date: string;
    payment_method: string;
    payment_status: string;
    remaining_balance: number | string;
  };
  loan: {
    loan_id: number;
    loan_status: string;
    outstanding_balance: number | string;
  };
};

type RepaymentFormProps = {
  loanId: number;
  outstanding: number;
  onRecorded: (result: RepaymentResult) => void;
  onCancel: () => void;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

function todayIso() {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
}

function formatNaira(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
}

export function RepaymentForm({
  loanId,
  outstanding,
  onRecorded,
  onCancel,
}: RepaymentFormProps) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const numericAmount = Number(amount);

  const amountIsValid =
    amount.trim() !== "" &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= outstanding;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!amountIsValid) {
      setError(
        numericAmount > outstanding
          ? "Payment cannot exceed the outstanding balance."
          : "Enter a valid payment amount greater than zero."
      );
      return;
    }

    if (!paymentMethod) {
      setError("Please select a payment method.");
      return;
    }

    if (!paymentDate) {
      setError("Please select the payment date.");
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/repayments/loans/${loanId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount_paid: numericAmount,
            payment_method: paymentMethod,
            payment_date: paymentDate,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to record this repayment."
        );
      }

      onRecorded(data as RepaymentResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.06] p-4">
        <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
          Outstanding balance
        </p>
        <p className="mt-1 text-xl font-semibold text-[#0b2545] dark:text-white">
          {formatNaira(outstanding)}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
          Payment cannot exceed this balance.
        </p>
      </div>

      <div>
        <label
          htmlFor="repayment-amount"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-zinc-200"
        >
          Amount paid (₦)
        </label>
        <input
          id="repayment-amount"
          type="number"
          min="0.01"
          max={outstanding}
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Enter payment amount"
          required
          disabled={submitting}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:opacity-60 dark:border-white/[0.12] dark:bg-[#111113] dark:text-white"
        />
        {amount.trim() !== "" && numericAmount > outstanding && (
          <p className="mt-1 text-xs text-red-500">
            Amount exceeds the outstanding balance.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="payment-method"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-zinc-200"
        >
          Payment method
        </label>
        <select
          id="payment-method"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          required
          disabled={submitting}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:opacity-60 dark:border-white/[0.12] dark:bg-[#111113] dark:text-white"
        >
          <option value="">Select payment method</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="payment-date"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-zinc-200"
        >
          Payment date
        </label>
        <input
          id="payment-date"
          type="date"
          value={paymentDate}
          max={todayIso()}
          onChange={(event) => setPaymentDate(event.target.value)}
          required
          disabled={submitting}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:opacity-60 dark:border-white/[0.12] dark:bg-[#111113] dark:text-white"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.12] dark:text-zinc-300 dark:hover:bg-white/[0.05]"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting || !amountIsValid || !paymentMethod}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Recording..." : "Record repayment"}
        </button>
      </div>
    </form>
  );
}
