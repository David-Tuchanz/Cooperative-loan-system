"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Role = { value: string; label: string; description: string };

const cardSurface =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/[0.07] dark:bg-[#0c0c0e] dark:bg-gradient-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-16px_rgba(0,0,0,0.8)]";

const iconTile =
  "inline-flex rounded-xl bg-teal-50 p-3 text-teal-800 dark:bg-gradient-to-b dark:from-white/[0.09] dark:to-white/[0.03] dark:text-zinc-300 dark:ring-1 dark:ring-white/[0.07]";

export default function ManageRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    apiFetch("/api/admin/roles")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Unable to load roles (${r.status}).`);
        return r.json();
      })
      .then((d) => {
        if (live) setRoles(d.roles ?? []);
      })
      .catch((e) => {
        if (live)
          setError(e instanceof Error ? e.message : "Unable to load roles.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-teal-700 dark:text-zinc-400">
          Administration
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[#0b2545] dark:text-white">
          Manage roles
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Review the roles available in CONCORD and their responsibilities.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Loading roles...
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <article key={role.value} className={`${cardSurface} p-5`}>
              <span className={iconTile}>
                <ShieldCheck size={22} />
              </span>
              <h2 className="mt-4 font-semibold text-[#0b2545] dark:text-white">
                {role.label}
              </h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500 dark:text-zinc-400">
                {role.description}
              </p>
              <p className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300">
                {role.value}
              </p>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-zinc-500">
        Role definitions are currently read-only. User role assignments can be
        managed from the Manage Users page.
      </p>
    </div>
  );
}