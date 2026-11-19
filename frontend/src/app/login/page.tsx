"use client";

import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Manrope, Playfair_Display } from "next/font/google";

const headlineFont = Manrope({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});


const styles = {
  brand: "cl-brand",
  brandMark: "cl-brandMark",
  chip: "cl-chip",
  dash: "cl-dash",
  display: "cl-display",
  error: "cl-error",
  fg: "cl-fg",
  field: "cl-field",
  glass: "cl-glass",
  glows: "cl-glows",
  heroFg: "cl-heroFg",
  heroMuted: "cl-heroMuted",
  iconBtn: "cl-iconBtn",
  label: "cl-label",
  link: "cl-link",
  muted: "cl-muted",
  orb: "cl-orb",
  orbA: "cl-orbA",
  orbB: "cl-orbB",
  orbRing: "cl-orbRing",
  overlay: "cl-overlay",
  photo: "cl-photo",
  rise: "cl-rise",
  riseLate: "cl-riseLate",
  rule: "cl-rule",
  scene: "cl-scene",
  submit: "cl-submit",
  wordmark: "cl-wordmark",
};

const LOGIN_CSS = `
.cl-scene {
  
  --fg: #0b2545;
  --muted: #38495e;
  --accent: #14524f;
  --ring: rgba(20, 82, 79, 0.3);
  --key: #7fd6c2;

  --glass-a: rgba(255, 255, 255, 0.84);
  --glass-b: rgba(206, 234, 233, 0.6);
  --glass-border: rgba(255, 255, 255, 0.7);
  --sheen: rgba(255, 255, 255, 0.55);
  --glass-shadow: 0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 -1px 0 rgba(255, 255, 255, 0.25) inset,
    0 40px 90px -30px rgba(3, 12, 26, 0.7),
    0 8px 24px -8px rgba(3, 12, 26, 0.35);
  --glass-solid: #e6f0f1;

  --field-bg: rgba(255, 255, 255, 0.84);
  --field-border: rgba(11, 37, 69, 0.3);
  --placeholder: #51627a;
  --rule: rgba(11, 37, 69, 0.16);

  --btn-a: #15396b;
  --btn-b: #0b2545;
  --btn-hover-a: #1b4680;
  --btn-hover-b: #0f2d57;
  --btn-fg: #ffffff;

  --err-bg: rgba(185, 28, 28, 0.1);
  --err-border: rgba(185, 28, 28, 0.4);
  --err-fg: #7f1414;

  --chip-bg: rgba(255, 255, 255, 0.8);
  --chip-border: rgba(255, 255, 255, 0.7);

  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  isolation: isolate;
  background: #0b2545;
}

.dark .cl-scene {
  --fg: #eaf0f6;
  --muted: #b4c3d3;
  --accent: #7fd6c2;
  --ring: rgba(127, 214, 194, 0.34);

  --glass-a: rgba(255, 255, 255, 0.14);
  --glass-b: rgba(95, 179, 173, 0.08);
  --glass-border: rgba(255, 255, 255, 0.2);
  --sheen: rgba(255, 255, 255, 0.16);
  --glass-shadow: 0 1px 0 rgba(255, 255, 255, 0.18) inset,
    0 -1px 0 rgba(255, 255, 255, 0.05) inset,
    0 44px 100px -30px rgba(0, 0, 0, 0.75),
    0 8px 24px -8px rgba(0, 0, 0, 0.45);
  --glass-solid: #12294a;

  --field-bg: rgba(6, 16, 31, 0.5);
  --field-border: rgba(255, 255, 255, 0.24);
  --placeholder: #93a6bb;
  --rule: rgba(255, 255, 255, 0.16);

  --btn-a: #6cc2bb;
  --btn-b: #52a8a2;
  --btn-hover-a: #85d3cc;
  --btn-hover-b: #63b9b2;
  --btn-fg: #06182b;

  --err-bg: rgba(248, 113, 113, 0.14);
  --err-border: rgba(248, 113, 113, 0.45);
  --err-fg: #fecaca;

  --chip-bg: rgba(255, 255, 255, 0.12);
  --chip-border: rgba(255, 255, 255, 0.22);
}

.cl-photo {
  position: absolute;
  inset: 0;
  z-index: -4;
  background-image:
    var(--photo-url, none),
    radial-gradient(70rem 40rem at 20% 30%, #1d6f73 0%, transparent 60%),
    linear-gradient(135deg, #0b2545 0%, #0f3b4f 55%, #14595b 100%);
  background-size: cover;
  background-position: var(--photo-pos, 35% 40%);
  background-repeat: no-repeat;
  filter: saturate(0.92) contrast(1.03);
  animation: cl-fade-in 1.2s ease both;
}

.cl-overlay {
  position: absolute;
  inset: 0;
  z-index: -3;
  background:
    linear-gradient(to top, rgba(6, 16, 31, 0.6), transparent 48%),
    linear-gradient(
      100deg,
      rgba(8, 24, 44, 0.88) 0%,
      rgba(11, 37, 69, 0.68) 42%,
      rgba(24, 96, 100, 0.52) 100%
    );
}

.dark .cl-overlay {
  background:
    linear-gradient(to top, rgba(4, 10, 20, 0.7), transparent 50%),
    linear-gradient(
      100deg,
      rgba(5, 14, 28, 0.93) 0%,
      rgba(8, 28, 54, 0.76) 42%,
      rgba(18, 80, 84, 0.6) 100%
    );
}

@media (max-width: 1023px) {
  .cl-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(8, 24, 44, 0.84) 0%,
        rgba(11, 37, 69, 0.74) 52%,
        rgba(18, 82, 86, 0.66) 100%
      );
  }
  .dark .cl-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(5, 14, 28, 0.92) 0%,
        rgba(8, 28, 54, 0.82) 52%,
        rgba(14, 68, 72, 0.74) 100%
      );
  }
}

.cl-glows {
  position: absolute;
  inset: 0;
  z-index: -2;
  pointer-events: none;
  background:
    radial-gradient(42rem 30rem at 86% 18%, rgba(127, 214, 194, 0.24), transparent 62%),
    radial-gradient(38rem 28rem at 8% 92%, rgba(62, 142, 138, 0.3), transparent 62%),
    linear-gradient(115deg, transparent 42%, rgba(255, 255, 255, 0.05) 50%, transparent 58%);
}

.cl-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  color: #ffffff;
}

.cl-brandMark {
  color: #ffffff;
  --logo-key: var(--key);
}

.cl-wordmark {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.cl-heroFg {
  color: #ffffff;
  text-shadow: 0 1px 28px rgba(0, 0, 0, 0.35);
}

.cl-heroMuted {
  color: rgba(234, 240, 246, 0.84);
  text-shadow: 0 1px 20px rgba(0, 0, 0, 0.3);
}

.cl-display {
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua",
    Georgia, serif;
  letter-spacing: -0.012em;
}

.cl-dash {
  display: inline-block;
  width: 2rem;
  height: 2px;
  border-radius: 2px;
  background: var(--key);
}

.cl-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--chip-border);
  border-radius: 9999px;
  padding: 2px;
  background: var(--chip-bg);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

.cl-orb {
  position: absolute;
  z-index: 0;
  border-radius: 9999px;
  pointer-events: none;
}

.cl-orbA {
  width: 13.5rem;
  height: 13.5rem;
  top: -4.5rem;
  right: -3.5rem;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(127, 214, 194, 0.8),
    rgba(62, 142, 138, 0.38) 58%,
    transparent 72%
  );
}

.cl-orbB {
  width: 9.5rem;
  height: 9.5rem;
  bottom: -3rem;
  left: -3rem;
  background: radial-gradient(
    circle at 60% 40%,
    rgba(255, 255, 255, 0.4),
    rgba(95, 179, 173, 0.32) 55%,
    transparent 72%
  );
}

.cl-orbRing {
  width: 21rem;
  height: 21rem;
  top: -8rem;
  right: -7.5rem;
  border: 1px solid rgba(255, 255, 255, 0.22);
}

@media (max-width: 639px) {
  .cl-orbA { width: 9rem; height: 9rem; top: -3rem; right: -1.5rem; }
  .cl-orbB { width: 6.5rem; height: 6.5rem; bottom: -2rem; left: -1.5rem; }
  .cl-orbRing { display: none; }
}

.cl-glass {
  position: relative;
  z-index: 1;
  isolation: isolate;
  color: var(--fg);
  border: 1px solid var(--glass-border);
  border-radius: 1.5rem;
  background: linear-gradient(145deg, var(--glass-a), var(--glass-b));
  -webkit-backdrop-filter: blur(26px) saturate(165%);
  backdrop-filter: blur(26px) saturate(165%);
  box-shadow: var(--glass-shadow);
}

.cl-glass::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(120% 70% at 0% 0%, var(--sheen), transparent 55%);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .cl-glass,
  .cl-chip {
    background: var(--glass-solid);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .cl-glass,
  .cl-chip {
    background: var(--glass-solid);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

.cl-fg {
  color: var(--fg);
}

.cl-muted {
  color: var(--muted);
}

.cl-rule {
  border-top: 1px solid var(--rule);
}

.cl-label {
  color: var(--fg);
  font-weight: 500;
}

.cl-field {
  color: var(--fg);
  background: var(--field-bg);
  border: 1px solid var(--field-border);
  border-radius: 0.7rem;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.cl-field::placeholder {
  color: var(--placeholder);
}

.cl-field:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--ring);
}

.cl-field[aria-invalid="true"] {
  border-color: var(--err-border);
}

.cl-field:disabled {
  opacity: 0.6;
}

.cl-iconBtn {
  color: var(--muted);
  border-radius: 0.375rem;
  padding: 0.25rem;
  transition: color 0.15s ease;
}

.cl-iconBtn:hover {
  color: var(--fg);
}

.cl-iconBtn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.cl-submit {
  background: linear-gradient(180deg, var(--btn-a), var(--btn-b));
  color: var(--btn-fg);
  border: 0;
  border-radius: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: 0 10px 24px -12px rgba(3, 12, 26, 0.6);
  transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.cl-submit:hover:not(:disabled) {
  background: linear-gradient(180deg, var(--btn-hover-a), var(--btn-hover-b));
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -12px rgba(3, 12, 26, 0.65);
}

.cl-submit:active:not(:disabled) {
  transform: translateY(0);
}

.cl-submit:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.cl-submit:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.cl-error {
  color: var(--err-fg);
  background: var(--err-bg);
  border: 1px solid var(--err-border);
  border-radius: 0.7rem;
}

.cl-link {
  color: var(--accent);
  font-weight: 600;
  text-underline-offset: 4px;
}

.cl-link:hover {
  text-decoration: underline;
}

.cl-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 2px;
}

@keyframes cl-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes cl-rise-kf {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

.cl-rise {
  animation: cl-rise-kf 0.65s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.cl-riseLate {
  animation: cl-rise-kf 0.65s cubic-bezier(0.2, 0.7, 0.2, 1) 0.14s both;
}

@media (prefers-reduced-motion: reduce) {
  .cl-photo,
  .cl-rise,
  .cl-riseLate {
    animation: none;
  }
  .cl-submit,
  .cl-field {
    transition: none;
  }
}
`;

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

