"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";

type CurrentUser = {
  username?: string;
  full_name?: string;
  name?: string;
  role?: string;
};

const nav = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Manage Users", href: "/admin/users", icon: Users },
  { label: "Manage Roles", href: "/admin/roles", icon: ShieldCheck },
  { label: "System Records", href: "/admin/records", icon: Activity },
  { label: "Reports", href: "/admin/reports", icon: FileBarChart },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
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
      const role = String(parsed.role ?? "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

      if (role !== "admin") {
        router.replace(
          role === "loan_officer"
            ? "/loan-officer/dashboard"
            : "/member/dashboard"
        );
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
    router.replace("/login");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-[#060607] dark:text-zinc-400">
        Checking administrator access...
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
        const active =
          pathname === item.href ||
          (item.href !== "/admin/dashboard" &&
            pathname.startsWith(`${item.href}/`));

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
            {active && (
              <span className="ml-auto h-2 w-2 rounded-full bg-teal-600 dark:bg-zinc-300" />
            )}
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 transition-colors dark:bg-[#060607] dark:bg-[radial-gradient(60rem_28rem_at_50%_-8%,rgba(255,255,255,0.045),transparent)] dark:bg-no-repeat dark:text-zinc-100 lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/[0.07] dark:bg-[#09090a] lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-6 dark:border-white/[0.07]">
          <LogoMark className="h-10 w-10 shrink-0 text-[#0b2545] dark:text-white" />
          <div>
            <p className="text-base font-semibold tracking-[0.18em] text-[#0b2545] dark:text-white">
              CONCORD
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Administrator Portal
            </p>
          </div>
        </div>

        {navigation}
        {signOutButton}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-white/[0.07] dark:bg-[#09090a]/90 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-white/[0.05] lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
              aria-expanded={menuOpen}
            >
              <Menu size={21} />
            </button>
            <div className="lg:hidden">
              <p className="text-sm font-semibold tracking-[0.15em] text-[#0b2545] dark:text-white">
                CONCORD
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Administrator Portal
              </p>
            </div>
            <p className="hidden text-sm text-slate-500 dark:text-zinc-400 lg:block">
              System Administration
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="rounded-full border border-white/70 bg-white/80 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <ThemeToggle />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#0b2545] dark:text-white">
                {user?.full_name || user?.name || user?.username || "Administrator"}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Administrator
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl p-4 md:p-8">{children}</main>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Administrator navigation"
            className="flex h-full w-72 max-w-[85%] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-white/[0.07] dark:bg-[#09090a] dark:shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-6 dark:border-white/[0.07]">
              <div className="flex items-center gap-3">
                <LogoMark className="h-10 w-10 shrink-0 text-[#0b2545] dark:text-white" />
                <div>
                  <p className="font-semibold tracking-[0.18em] text-[#0b2545] dark:text-white">
                    CONCORD
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Administrator Portal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/[0.06]"
              >
                <X size={20} />
              </button>
            </div>

            {navigation}
            {signOutButton}
          </aside>
        </div>
      )}
    </div>
  );
}