"use client";

import { useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, ShieldCheck, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";

type AdminUser = {
  user_id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
};
type Role = { value: string; label: string; description: string };

const cardSurface =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/[0.07] dark:bg-[#0c0c0e] dark:bg-gradient-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-16px_rgba(0,0,0,0.8)]";

const iconTile =
  "rounded-xl bg-teal-50 p-3 text-teal-800 dark:bg-gradient-to-b dark:from-white/[0.09] dark:to-white/[0.03] dark:text-zinc-300 dark:ring-1 dark:ring-white/[0.07]";

function Stat({
  label,
  value,
  icon: Icon,
  note,
}: {
  label: string;
  value: number | string;
  icon: ElementType;
  note: string;
}) {
  return (
    <div className={`${cardSurface} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-zinc-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#0b2545] dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
            {note}
          </p>
        </div>
        <span className={iconTile}>
          <Icon size={21} />
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          apiFetch("/api/admin/users"),
          apiFetch("/api/admin/roles"),
        ]);
        if (!usersRes.ok)
          throw new Error(`Unable to load users (${usersRes.status}).`);
        if (!rolesRes.ok)
          throw new Error(`Unable to load roles (${rolesRes.status}).`);
        const usersData = await usersRes.json();
        const rolesData = await rolesRes.json();
        if (!cancelled) {
          setUsers(usersData.users ?? []);
          setRoles(rolesData.roles ?? []);
        }
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Unable to load dashboard data."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const count = (role: string) => users.filter((u) => u.role === role).length;
  const active = users.filter((u) => u.status === "active").length;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-zinc-400">
          Administrator workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#0b2545] dark:text-white md:text-3xl">
          System overview
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
          Manage system access and review the current account structure.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total user accounts" value={loading ? "..." : users.length} icon={Users} note="All registered system accounts" />
        <Stat label="Active accounts" value={loading ? "..." : active} icon={Activity} note="Accounts currently active" />
        <Stat label="Loan Officers" value={loading ? "..." : count("loan_officer")} icon={ShieldCheck} note="Staff with lending permissions" />
        <Stat label="System roles" value={loading ? "..." : roles.length} icon={ShieldCheck} note="Available account roles" />
      </div>

      <section className={`${cardSurface} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[#0b2545] dark:text-white">
              User account summary
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
              Current accounts grouped by role.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 dark:text-zinc-200 dark:hover:text-white"
          >
            Manage users <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="mt-5 divide-y divide-slate-100 dark:divide-white/[0.07]">
          {roles.map((role) => (
            <div
              key={role.value}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="text-sm font-medium text-[#0b2545] dark:text-white">
                  {role.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {role.description}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-white/[0.06] dark:text-zinc-200">
                {loading ? "..." : count(role.value)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/users"
          className={`group ${cardSurface} p-5 transition hover:border-teal-300 dark:hover:border-white/[0.16]`}
        >
          <div className="flex items-center justify-between">
            <Users className="text-teal-700 dark:text-zinc-300" />
            <ArrowUpRight className="text-slate-400 transition group-hover:-translate-y-1 group-hover:translate-x-1 dark:text-zinc-500" />
          </div>
          <h2 className="mt-4 font-semibold text-[#0b2545] dark:text-white">
            Manage users
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Create staff accounts and manage account status and roles.
          </p>
        </Link>

        <Link
          href="/admin/roles"
          className={`group ${cardSurface} p-5 transition hover:border-teal-300 dark:hover:border-white/[0.16]`}
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="text-teal-700 dark:text-zinc-300" />
            <ArrowUpRight className="text-slate-400 transition group-hover:-translate-y-1 group-hover:translate-x-1 dark:text-zinc-500" />
          </div>
          <h2 className="mt-4 font-semibold text-[#0b2545] dark:text-white">
            Manage roles
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Review system roles and their responsibilities.
          </p>
        </Link>
      </div>
    </div>
  );
}