// Placeholder name: replace with the cooperative's real name.
const BRAND_NAME = "Concord";
const SYSTEM_NAME = "Cooperative Loan Management System";

// Local photograph you supply (see instructions). Saved at:
//   public/images/cooperative-meeting.jpg
// If the file is missing, the page shows the navy-to-teal gradient instead.
const PHOTO_SRC = "/images/cooperative-meeting.jpg";
// Focal point of the photo (x y). Adjust so faces stay clear of the panel.
const PHOTO_POSITION = "35% 40%";

const sceneVars = {
  "--photo-url": `url("${PHOTO_SRC}")`,
  "--photo-pos": PHOTO_POSITION,
} as CSSProperties;

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter your username and password to continue.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Login failed. Check your credentials."
        );
      }

      if (!data.access_token || !data.refresh_token || !data.user) {
     throw new Error("The server returned an incomplete login response.");
      }

      const role = String(data.user.role ?? "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

      if (!["admin", "loan_officer", "member"].includes(role)) {
        throw new Error(
          "Your account role is not recognised. Contact an administrator."
        );
      }

      sessionStorage.setItem("access_token", data.access_token);
      sessionStorage.setItem("refresh_token", data.refresh_token);
      sessionStorage.setItem("current_user", JSON.stringify(data.user));

      
    if (role === "member") {
      router.push("/member/dashboard");
    } else if (role === "admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/loan-officer/dashboard");
    }

    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Unable to reach the server. Make sure the Flask backend is running."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.scene} style={sceneVars}>
      <style>{LOGIN_CSS}</style>
      {/* Background: photograph, navy-to-teal overlay, soft light */}
      <div className={styles.photo} aria-hidden="true" />
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.glows} aria-hidden="true" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1440px] flex-col">
        {/* Header: small logo, brand name, theme toggle */}
        <header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-14">
          <div className={styles.brand}>
            <LogoMark
              className={`${styles.brandMark} h-8 w-8 shrink-0`}
            />
            <div className="leading-tight">
              <span className={styles.wordmark}>{BRAND_NAME}</span>
              <span
                className={`${styles.heroMuted} mt-0.5 hidden text-[0.7rem] sm:block`}
              >
                {SYSTEM_NAME}
              </span>
            </div>
          </div>

          <div className={styles.chip}>
            <ThemeToggle />
          </div>
        </header>

        {/* Body: welcome message + glass panel */}
        <div className="grid flex-1 grid-cols-1 items-center gap-x-12 gap-y-8 px-5 pb-8 pt-2 sm:px-8 lg:grid-cols-2 lg:px-14">
          <section className={`${styles.rise} max-w-xl lg:self-end lg:pb-16`}>
            <span className={styles.dash} aria-hidden="true" />
            <p
              className={`${headlineFont.className} ${styles.heroFg} mt-4 text-3xl font-extrabold uppercase leading-[1.1] tracking-[0.01em] sm:text-4xl xl:text-[3rem]`}
            >
              Cooperative lending, built on trust.
            </p>
            <p
              className={`${styles.heroMuted} mt-4 hidden max-w-md text-base leading-7 sm:block`}
            >
              A cooperative loan management system, with risk
              insights that support your loan officers&rsquo; judgement and
              never replace it.
            </p>
          </section>

          <div
            className={`${styles.riseLate} relative mx-auto w-full max-w-[480px] lg:justify-self-center`}
          >
            {/* Layered translucent shapes behind the glass */}
            <span className={`${styles.orb} ${styles.orbA}`} aria-hidden="true" />
            <span className={`${styles.orb} ${styles.orbB}`} aria-hidden="true" />
            <span className={`${styles.orb} ${styles.orbRing}`} aria-hidden="true" />

            <section className={`${styles.glass} p-6 sm:p-10`}>
              <div className="mb-7">
                <h1
                  className={`${styles.display} ${styles.fg} text-[1.75rem] font-medium leading-tight`}
                >
                  Welcome back
                </h1>
                <p className={`${styles.muted} mt-1.5 text-sm`}>
                  Sign in to access your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className={styles.label}>
                    Username
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={`${styles.field} h-11`}
                    disabled={loading}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "login-error" : undefined}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password" className={styles.label}>
                      Password
                    </Label>
                    <span className={`${styles.muted} text-xs`}>
                      Contact your administrator if needed
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={`${styles.field} h-11 pr-11`}
                      disabled={loading}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "login-error" : undefined}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className={`${styles.iconBtn} absolute right-2.5 top-1/2 -translate-y-1/2`}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    id="login-error"
                    role="alert"
                    className={`${styles.error} px-3 py-2.5 text-sm`}
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className={`${styles.submit} h-11 w-full`}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>

              <p
                className={`${styles.rule} ${styles.muted} mt-7 pt-5 text-xs leading-5`}
              >
                Your account permissions determine which features you can
                access.
              </p>

              <p className={`${styles.muted} mt-5 text-center text-sm`}>
                New to the cooperative?{" "}
                <Link href="/register" className={styles.link}>
                  Create a member account
                </Link>
              </p>
            </section>
          </div>
        </div>

        <footer
          className={`${styles.heroMuted} px-5 pb-5 text-center text-xs sm:px-8 lg:px-14 lg:text-left`}
        >
          {SYSTEM_NAME}
        </footer>
      </div>
    </main>
  );
}
