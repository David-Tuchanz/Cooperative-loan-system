
"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const slides = [
  {
    eyebrow: "The challenge",
    title: "Access to loans should not depend on guesswork.",
    description:
      "Cooperative societies often rely on manual assessments and subjective decisions when evaluating loan applications. This can make it difficult to identify borrowers who may struggle with repayment.",
    image: "/images/register/cooperative-challenge.jpg",
    point: "Making loan assessment more reliable",
  },
  {
    eyebrow: "A smarter approach",
    title: "Better decisions start with better insights.",
    description:
      "Loan applications contain useful information about members, their financial capacity and previous repayment behaviour. CONCORD helps bring these details together for a clearer assessment.",
    image: "/images/register/financial-assessment.png",
    point: "Turning member data into useful insights",
  },
  {
    eyebrow: "The CONCORD solution",
    title: "Machine learning that supports human judgement.",
    description:
      "Our system analyses relevant loan and repayment information to estimate default risk and classify applications as Low, Medium or High risk. Loan officers remain responsible for the final decision.",
    image: "/images/register/risk-analysis.png",
    point: "Supporting informed lending decisions",
  },
  {
    eyebrow: "Better loan management",
    title: "One platform for the entire lending process.",
    description:
      "From loan applications and approval decisions to repayment records and reports, CONCORD helps cooperative societies manage their lending activities in one organised platform.",
    image: "/images/register/loan-management.png",
    point: "Bringing cooperative lending together",
  },
];

const initialForm = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  phone: "",
  date_of_birth: "",
  gender: "",
  password: "",
  confirm_password: "",
};

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-300/80 bg-white/75 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:opacity-60 dark:border-white/15 dark:bg-slate-950/35 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-300 dark:focus:ring-teal-300/20";

