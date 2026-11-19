"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  Bell, Camera, CheckCircle2, ChevronDown, FileText, HandCoins, Home,
  Loader2, LogOut, Save, Settings, UserRound, Wallet, X,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiFetch } from "@/lib/api";
import MemberNotifications from "@/components/member-notifications";

type Profile = {
  member_id?: number;
  user_id?: number;
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string | null;
  phone: string;
  email: string;
  address: string;
  username: string;
  membership_date: string | null;
  membership_status: string;
  member_category?: string | null;
  cooperative_unit?: string | null;
  profile_picture_url?: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const navigation = [
  { label: "Overview", href: "/member/dashboard", icon: Home },
  { label: "My Loans", href: "/member/loans", icon: HandCoins },
  { label: "Apply for Loan", href: "/member/apply", icon: FileText },
  { label: "Repayments", href: "/member/repayments", icon: Wallet },
  { label: "My Profile", href: "/member/profile", icon: Settings },
];

const cardClass =
  "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/[0.07] dark:bg-[#0c0c0e]";
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 dark:border-white/[0.1] dark:bg-[#111113] dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-teal-500 dark:disabled:bg-white/[0.03]";

function readableStatus(value?: string | null) {
  if (!value) return "Not available";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function MemberProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", gender: "",
    date_of_birth: "", address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await apiFetch(`${API_URL}/api/members/me/profile`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json();
      if (response.status === 401) throw new Error("Your session has expired. Please sign in again.");
      if (!response.ok) throw new Error(data.message || "Unable to load your profile.");

      const member = (data.profile || data.member || data) as Profile;
      setProfile(member);
      setForm({
        first_name: member.first_name || "",
        last_name: member.last_name || "",
        email: member.email || "",
        phone: member.phone || "",
        gender: member.gender || "",
        date_of_birth: member.date_of_birth ? member.date_of_birth.slice(0, 10) : "",
        address: member.address || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.username
    : "Member";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  function updateField(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");
      const response = await apiFetch(`${API_URL}/api/members/me/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (response.status === 401) throw new Error("Your session has expired. Please sign in again.");
      if (!response.ok) throw new Error(data.message || "Unable to save your profile.");

      const updated = (data.profile || data.member || data) as Profile;
      setProfile((current) => ({ ...current, ...updated, ...form }));
      setNotice(data.message || "Your profile has been updated successfully.");
      const savedUser = sessionStorage.getItem("current_user");
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          sessionStorage.setItem("current_user", JSON.stringify({ ...user, email: form.email }));
        } catch {
          // The profile remains saved on the server even if cached user data is invalid.
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPicture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("The image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    const token = sessionStorage.getItem("access_token");
    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const body = new FormData();
    body.append("profile_picture", file);
    try {
      setUploading(true);
      setError("");
      setNotice("");
      const response = await apiFetch(`${API_URL}/api/members/me/profile-picture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to upload your profile picture.");
      const imageUrl = data.profile_picture_url || data.url;
      if (!imageUrl) throw new Error("The server did not return the uploaded image URL.");
      setProfile((current) => current ? { ...current, profile_picture_url: imageUrl } : current);
      setNotice("Profile picture updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload your profile picture.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function signOut() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("current_user");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 transition-colors dark:bg-[#060607] dark:text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/[0.07] dark:bg-[#09090a] lg:flex">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-6 dark:border-white/[0.07]">
            <LogoMark className="h-10 w-10 shrink-0 text-[#0b2545] dark:text-white" />
            <div>
              <p className="text-base font-semibold tracking-[0.18em] text-[#0b2545] dark:text-white">CONCORD</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Member Portal</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Workspace</p>
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.label === "My Profile";
              return (
                <Link key={item.label} href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active ? "bg-teal-50 font-semibold text-teal-800 dark:bg-white/[0.06] dark:text-white" : "text-slate-600 hover:bg-slate-50 hover:text-[#0b2545] dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-white"}`}>
                  <Icon size={18} />{item.label}
                  {active && <span className="ml-auto h-2 w-2 rounded-full bg-teal-600 dark:bg-zinc-300" />}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-100 p-4 dark:border-white/[0.07]">
            <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-600 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-400/10 dark:hover:text-red-300">
              <LogOut size={18} />Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-white/[0.07] dark:bg-[#09090a] sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <LogoMark className="h-9 w-9 shrink-0 text-[#0b2545] dark:text-white" />
              <div>
                <p className="text-sm font-semibold tracking-[0.15em] text-[#0b2545] dark:text-white">CONCORD</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Member Portal</p>
              </div>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm text-slate-500 dark:text-zinc-400">Member Portal</p>
              <h1 className="mt-1 text-xl font-semibold text-[#0b2545] dark:text-white">My Profile</h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="rounded-full border border-white/70 bg-white/80 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]"><ThemeToggle /></div>
              <MemberNotifications />
              <div className="relative">
                <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} className="flex items-center gap-2 rounded-full p-1 transition hover:bg-slate-100 dark:hover:bg-white/[0.05]">
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#0b2545] to-teal-600 text-sm font-semibold text-white ring-2 ring-teal-100 dark:ring-white/10">
                    {profile?.profile_picture_url ? <img src={profile.profile_picture_url} alt="Profile" className="h-full w-full object-cover" /> : initials || "M"}
                  </span>
                  <span className="hidden text-left sm:block"><span className="block max-w-32 truncate text-sm font-medium">{displayName}</span><span className="block text-xs text-slate-500 dark:text-zinc-400">Member</span></span>
                  <ChevronDown size={16} className="hidden sm:block" />
                </button>
                {menuOpen && <div className="absolute right-0 z-30 mt-3 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/[0.08] dark:bg-[#111113]">
                  <Link href="/member/dashboard" onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-white/[0.05]">Dashboard</Link>
                  <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10"><LogOut size={16} />Sign out</button>
                </div>}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
            <div>
              <p className="text-sm font-medium text-teal-700 dark:text-teal-400">ACCOUNT SETTINGS</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#0b2545] dark:text-white sm:text-3xl">Personal profile</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Manage your personal details and membership information.</p>
            </div>

            {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[0.06] dark:text-red-300"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
            {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/[0.06] dark:text-emerald-300"><span className="flex items-center gap-2"><CheckCircle2 size={17} />{notice}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}

            {loading ? <div className={`${cardClass} flex items-center justify-center gap-3 py-16 text-sm text-slate-500 dark:text-zinc-400`}><Loader2 className="animate-spin" size={20} />Loading your profile...</div> : (
              <>
                <section className={cardClass}>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#0b2545] to-teal-600 text-2xl font-semibold text-white ring-4 ring-teal-50 dark:ring-white/[0.06]">
                      {profile?.profile_picture_url ? <img src={profile.profile_picture_url} alt="Your profile" className="h-full w-full object-cover" /> : initials || <UserRound size={34} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-[#0b2545] dark:text-white">{displayName}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{profile?.email || "No email address"}</p>
                      <p className="mt-2 text-xs text-slate-400 dark:text-zinc-500">JPG, PNG or WebP. Maximum file size: 5 MB.</p>
                    </div>
                    <div>
                      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPicture} className="hidden" />
                      <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/[0.1] dark:text-zinc-200 dark:hover:bg-white/[0.05]">
                        {uploading ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}{uploading ? "Uploading..." : "Change photo"}
                      </button>
                    </div>
                  </div>
                </section>

                <form onSubmit={saveProfile} className="space-y-6">
                  <section className={cardClass}>
                    <div className="mb-6"><h3 className="font-semibold text-[#0b2545] dark:text-white">Personal information</h3><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">You can update the details below.</p></div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">First name<input className={inputClass} name="first_name" value={form.first_name} onChange={updateField} required maxLength={50} /></label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Last name<input className={inputClass} name="last_name" value={form.last_name} onChange={updateField} required maxLength={50} /></label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Email address<input className={inputClass} type="email" name="email" value={form.email} onChange={updateField} required maxLength={100} /></label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Phone number<input className={inputClass} type="tel" name="phone" value={form.phone} onChange={updateField} maxLength={20} /></label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Gender<select className={inputClass} name="gender" value={form.gender} onChange={updateField}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option><option value="Prefer not to say">Prefer not to say</option></select></label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Date of birth<input className={inputClass} type="date" name="date_of_birth" value={form.date_of_birth} onChange={updateField} /></label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 sm:col-span-2">Residential address<textarea className={inputClass} name="address" value={form.address} onChange={updateField} rows={3} maxLength={255} /></label>
                    </div>
                  </section>

                  <section className={cardClass}>
                    <div className="mb-6"><h3 className="font-semibold text-[#0b2545] dark:text-white">Membership information</h3><p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">These details are managed by your cooperative.</p></div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Username<input className={inputClass} value={profile?.username || "Not available"} disabled readOnly /></label>
                      <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300">Membership date<input className={inputClass} value={formatDate(profile?.membership_date)} disabled readOnly /></label>
                      <div className="sm:col-span-2"><span className="text-sm font-medium text-slate-700 dark:text-zinc-300">Membership status</span><div className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">{readableStatus(profile?.membership_status)}</div></div>
                    </div>
                  </section>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => void loadProfile()} disabled={saving} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-white/[0.1] dark:text-zinc-200 dark:hover:bg-white/[0.05]">Discard changes</button>
                    <button type="submit" disabled={saving || uploading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b2545] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16395f] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-700 dark:hover:bg-teal-600">
                      {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}{saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </>
            )}

            <footer className="pb-3 text-center text-xs text-slate-400 dark:text-zinc-500">Concord Cooperative Loan Management System</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
