
"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  CheckCircle2,
  FileText,
  HandCoins,
  Home,
  LogOut,
  Settings,
  Wallet,
  ShieldCheck,
  Info,
  AlertCircle,
  X,
  ArrowLeft,
  Loader2,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { MemberAvatar } from "@/components/member-avatar";
import { apiFetch } from "@/lib/api";
import MemberNotifications from "@/components/member-notifications";

type Member = {
  username?: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  date_of_birth?: string;
  profile_picture_url?: string | null;
};

type ApplicationForm = {
  amount_requested: string;
  loan_type: string;
  loan_purpose: string;
  loan_term: string;
  repayment_frequency: string;
  employment_status: string;
  occupation: string;
  monthly_income: string;
  existing_monthly_obligation: string;
  marital_status: string;
  number_of_dependents: string;
  savings_balance: string;
  share_value: string;
  monthly_contribution: string;
  contribution_frequency: string;
  contribution_status: string;
  total_contributions: string;
  previous_loan_count: string;
  previous_default_count: string;
  previous_repayment_rate: string;
  collateral_type: string;
  collateral_value: string;
  guarantor_count: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const TERMS_VERSION = "1.0";

const navigation = [
  { label: "Overview", href: "/member/dashboard", icon: Home },
  { label: "My Loans", href: "/member/loans", icon: HandCoins },
  { label: "Apply for Loan", href: "/member/apply", icon: FileText },
  { label: "Repayments", href: "/member/repayments", icon: Wallet },
  { label: "My Profile", href: "/member/profile", icon: Settings },
];

const cardSurface =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/[0.07] dark:bg-[#0c0c0e] dark:bg-gradient-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-16px_rgba(0,0,0,0.8)]";

const initialForm: ApplicationForm = {
  amount_requested: "",
  loan_type: "",
  loan_purpose: "",
  loan_term: "",
  repayment_frequency: "",
  employment_status: "",
  occupation: "",
  monthly_income: "",
  existing_monthly_obligation: "",
  marital_status: "",
  number_of_dependents: "",
  savings_balance: "",
  share_value: "",
  monthly_contribution: "",
  contribution_frequency: "",
  contribution_status: "",
  total_contributions: "",
  previous_loan_count: "",
  previous_default_count: "",
  previous_repayment_rate: "",
  collateral_type: "",
  collateral_value: "",
  guarantor_count: "",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 dark:border-white/[0.1] dark:bg-[#111113] dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-teal-500";

const labelClass =
  "block text-sm font-medium text-slate-700 dark:text-zinc-300";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function numberOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerOrNull(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  min,
  max,
  step,
  help,
}: {
  label: string;
  name: keyof ApplicationForm;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  max?: string;
  step?: string;
  help?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        className={inputClass}
      />
      {help && (
        <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-zinc-500">
          {help}
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  placeholder = "Select an option",
}: {
  label: string;
  name: keyof ApplicationForm;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className={inputClass}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ApplyForLoanPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [legalAgeConfirmed, setLegalAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [applicationId, setApplicationId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const savedUser = sessionStorage.getItem("current_user");
      if (savedUser) {
        setMember(JSON.parse(savedUser) as Member);
      }
    } catch {
      setMember(null);
    }

    const loadProfile = async () => {
      const token = sessionStorage.getItem("access_token");
      if (!token) return;

      try {
        const response = await apiFetch(
          `${API_URL}/api/members/me/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            cache: "no-store",
          }
        );

        if (!response.ok) return;

        const data = await response.json();
        const profile = data.profile || data.member || data;

        setMember((previous) => ({
          ...previous,
          ...profile,
          profile_picture_url:
            profile.profile_picture_url ||
            data.profile_picture_url ||
            previous?.profile_picture_url,
        }));
      } catch {
        // The application form can still be used if profile details fail to load.
      }
    };

    void loadProfile();
  }, []);

  const username = member?.username || "Member";

const displayName =
  member?.full_name ||
  [member?.first_name, member?.last_name].filter(Boolean).join(" ") ||
  member?.name ||
  username;

  function signOut() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("current_user");
    window.location.href = "/login";
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!legalAgeConfirmed) {
      setError("Please confirm that you are at least 18 years old.");
      return;
    }

    if (!termsAccepted) {
      setError("Please read and accept the Terms and Conditions.");
      return;
    }

    if (!form.monthly_income || Number(form.monthly_income) <= 0) {
      setError("Please enter a valid monthly income.");
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const repaymentRate =
      form.previous_repayment_rate.trim() === ""
        ? null
        : Number(form.previous_repayment_rate) / 100;

    if (
      repaymentRate !== null &&
      (!Number.isFinite(repaymentRate) ||
        repaymentRate < 0 ||
        repaymentRate > 1)
    ) {
      setError("Previous repayment rate must be between 0 and 100.");
      return;
    }

    const payload = {
      amount_requested: Number(form.amount_requested),
      loan_type: form.loan_type,
      loan_purpose: form.loan_purpose.trim(),
      loan_term: Number(form.loan_term),
      repayment_frequency: form.repayment_frequency,
      legal_age_confirmed: true,
      terms_accepted: true,
      terms_version: TERMS_VERSION,
      assessment: {
        employment_status: form.employment_status || null,
        occupation: form.occupation.trim() || null,
        monthly_income: numberOrNull(form.monthly_income),
        existing_monthly_obligation: numberOrNull(
          form.existing_monthly_obligation
        ),
        marital_status: form.marital_status || null,
        number_of_dependents: integerOrNull(form.number_of_dependents),
        savings_balance: numberOrNull(form.savings_balance),
        share_value: numberOrNull(form.share_value),
        monthly_contribution: numberOrNull(form.monthly_contribution),
        contribution_frequency: form.contribution_frequency || null,
        contribution_status: form.contribution_status || null,
        total_contributions: numberOrNull(form.total_contributions),
        previous_loan_count: integerOrNull(form.previous_loan_count),
        previous_default_count: integerOrNull(
          form.previous_default_count
        ),
        previous_repayment_rate: repaymentRate,
        collateral_type: form.collateral_type || null,
        collateral_value: numberOrNull(form.collateral_value),
        guarantor_count: integerOrNull(form.guarantor_count),
      },
    };

    try {
      setSubmitting(true);

      const response = await apiFetch(
        `${API_URL}/api/loan-applications/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        setError("Your session has expired. Please sign in again.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Unable to submit your application. Please check your information."
        );
      }

      const newApplicationId =
        data.application?.application_id ??
        data.application_id ??
        data.data?.application_id ??
        null;

      setApplicationId(
        newApplicationId ? Number(newApplicationId) : null
      );
      setSuccess(
        data.message || "Your loan application was submitted successfully."
      );
      setForm(initialForm);
      setLegalAgeConfirmed(false);
      setTermsAccepted(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  const canSubmit =
    legalAgeConfirmed && termsAccepted && !submitting;

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
              const active = item.href === "/member/apply";

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
                Apply for a Loan
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

          <div className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8">
            <div>
              <Link
                href="/member/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-teal-700 dark:text-zinc-400 dark:hover:text-white"
              >
                <ArrowLeft size={16} />
                Back to dashboard
              </Link>

              <div className="mt-5">
                <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
                  LOAN APPLICATION
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0b2545] dark:text-white sm:text-3xl">
                  Apply for a loan
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-zinc-400">
                  Complete the form below with your loan details and financial
                  information. Your application will be submitted to the
                  cooperative for assessment.
                </p>
              </div>
            </div>

            {success && (
              <div
                role="status"
                className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/20 dark:bg-emerald-400/[0.06]"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Application submitted
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-emerald-700 dark:text-emerald-200/80">
                      {success}
                    </p>
                    {applicationId && (
                      <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        Application reference: #{applicationId}
                      </p>
                    )}
                    <Link
                      href="/member/loans"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 dark:bg-emerald-500 dark:text-[#06110d] dark:hover:bg-emerald-400"
                    >
                      View my applications
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p>{error}</p>
                  {error.toLowerCase().includes("session has expired") && (
                    <button
                      type="button"
                      onClick={signOut}
                      className="mt-2 font-semibold underline underline-offset-2"
                    >
                      Sign in again
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <section className={`${cardSurface} p-5 sm:p-7`}>
                <div className="mb-6 flex items-start gap-3">
                  <div className="rounded-xl bg-teal-50 p-3 text-teal-800 dark:bg-white/[0.07] dark:text-zinc-200">
                    <Info size={21} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0b2545] dark:text-white">
                      Important Information
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                      Please ensure that all information provided in this loan
                      application is accurate, complete, and truthful. Any
                      false, misleading, incomplete, or altered information may
                      affect the assessment of your application and could
                      result in its rejection.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                      CONCORD uses the information provided to assess your loan
                      application and support the cooperative&apos;s lending
                      decision.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 dark:border-teal-400/10 dark:bg-teal-400/[0.04]">
                  <p className="text-sm leading-6 text-teal-900 dark:text-teal-200">
                    Fields marked with <span className="font-semibold">*</span>{" "}
                    are required. Please provide information that reflects
                    your current financial position.
                  </p>
                </div>
              </section>

              <section className={`${cardSurface} p-5 sm:p-7`}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Section 01
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#0b2545] dark:text-white">
                    Loan Details
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    Tell us about the loan you want to apply for.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Amount requested (₦)"
                    name="amount_requested"
                    value={form.amount_requested}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 150000"
                    min="1"
                    step="0.01"
                    required
                  />

                  <SelectField
                    label="Loan type"
                    name="loan_type"
                    value={form.loan_type}
                    onChange={handleInputChange}
                    required
                    options={[
                      { label: "Personal Loan", value: "Personal Loan" },
                      { label: "Business Loan", value: "Business Loan" },
                      { label: "Education Loan", value: "Education Loan" },
                      { label: "Emergency Loan", value: "Emergency Loan" },
                      { label: "Other", value: "Other" },
                    ]}
                  />

                  <div className="sm:col-span-2">
                    <label htmlFor="loan_purpose" className={labelClass}>
                      Purpose of loan
                      <span className="ml-1 text-red-500">*</span>
                    </label>
                    <textarea
                      id="loan_purpose"
                      name="loan_purpose"
                      value={form.loan_purpose}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          loan_purpose: event.target.value,
                        }))
                      }
                      required
                      rows={3}
                      placeholder="Explain briefly what you intend to use the loan for."
                      className={inputClass}
                    />
                  </div>

                  <Field
                    label="Loan term (months)"
                    name="loan_term"
                    value={form.loan_term}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 12"
                    min="1"
                    step="1"
                    required
                  />

                  <SelectField
                    label="Repayment frequency"
                    name="repayment_frequency"
                    value={form.repayment_frequency}
                    onChange={handleInputChange}
                    required
                    options={[
                      { label: "Weekly", value: "weekly" },
                      { label: "Monthly", value: "monthly" },
                      { label: "Quarterly", value: "quarterly" },
                    ]}
                  />
                </div>
              </section>

              <section className={`${cardSurface} p-5 sm:p-7`}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Section 02
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#0b2545] dark:text-white">
                    Employment and Income
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    Provide details about your employment and monthly income.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField
                    label="Employment status"
                    name="employment_status"
                    value={form.employment_status}
                    onChange={handleInputChange}
                    required
                    options={[
                      { label: "Employed", value: "Employed" },
                      { label: "Self-employed", value: "Self-employed" },
                      { label: "Unemployed", value: "Unemployed" },
                      { label: "Retired", value: "Retired" },
                      { label: "Student", value: "Student" },
                    ]}
                  />

                  <Field
                    label="Occupation"
                    name="occupation"
                    value={form.occupation}
                    onChange={handleInputChange}
                    placeholder="e.g. Teacher, Trader, Accountant"
                  />

                  <Field
                    label="Monthly income (₦)"
                    name="monthly_income"
                    value={form.monthly_income}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 85000"
                    min="0.01"
                    step="0.01"
                    required
                  />

                  <Field
                    label="Existing monthly obligations (₦)"
                    name="existing_monthly_obligation"
                    value={form.existing_monthly_obligation}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 10000"
                    min="0"
                    step="0.01"
                    help="Include other loan repayments or regular financial commitments."
                  />

                  <SelectField
                    label="Marital status"
                    name="marital_status"
                    value={form.marital_status}
                    onChange={handleInputChange}
                    options={[
                      { label: "Single", value: "Single" },
                      { label: "Married", value: "Married" },
                      { label: "Divorced", value: "Divorced" },
                      { label: "Widowed", value: "Widowed" },
                    ]}
                  />

                  <Field
                    label="Number of dependents"
                    name="number_of_dependents"
                    value={form.number_of_dependents}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 2"
                    min="0"
                    step="1"
                  />
                </div>
              </section>

              <section className={`${cardSurface} p-5 sm:p-7`}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Section 03
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#0b2545] dark:text-white">
                    Cooperative Contributions and Savings
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    Enter your savings and contribution information.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Savings balance (₦)"
                    name="savings_balance"
                    value={form.savings_balance}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 30000"
                    min="0"
                    step="0.01"
                  />

                  <Field
                    label="Share value (₦)"
                    name="share_value"
                    value={form.share_value}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 10000"
                    min="0"
                    step="0.01"
                  />

                  <Field
                    label="Monthly contribution (₦)"
                    name="monthly_contribution"
                    value={form.monthly_contribution}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 5000"
                    min="0"
                    step="0.01"
                  />

                  <SelectField
                    label="Contribution frequency"
                    name="contribution_frequency"
                    value={form.contribution_frequency}
                    onChange={handleInputChange}
                    options={[
                      { label: "Weekly", value: "weekly" },
                      { label: "Monthly", value: "monthly" },
                      { label: "Quarterly", value: "quarterly" },
                      { label: "Annually", value: "annually" },
                      { label: "Other", value: "other" },
                    ]}
                  />

                  <SelectField
                    label="Contribution status"
                    name="contribution_status"
                    value={form.contribution_status}
                    onChange={handleInputChange}
                    options={[
                      { label: "Active", value: "active" },
                      { label: "Inactive", value: "inactive" },
                      { label: "Irregular", value: "irregular" },
                    ]}
                  />

                  <Field
                    label="Total contributions to date (₦)"
                    name="total_contributions"
                    value={form.total_contributions}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 60000"
                    min="0"
                    step="0.01"
                  />
                </div>
              </section>

              <section className={`${cardSurface} p-5 sm:p-7`}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Section 04
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#0b2545] dark:text-white">
                    Previous Loan History
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    Provide information about your previous cooperative loans.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Number of previous loans"
                    name="previous_loan_count"
                    value={form.previous_loan_count}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 1"
                    min="0"
                    step="1"
                  />

                  <Field
                    label="Number of previous defaults"
                    name="previous_default_count"
                    value={form.previous_default_count}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 0"
                    min="0"
                    step="1"
                  />

                  <Field
                    label="Previous repayment rate (%)"
                    name="previous_repayment_rate"
                    value={form.previous_repayment_rate}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 95"
                    min="0"
                    max="100"
                    step="0.01"
                    help="Enter a percentage from 0 to 100. Enter 100 if all previous repayments were made as required."
                  />
                </div>
              </section>

              <section className={`${cardSurface} p-5 sm:p-7`}>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Section 05
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#0b2545] dark:text-white">
                    Collateral and Guarantors
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
                    Provide details of any collateral or guarantors supporting
                    your application.
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <SelectField
                    label="Collateral type"
                    name="collateral_type"
                    value={form.collateral_type}
                    onChange={handleInputChange}
                    options={[
                      { label: "None", value: "None" },
                      { label: "Property", value: "Property" },
                      { label: "Vehicle", value: "Vehicle" },
                      { label: "Savings", value: "Savings" },
                      { label: "Equipment", value: "Equipment" },
                      { label: "Other", value: "Other" },
                    ]}
                  />

                  <Field
                    label="Estimated collateral value (₦)"
                    name="collateral_value"
                    value={form.collateral_value}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 100000"
                    min="0"
                    step="0.01"
                  />

                  <Field
                    label="Number of guarantors"
                    name="guarantor_count"
                    value={form.guarantor_count}
                    onChange={handleInputChange}
                    type="number"
                    placeholder="e.g. 1"
                    min="0"
                    step="1"
                  />
                </div>
              </section>

              <section className={`${cardSurface} p-5 sm:p-7`}>
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Final Section
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#0b2545] dark:text-white">
                    Applicant Declaration
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-zinc-400">
                    Review the declarations below before submitting your
                    application.
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-teal-300 dark:border-white/[0.08] dark:hover:border-white/[0.2]">
                    <input
                      type="checkbox"
                      checked={legalAgeConfirmed}
                      onChange={(event) =>
                        setLegalAgeConfirmed(event.target.checked)
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
                    />
                    <span className="text-sm leading-6 text-slate-700 dark:text-zinc-300">
                      I confirm that I am of legal age (18 years or older) and
                      legally eligible to apply for this loan.
                    </span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-teal-300 dark:border-white/[0.08] dark:hover:border-white/[0.2]">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) =>
                        setTermsAccepted(event.target.checked)
                      }
                      className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
                    />
                    <span className="text-sm leading-6 text-slate-700 dark:text-zinc-300">
                      I have read, understood, and agree to the{" "}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setTermsOpen(true);
                        }}
                        className="font-semibold text-teal-700 underline underline-offset-2 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
                      >
                        Terms and Conditions
                      </button>{" "}
                      governing this loan application.
                    </span>
                  </label>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/[0.035]">
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-400"
                  />
                  <p className="text-xs leading-5 text-slate-500 dark:text-zinc-400">
                    Your application will be reviewed by an authorised loan
                    officer. The system may use machine learning to support
                    risk assessment, but the final lending decision remains
                    with the cooperative.
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500 dark:text-zinc-500">
                    Please review your information before submitting.
                  </p>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b2545] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#16395f] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Submitting application...
                      </>
                    ) : (
                      <>
                        Submit application
                        <CheckCircle2 size={17} />
                      </>
                    )}
                  </button>
                </div>

                {!canSubmit && !submitting && (
                  <p className="mt-3 text-right text-xs text-slate-400 dark:text-zinc-500">
                    Confirm your legal age and accept the Terms and Conditions
                    to enable submission.
                  </p>
                )}
              </section>
            </form>

            <footer className="pb-3 text-center text-xs text-slate-400 dark:text-zinc-500">
              Concord Cooperative Loan Management System
            </footer>
          </div>
        </div>
      </div>

      {termsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setTermsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/[0.1] dark:bg-[#101012]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-white/[0.08] sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                  CONCORD Member Portal
                </p>
                <h2
                  id="terms-title"
                  className="mt-1 text-xl font-semibold text-[#0b2545] dark:text-white"
                >
                  Loan Application Terms and Conditions
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                  Document Version {TERMS_VERSION}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                aria-label="Close terms and conditions"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-6 text-sm leading-7 text-slate-600 dark:text-zinc-300 sm:px-7">
              <p className="mb-5">
                Please read these Terms and Conditions carefully before
                submitting a loan application through the CONCORD Cooperative
                Loan Management System.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                1. Introduction
              </h3>
              <p className="mb-4">
                These terms govern the submission and assessment of loan
                applications through the system. By submitting an application,
                the applicant agrees to comply with the requirements and
                procedures established by the cooperative.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                2. Eligibility
              </h3>
              <p className="mb-4">
                Applicants must be at least 18 years old and must satisfy the
                cooperative&apos;s membership and loan eligibility
                requirements. Submission of an application does not guarantee
                approval.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                3. Accuracy of Information
              </h3>
              <p className="mb-4">
                Applicants must provide accurate, complete, current, and
                truthful information. This includes personal details,
                employment information, income, savings, contributions,
                previous loan history, collateral, and guarantor information.
                False, misleading, incomplete, or altered information may
                result in rejection or further action under the
                cooperative&apos;s policies.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                4. Application and Assessment
              </h3>
              <p className="mb-4">
                Submitted applications will be reviewed by authorised
                cooperative personnel. The system may use machine learning
                techniques to analyse application information and produce a
                risk classification of Low, Medium, or High. This assessment
                supports the review process and does not independently approve
                or reject a loan. The final decision rests with the authorised
                cooperative officer.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                5. Approval and Disbursement
              </h3>
              <p className="mb-4">
                A submitted application remains subject to review and approval.
                The cooperative may approve, decline, or request additional
                information. Where a loan is approved, the approved amount,
                applicable interest, repayment schedule, and disbursement
                arrangements will be communicated to the applicant.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                6. Repayment Obligations
              </h3>
              <p className="mb-4">
                Applicants whose loans are approved must repay the loan
                according to the agreed repayment schedule and terms provided
                by the cooperative. Applicants are responsible for
                understanding their repayment obligations before accepting an
                approved loan.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                7. Late Repayment and Default
              </h3>
              <p className="mb-4">
                Failure to make repayments when due may result in late
                repayment or default records. Any applicable consequences,
                recovery procedures, or additional charges will be governed by
                the cooperative&apos;s approved lending policies and the
                agreement applicable to the loan.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                8. Data Collection and Privacy
              </h3>
              <p className="mb-4">
                Information submitted through the system will be used for
                membership verification, loan application processing, risk
                assessment, loan administration, and related cooperative
                activities. Access to applicant information should be limited
                to authorised personnel and handled in accordance with
                applicable data protection requirements and the
                cooperative&apos;s privacy policies.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                9. Applicant Responsibilities
              </h3>
              <p className="mb-4">
                Applicants are responsible for ensuring that their account is
                used appropriately, providing requested supporting information,
                protecting their login credentials, and notifying the
                cooperative of relevant changes to information supplied during
                the application process.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                10. Rejection or Withdrawal
              </h3>
              <p className="mb-4">
                The cooperative may reject an application that does not meet
                its lending requirements or contains insufficient or
                unverifiable information. An applicant who wishes to withdraw
                an application should contact the cooperative or use any
                withdrawal facility made available in the system.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                11. Amendments
              </h3>
              <p className="mb-4">
                The cooperative may review and update these terms when
                necessary. Applicants will be expected to review the applicable
                version presented when submitting an application.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                12. Complaints and Dispute Resolution
              </h3>
              <p className="mb-4">
                Questions, complaints, or disputes relating to a loan
                application should first be directed to the cooperative
                through its recognised communication or complaint channels.
                Applicable cooperative policies and relevant laws will guide
                the resolution process.
              </p>

              <h3 className="mb-1 font-semibold text-[#0b2545] dark:text-white">
                13. Acceptance
              </h3>
              <p className="mb-4">
                By selecting the acceptance checkbox and submitting an
                application, the applicant confirms that they have read,
                understood, and agreed to these Terms and Conditions and that
                the information supplied is accurate to the best of their
                knowledge.
              </p>

              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/[0.05] dark:text-amber-200">
                <strong>Document status:</strong> Version 1.0 is open to
                review and modification. The cooperative should
                formally review and approve these terms and align them with
                its lending policies and applicable legal requirements.
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 dark:border-white/[0.08] sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className="text-xs text-slate-500 dark:text-zinc-500">
                Version {TERMS_VERSION}
              </p>
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true);
                  setTermsOpen(false);
                }}
                className="rounded-xl bg-[#0b2545] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16395f] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                I have read the terms
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