const labelClass =
  "mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-200";

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [activeSlide, setActiveSlide] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  function changeSlide(direction: number) {
    setActiveSlide(
      (current) =>
        (current + direction + slides.length) % slides.length
    );
  }

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirm_password) {
      setError("Your passwords do not match.");
      return;
    }

    if (form.password.length < 12) {
      setError("Your password must contain at least 12 characters.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the terms and conditions to continue.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          username: form.username,
          email: form.email,
          phone: form.phone,
          date_of_birth: form.date_of_birth,
          gender: form.gender,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Registration failed."
        );
      }

      setSuccess(
        "Your account has been created successfully. You can now sign in."
      );

      setForm(initialForm);
      setAcceptedTerms(false);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Unable to reach the server. Please check that the backend is running."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const currentSlide = slides[activeSlide];

  const slideImageStyle = {
    backgroundImage: `linear-gradient(180deg, rgba(5, 15, 31, 0.08) 0%, rgba(5, 15, 31, 0.18) 35%, rgba(5, 15, 31, 0.88) 100%), url("${currentSlide.image}")`,
  } as CSSProperties;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0b2545] text-slate-900 dark:bg-[#071426]">
      {/* Background atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(62,142,138,0.38),transparent_42%),radial-gradient(ellipse_at_90%_80%,rgba(21,57,107,0.65),transparent_45%)]"
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-7">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between sm:mb-7">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-white"
            aria-label="CONCORD home"
          >
            <LogoMark
              title="CONCORD"
              className="h-10 w-10 shrink-0"
              style={{ color: "#ffffff", "--logo-key": "#7fd6c2" } as CSSProperties}
            />

            <span>
              <span className="block text-sm font-bold uppercase tracking-[0.2em]">
                CONCORD
              </span>
              <span className="mt-0.5 hidden text-[10px] text-white/65 sm:block">
                Cooperative Loan Management System
              </span>
            </span>
          </Link>

          <div className="rounded-full border border-white/20 bg-white/10 p-1 text-white shadow-lg backdrop-blur-xl">
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <div className="grid flex-1 items-stretch gap-5 lg:grid-cols-[1.04fr_0.96fr] lg:gap-7">
          {/* Left carousel panel */}
          <section className="relative min-h-[440px] overflow-hidden rounded-[26px] border border-white/20 bg-slate-900 shadow-2xl shadow-black/20 sm:min-h-[520px] lg:min-h-[680px]">
            <div
              key={activeSlide}
              className="absolute inset-0 bg-cover bg-center transition-all duration-700"
              style={slideImageStyle}
            />

            <div className="absolute inset-0 bg-gradient-to-br from-[#0b2545]/25 via-transparent to-[#061426]/35" />

            <div className="relative flex h-full min-h-[440px] flex-col justify-between p-5 sm:min-h-[520px] sm:p-8 lg:min-h-[680px] lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-xl transition hover:bg-white/20"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to home
                </Link>

                <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-white/85 backdrop-blur-xl">
                  {String(activeSlide + 1).padStart(2, "0")} / 04
                </span>
              </div>

              {/* Slide content */}
              <div
                key={`content-${activeSlide}`}
                className="register-slide-content max-w-[590px]"
              >
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-100 backdrop-blur-xl">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#7fd6c2]" />
                  {currentSlide.eyebrow}
                </span>

                <div className="rounded-3xl border border-white/20 bg-[#071426]/55 p-5 text-white shadow-2xl backdrop-blur-xl sm:p-7 lg:p-8">
                  <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl lg:text-[2.5rem]">
                    {currentSlide.title}
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
                    {currentSlide.description}
                  </p>

                  <div className="mt-6 flex items-center gap-2 text-xs font-medium text-teal-200 sm:text-sm">
                    <span className="h-px w-7 bg-teal-300" />
                    {currentSlide.point}
                  </div>
                </div>

                {/* Carousel navigation */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {slides.map((slide, index) => (
                      <button
                        key={slide.eyebrow}
                        type="button"
                        onClick={() => setActiveSlide(index)}
                        aria-label={`Go to slide ${index + 1}`}
                        aria-current={activeSlide === index ? "true" : undefined}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          activeSlide === index
                            ? "w-9 bg-white"
                            : "w-3 bg-white/35 hover:bg-white/65"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeSlide(-1)}
                      aria-label="Previous slide"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-lg transition hover:bg-white/20"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => changeSlide(1)}
                      aria-label="Next slide"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-lg transition hover:bg-white/20"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right registration panel */}
          <section className="register-glass relative flex items-center justify-center rounded-[26px] border border-white/60 p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-7 lg:p-8">
            <div className="w-full max-w-[540px]">
              <div className="mb-6">
                <div className="mb-5 flex items-center gap-2">
                  <LogoMark
                    className="h-7 w-7 text-[#15396b] dark:text-teal-200"
                    style={{ "--logo-key": "#3e8e8a" } as CSSProperties}
                  />
                  <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    CONCORD
                  </span>
                </div>

                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[1.8rem]">
                  Create your account
                </h1>

                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                  Join your cooperative and get started.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="first_name" className={labelClass}>
                      First name
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Enter first name"
                      autoComplete="given-name"
                      maxLength={50}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="last_name" className={labelClass}>
                      Last name
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Enter last name"
                      autoComplete="family-name"
                      maxLength={50}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="example@email.com"
                      autoComplete="email"
                      maxLength={100}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className={labelClass}>
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Choose a username"
                      autoComplete="username"
                      maxLength={50}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      className={fieldClass}
                      placeholder="Enter phone number"
                      autoComplete="tel"
                      maxLength={20}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="date_of_birth" className={labelClass}>
                      Date of birth
                    </label>
                    <input
                      id="date_of_birth"
                      name="date_of_birth"
                      type="date"
                      value={form.date_of_birth}
                      onChange={handleChange}
                      className={fieldClass}
                      autoComplete="bday"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="gender" className={labelClass}>
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      className={fieldClass}
                      required
                      disabled={loading}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">
                        Prefer not to say
                      </option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="password" className={labelClass}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        className={`${fieldClass} pr-10`}
                        placeholder="Minimum 12 characters"
                        autoComplete="new-password"
                        minLength={12}
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm_password" className={labelClass}>
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm_password"
                        name="confirm_password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.confirm_password}
                        onChange={handleChange}
                        className={`${fieldClass} pr-10`}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        aria-label={
                          showConfirmPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-teal-700"
                    disabled={loading}
                  />
                  <span>
                    I agree to the cooperative's terms and conditions.
                  </span>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-300/70 bg-red-50/80 px-3.5 py-3 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-950/35 dark:text-red-200"
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="rounded-xl border border-emerald-300/70 bg-emerald-50/80 px-3.5 py-3 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-950/35 dark:text-emerald-200"
                  >
                    {success}
                    <Link
                      href="/login"
                      className="ml-1 font-semibold underline underline-offset-2"
                    >
                      Sign in
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-[#15396b] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/15 transition hover:bg-[#1b4680] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-300 dark:text-[#071426] dark:hover:bg-teal-200"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#15396b] hover:underline dark:text-teal-200"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </section>
        </div>

        <footer className="pt-5 text-center text-[11px] text-white/55">
          CONCORD | Cooperative Loan Management System
        </footer>
      </div>

      <style jsx global>{`
        .register-glass {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.91),
            rgba(206, 234, 233, 0.76)
          );
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.9) inset,
            0 -1px 0 rgba(255, 255, 255, 0.25) inset,
            0 35px 85px -30px rgba(3, 12, 26, 0.65);
        }

        .dark .register-glass {
          background: linear-gradient(
            145deg,
            rgba(255, 255, 255, 0.13),
            rgba(95, 179, 173, 0.08)
          );
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.16) inset,
            0 35px 85px -30px rgba(0, 0, 0, 0.75);
        }

        .register-slide-content {
          animation: register-slide-in 0.55s ease both;
        }

        @keyframes register-slide-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .register-slide-content {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
