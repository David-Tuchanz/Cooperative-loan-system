"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Search, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api";

type AdminUser = {
  user_id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
  member?: { first_name?: string; last_name?: string } | null;
};
type Role = { value: string; label: string; description: string };

const cardSurface =
  "rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/[0.07] dark:bg-[#0c0c0e] dark:bg-gradient-to-b dark:from-white/[0.035] dark:to-transparent dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_32px_-16px_rgba(0,0,0,0.8)]";

const pillButton =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:rounded-full dark:border-white/[0.1] dark:bg-white/[0.04] dark:px-4 dark:text-zinc-200 dark:hover:bg-white/[0.08]";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-white/30 dark:focus:ring-white/10";

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 dark:border-white/[0.1] dark:bg-[#111113] dark:text-white dark:focus:border-white/30";

const optionClass = "text-slate-900 dark:bg-[#111113] dark:text-white";

export default function ManageUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "loan_officer",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [u, r] = await Promise.all([
        apiFetch("/api/admin/users"),
        apiFetch("/api/admin/roles"),
      ]);
      if (!u.ok) throw new Error(`Could not retrieve users (${u.status}).`);
      if (!r.ok) throw new Error(`Could not retrieve roles (${r.status}).`);
      const ud = await u.json();
      const rd = await r.json();
      setUsers(ud.users ?? []);
      setRoles(rd.roles ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          data.message ||
            data.error ||
            `Account creation failed (${response.status}).`
        );
      setNotice(data.message || "Staff account created successfully.");
      setForm({ username: "", email: "", password: "", role: "loan_officer" });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(
    user: AdminUser,
    patch: { role?: string; status?: string }
  ) {
    setError("");
    setNotice("");
    try {
      const response = await apiFetch(`/api/admin/users/${user.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          data.message || data.error || `Update failed (${response.status}).`
        );
      setNotice(data.message || `Updated ${user.username}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update account.");
    }
  }

  const filtered = users.filter((u) =>
    `${u.username} ${u.email} ${u.role} ${u.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-teal-700 dark:text-zinc-400">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0b2545] dark:text-white">
            Manage users
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Create staff accounts and manage user access.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0b2545] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16395f] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          <Plus size={17} />
          {showForm ? "Close form" : "Create staff account"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/[0.06] dark:text-emerald-300"
        >
          {notice}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={createUser}
          className={`${cardSurface} grid gap-4 p-5 sm:p-6 md:grid-cols-2`}
        >
          <div className="md:col-span-2">
            <h2 className="font-semibold text-[#0b2545] dark:text-white">
              New staff account
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              This form creates Administrator or Loan Officer accounts. Member
              registration remains separate.
            </p>
          </div>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-zinc-200">
              Username
            </span>
            <input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={inputClass}
              placeholder="Enter username"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-zinc-200">
              Email address
            </span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
              placeholder="name@example.com"
            />
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-zinc-200">
              Temporary password
            </span>
            <input
              required
              minLength={12}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
              placeholder="At least 12 characters"
            />
            <span className="text-xs text-slate-500 dark:text-zinc-500">
              Use at least 12 characters.
            </span>
          </label>

          <label className="space-y-1.5 text-sm">
            <span className="font-medium text-slate-700 dark:text-zinc-200">
              Account role
            </span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={selectClass}
            >
              {roles
                .filter((r) => r.value !== "member")
                .map((r) => (
                  <option key={r.value} value={r.value} className={optionClass}>
                    {r.label}
                  </option>
                ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className={pillButton}
            >
              Cancel
            </button>
            <button
              disabled={busy}
              className="rounded-lg bg-[#0b2545] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#16395f] disabled:opacity-60 dark:rounded-full dark:bg-zinc-100 dark:px-5 dark:text-zinc-900 dark:hover:bg-white"
            >
              {busy ? "Creating..." : "Create account"}
            </button>
          </div>
        </form>
      )}

      <section className={`${cardSurface} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-white/[0.07]">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className={`${inputClass} !py-2 pl-10 pr-3`}
            />
          </div>
          <button onClick={load} className={pillButton}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-white/[0.02] dark:text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-slate-500 dark:text-zinc-400"
                  >
                    Loading users...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-slate-500 dark:text-zinc-400"
                  >
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.user_id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300">
                          <UserRound size={17} />
                        </span>
                        <div>
                          <p className="font-medium text-[#0b2545] dark:text-white">
                            {u.username}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-zinc-500">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          updateUser(u, { role: e.target.value })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none dark:border-white/[0.1] dark:bg-[#111113] dark:text-white"
                      >
                        {roles.map((r) => (
                          <option
                            key={r.value}
                            value={r.value}
                            className={optionClass}
                          >
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          u.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/[0.08] dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.status === "active"
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          }`}
                          aria-hidden="true"
                        />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-zinc-400">
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString()
                        : "Not available"}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() =>
                          updateUser(u, {
                            status: u.status === "active" ? "inactive" : "active",
                          })
                        }
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/[0.1] dark:text-zinc-200 dark:hover:bg-white/[0.06]"
                      >
                        {u.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500 dark:border-white/[0.07] dark:text-zinc-400">
          {filtered.length} of {users.length} accounts
        </div>
      </section>
    </div>
  );
}