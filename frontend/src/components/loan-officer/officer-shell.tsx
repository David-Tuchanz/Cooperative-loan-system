"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  FileBarChart,
  FileText,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { MemberAvatar } from "@/components/member-avatar";

type CurrentUser = {
  username?: string;
  full_name?: string;
  name?: string;
  email?: string;
  role?: string;
  profile_picture_url?: string | null;
};

const nav = [
  { label: "Overview", href: "/loan-officer/dashboard", icon: LayoutDashboard, title: "Dashboard" },
  { label: "Members", href: "/loan-officer/members", icon: Users, title: "Members" },
  { label: "Applications", href: "/loan-officer/applications", icon: FileText, title: "Applications" },
  { label: "Loans", href: "/loan-officer/loans", icon: HandCoins, title: "Loans" },
  { label: "Repayments", href: "/loan-officer/repayments", icon: Wallet, title: "Repayments" },
  { label: "Reports", href: "/loan-officer/reports", icon: FileBarChart, title: "Reports" },
];

// Sub-pages that deserve their own header title.
const extraTitles = [{ href: "/loan-officer/applications/new", title: "New Application" }];

export function OfficerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("access_token");
    const rawUser = sessionStorage.getItem("current_user");

    if (!token || !rawUser) {
      router.replace("/login");
      return;
    }

    try {
      const parsed = JSON.parse(rawUser) as CurrentUser;
      const role = String(parsed.role ?? "").toLowerCase().replace(/[\s-]+/g, "_");

      if (role !== "loan_officer") {
        router.replace(role === "admin" ? "/admin/dashboard" : "/member/dashboard");
        return;
      }

      setUser(parsed);
      setChecking(false);
    } catch {
      sessionStorage.removeItem("current_user");
      router.replace("/login");
    }
  }, [router]);

  function signOut() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("current_user");
    window.location.href = "/login";
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const pageTitle =
    [...extraTitles, ...nav]
      .filter((item) => isActive(item.href))
      .sort((a, b) => b.href.length - a.href.length)[0]?.title ?? "Dashboard";

  const displayName = user?.full_name || user?.name || user?.username || "Loan Officer";

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-[#060607] dark:text-zinc-400">
        Checking loan officer access...
      </div>
    );
  }

  const navigation = (
    <nav className="flex-1 space-y-1 px-4 py-6">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        Workspace
      </p>
      {nav.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
              active
                ? "bg-teal-50 font-semibold text-teal-800 dark:bg-white/[0.06] dark:text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-[#0b2545] dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
            }`}
          >
            <Icon size={18} />
            {item.label}
            {active && <span className="ml-auto h-2 w-2 rounded-full bg-teal-600 dark:bg-zinc-300" />}
          </Link>
        );
      })}
    </nav>
  );

  const signOutButton = (
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
  );

  const brand = (
    <div className="flex items-center gap-3">
      <LogoMark className="h-10 w-10 shrink-0 text-[#0b2545] dark:text-white" />
      <div>
        <p className="text-base font-semibold tracking-[0.18em] text-[#0b2545] dark:text-white">CONCORD</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Loan Officer Portal</p>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 transition-colors dark:bg-[#060607] dark:bg-[radial-gradient(60rem_28rem_at_50%_-8%,rgba(255,255,255,0.045),transparent)] dark:bg-no-repeat dark:text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/[0.07] dark:bg-[#09090a] lg:flex">
          <div className="border-b border-slate-100 px-6 py-6 dark:border-white/[0.07]">{brand}</div>
          {navigation}
          {signOutButton}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-white/[0.07] dark:bg-[#09090a] sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation"
                aria-expanded={menuOpen}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-white/[0.08] dark:text-zinc-400 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                <Menu size={19} />
              </button>
              <div>
                <p className="text-sm font-semibold tracking-[0.15em] text-[#0b2545] dark:text-white">CONCORD</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{pageTitle}</p>
              </div>
            </div>

            <div className="hidden lg:block">
              <p className="text-sm text-slate-500 dark:text-zinc-400">Loan Officer Portal</p>
              <h1 className="mt-1 text-xl font-semibold text-[#0b2545] dark:text-white">{pageTitle}</h1>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="rounded-full border border-white/70 bg-white/80 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <ThemeToggle />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-expanded={profileOpen}
                  aria-label="Open loan officer menu"
                  className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                >
                  <MemberAvatar
                    imageUrl={user?.profile_picture_url}
                    name={displayName}
                    sizeClassName="h-10 w-10"
                    className="ring-2 ring-teal-100 dark:ring-white/10"
                  />
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-32 truncate text-sm font-medium text-slate-800 dark:text-zinc-100">
                      {displayName}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-zinc-400">Loan Officer</span>
                  </span>
                  <ChevronDown size={16} className="hidden sm:block" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 z-30 mt-3 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/[0.08] dark:bg-[#111113] dark:shadow-black/50">
                    <div className="border-b border-slate-100 px-3 py-3 dark:border-white/[0.07]">
                      <p className="truncate text-sm font-semibold">{displayName}</p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-zinc-400">
                        {user?.email || (user?.username ? `@${user.username}` : "Loan Officer")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={signOut}
                      className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
                    >
                      <LogOut size={17} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Loan officer navigation"
            className="flex h-full w-72 max-w-[85%] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#09090a]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-white/[0.07]">
              {brand}
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/[0.06]"
              >
                <X size={21} />
              </button>
            </div>
            {navigation}
            {signOutButton}
          </aside>
        </div>
      )}
    </main>
  );
}