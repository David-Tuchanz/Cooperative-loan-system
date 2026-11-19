"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, HandCoins, Home, LogOut, Menu, Settings, Wallet, X } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";

const navigation = [
  { label: "Overview", href: "/member/dashboard", icon: Home },
  { label: "My Loans", href: "/member/loans", icon: HandCoins },
  { label: "Apply for Loan", href: "/member/apply", icon: FileText },
  { label: "Repayments", href: "/member/repayments", icon: Wallet },
  { label: "My Profile", href: "/member/profile", icon: Settings },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function signOut() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("current_user");
    window.location.href = "/login";
  }

  return (
    <>
      {children}

      {/* Shared mobile navigation for every member page. */}
      <div className="fixed bottom-5 right-5 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open member navigation"
          aria-expanded={menuOpen}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0b2545] text-white shadow-xl shadow-slate-900/25 ring-1 ring-white/20 transition hover:bg-[#16395f] dark:bg-teal-700 dark:hover:bg-teal-600"
        >
          <Menu size={23} />
        </button>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Member navigation"
            className="flex h-full w-72 max-w-[85%] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#09090a]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-white/[0.07]">
              <div className="flex items-center gap-3">
                <LogoMark className="h-10 w-10 text-[#0b2545] dark:text-white" />
                <div>
                  <p className="text-base font-semibold tracking-[0.18em] text-[#0b2545] dark:text-white">
                    CONCORD
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Member Portal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-white/[0.06]"
              >
                <X size={21} />
              </button>
            </div>

            <nav className="flex-1 space-y-2 px-4 py-6">
              <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Workspace
              </p>
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
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
                    <Icon size={19} />
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
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"
              >
                <LogOut size={19} />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
