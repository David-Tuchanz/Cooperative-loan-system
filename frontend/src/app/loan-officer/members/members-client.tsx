"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Badge,
  DetailBlock,
  Drawer,
  Pagination,
  cardSurface,
  errorBox,
  fetchJson,
  fieldClass,
  fmtDate,
  iconTile,
  labelClass,
  naira,
  paginate,
  pillButton,
  primaryButton,
  readMessage,
  rowButton,
  secondaryButton,
  successBox,
  titleCase,
  NA,
} from "@/components/loan-officer/officer-ui";

/* ------------------------------------------------------------------ */
/* Types + helpers                                                     */
/* ------------------------------------------------------------------ */

type Member = {
  member_id: number;
  user_id?: number;
  first_name: string;
  last_name: string;
  gender?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  membership_date?: string | null;
  membership_status?: string | null;
  member_category?: string | null;
  cooperative_unit?: string | null;
  cooperative_id?: number | null;
};

type Profile = {
  member: Member;
  applications: {
    application_id: number;
    loan_type?: string | null;
    amount_requested?: number | null;
    application_status?: string | null;
    application_date?: string | null;
  }[];
  loans: {
    loan_id: number;
    loan_type?: string | null;
    amount_approved?: number | null;
    outstanding_balance?: number | null;
    loan_status?: string | null;
    disbursement_date?: string | null;
  }[];
  summary: {
    total_applications: number;
    applications_by_status: Record<string, number>;
    total_loans: number;
    loans_by_status: Record<string, number>;
    total_borrowed: number;
    total_outstanding: number;
    total_repaid: number;
  };
};

type MemberForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  member_category: string;
  cooperative_unit: string;
};

const GENDERS = ["Male", "Female", "Other"];
const inputClass = `${fieldClass} w-full`;

const today = () => new Date().toISOString().slice(0, 10);
const fullName = (m: Pick<Member, "first_name" | "last_name">) => `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || NA;

const emptyForm: MemberForm = {
  first_name: "", last_name: "", email: "", phone: "", gender: "",
  date_of_birth: "", address: "", member_category: "", cooperative_unit: "",
};

const toForm = (m: Member): MemberForm => ({
  first_name: m.first_name ?? "",
  last_name: m.last_name ?? "",
  email: m.email ?? "",
  phone: m.phone ?? "",
  gender: m.gender ?? "",
  date_of_birth: (m.date_of_birth ?? "").slice(0, 10),
  address: m.address ?? "",
  member_category: m.member_category ?? "",
  cooperative_unit: m.cooperative_unit ?? "",
});

function generatePassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

/** Shared validation for the member fields. Returns an error message or "". */
function validateForm(form: MemberForm) {
  if (!form.first_name.trim() || !form.last_name.trim()) return "First name and last name are required.";
  if (!form.email.trim() || !form.email.includes("@")) return "A valid email address is required.";
  if (form.date_of_birth && form.date_of_birth > today()) return "Date of birth cannot be in the future.";
  return "";
}

function Field({
  label,
  required,
  hint,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`${labelClass} ${className}`}>
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1.5 block text-xs font-normal text-slate-500 dark:text-zinc-500">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Shared member fields (used by both register and edit)               */
/* ------------------------------------------------------------------ */

function MemberFields({
  form,
  setForm,
  disabled,
}: {
  form: MemberForm;
  setForm: (form: MemberForm) => void;
  disabled?: boolean;
}) {
  const set =
    (key: keyof MemberForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  const genderOptions = !form.gender || GENDERS.includes(form.gender) ? GENDERS : [...GENDERS, form.gender];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="First name" required>
        <input required disabled={disabled} value={form.first_name} onChange={set("first_name")} maxLength={50} className={inputClass} />
      </Field>
      <Field label="Last name" required>
        <input required disabled={disabled} value={form.last_name} onChange={set("last_name")} maxLength={50} className={inputClass} />
      </Field>
      <Field label="Email address" required className="sm:col-span-2">
        <input required disabled={disabled} type="email" value={form.email} onChange={set("email")} maxLength={100} placeholder="name@example.com" className={inputClass} />
      </Field>
      <Field label="Phone">
        <input disabled={disabled} value={form.phone} onChange={set("phone")} maxLength={20} placeholder="08012345678" className={inputClass} />
      </Field>
      <Field label="Gender">
        <select disabled={disabled} value={form.gender} onChange={set("gender")} className={inputClass}>
          <option value="">Not specified</option>
          {genderOptions.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </Field>
      <Field label="Date of birth">
        <input disabled={disabled} type="date" max={today()} value={form.date_of_birth} onChange={set("date_of_birth")} className={inputClass} />
      </Field>
      <Field label="Address">
        <input disabled={disabled} value={form.address} onChange={set("address")} maxLength={255} className={inputClass} />
      </Field>
      <Field label="Member category" hint="Pick an existing category to keep records consistent.">
        <input disabled={disabled} list="member-categories" value={form.member_category} onChange={set("member_category")} maxLength={50} className={inputClass} />
      </Field>
      <Field label="Cooperative unit" hint="Pick an existing unit to keep records consistent.">
        <input disabled={disabled} list="cooperative-units" value={form.cooperative_unit} onChange={set("cooperative_unit")} maxLength={100} className={inputClass} />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Register drawer                                                     */
/* ------------------------------------------------------------------ */

function RegisterDrawer({
  onClose,
  onCreated,
  onOpenProfile,
}: {
  onClose: () => void;
  onCreated: () => void;
  onOpenProfile: (memberId: number) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [membershipDate, setMembershipDate] = useState(today());
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ memberId: number; name: string; username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!username.trim()) return setError("A username is required.");
    if (password.length < 12) return setError("The temporary password must contain at least 12 characters.");
    const problem = validateForm(form);
    if (problem) return setError(problem);

    setBusy(true);
    try {
      const response = await apiFetch("/api/members/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          membership_date: membershipDate,
          ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()])),
        }),
      });

      if (!response.ok) throw new Error(await readMessage(response, "Registration failed"));

      const data = await response.json();
      setCreated({
        memberId: data.member.member_id,
        name: fullName(data.member),
        username: username.trim(),
        password,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the member.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCredentials() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`Username: ${created.username}\nTemporary password: ${created.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the credentials are still on screen */
    }
  }

  if (created) {
    return (
      <Drawer eyebrow="Members" title="Member registered" subtitle={created.name} onClose={onClose}
        footer={
          <>
            <button type="button" onClick={onClose} className={secondaryButton}>Done</button>
            <button type="button" onClick={() => onOpenProfile(created.memberId)} className={primaryButton}>Open profile</button>
          </>
        }
      >
        <div className={successBox}>The account was created successfully.</div>

        <div className={`${cardSurface} space-y-3 p-5`}>
          <p className="text-sm font-semibold text-[#0b2545] dark:text-white">Share these sign-in details with the member</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-zinc-400">Username</dt>
              <dd className="font-mono font-medium">{created.username}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 dark:text-zinc-400">TemporaryPassword</dt>
              <dd className="break-all font-mono font-medium">{created.password}</dd>
            </div>
          </dl>
          <button type="button" onClick={() => void copyCredentials()} className={pillButton}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy details"}
          </button>
          <p className="text-xs text-slate-500 dark:text-zinc-500">
            This is the only time the password is shown. It is not stored in readable form.
          </p>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      eyebrow="Members"
      title="Register a member"
      subtitle="Creates the member profile and their sign-in account."
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" form="register-member-form" disabled={busy} className={primaryButton}>
            {busy ? "Registering..." : "Register member"}
          </button>
        </>
      }
    >
      {error && <div role="alert" className={errorBox}>{error}</div>}

      <form id="register-member-form" onSubmit={submit} className="space-y-7">
        <section className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Sign-in account</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" required>
              <input required value={username} onChange={(e) => setUsername(e.target.value)} maxLength={50} autoComplete="off" className={inputClass} />
            </Field>
            <Field label="Membership date" required>
              <input required type="date" value={membershipDate} max={today()} onChange={(e) => setMembershipDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Password" required hint="At least 12 characters." className="sm:col-span-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}
                  className={pillButton}
                >
                  <KeyRound size={15} />
                  Generate
                </button>
              </div>
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Member details</h4>
          <MemberFields form={form} setForm={setForm} disabled={busy} />
        </section>
      </form>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Member profile drawer (borrower information + edit)                 */
/* ------------------------------------------------------------------ */

function MemberDrawer({
  memberId,
  onClose,
  onChanged,
}: {
  memberId: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmingStatus, setConfirmingStatus] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProfile(await fetchJson<Profile>(`/api/officer/members/${memberId}/profile`, "member profile"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the member profile.");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function patchMember(changes: Record<string, string>, successMessage: string) {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const response = await apiFetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!response.ok) throw new Error(await readMessage(response, "Update failed"));

      setNotice(successMessage);
      setEditing(false);
      setConfirmingStatus(false);
      await loadProfile();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the member.");
    } finally {
      setSaving(false);
    }
  }

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;

    const problem = validateForm(form);
    if (problem) return setError(problem);

    const original = toForm(profile.member);
    const changes: Record<string, string> = {};
    (Object.keys(form) as (keyof MemberForm)[]).forEach((key) => {
      if (form[key].trim() !== original[key].trim()) changes[key] = form[key].trim();
    });

    if (Object.keys(changes).length === 0) {
      setError("");
      setEditing(false);
      return;
    }

    void patchMember(changes, "Member updated successfully.");
  }

  const m = profile?.member;
  const isActive = (m?.membership_status ?? "active") === "active";
  const s = profile?.summary;

  return (
    <Drawer
      eyebrow={`Member #${memberId}`}
      title={m ? fullName(m) : "Member"}
      subtitle={m?.email ?? undefined}
      onClose={onClose}
      wide
      footer={
        m && !editing ? (
          <>
            {confirmingStatus ? (
              <>
                <span className="mr-auto text-xs text-slate-500 dark:text-zinc-400">
                  {isActive ? "Inactive members cannot apply for loans." : "This member will be able to apply for loans again."}
                </span>
                <button type="button" onClick={() => setConfirmingStatus(false)} className={secondaryButton}>Cancel</button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void patchMember({ membership_status: isActive ? "inactive" : "active" }, isActive ? "Membership deactivated." : "Membership activated.")}
                  className={primaryButton}
                >
                  {saving ? "Saving..." : "Confirm"}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setConfirmingStatus(true)} className={secondaryButton}>
                  {isActive ? "Deactivate membership" : "Activate membership"}
                </button>
                {isActive ? (
                  <Link href={`/loan-officer/applications/new?member=${memberId}`} className={primaryButton}>
                    <Plus size={16} />
                    New application
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-zinc-500">Activate this member to start an application.</span>
                )}
              </>
            )}
          </>
        ) : undefined
      }
    >
      {error && <div role="alert" className={errorBox}>{error}</div>}
      {notice && <div role="status" className={successBox}>{notice}</div>}

      {loading && !profile ? (
        <p className="text-sm text-slate-500 dark:text-zinc-400">Loading member...</p>
      ) : !profile || !m || !s ? null : editing ? (
        <form onSubmit={save} className="space-y-6">
          <MemberFields form={form} setForm={setForm} disabled={saving} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setError(""); }} className={secondaryButton}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryButton}>{saving ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <Badge value={m.membership_status ?? "active"} />
            <button type="button" onClick={() => { setForm(toForm(m)); setEditing(true); setNotice(""); setError(""); }} className={pillButton}>
              <Pencil size={14} />
              Edit details
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["Borrowed", naira(s.total_borrowed)],
              ["Repaid", naira(s.total_repaid)],
              ["Outstanding", naira(s.total_outstanding)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 p-3 dark:border-white/[0.07]">
                <p className="text-xs text-slate-500 dark:text-zinc-400">{label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-[#0b2545] dark:text-white">{value}</p>
              </div>
            ))}
          </div>

          <DetailBlock
            title="Personal details"
            items={[
              { label: "Full name", value: fullName(m) },
              { label: "Gender", value: titleCase(m.gender) },
              { label: "Date of birth", value: fmtDate(m.date_of_birth) },
              { label: "Phone", value: m.phone || NA },
              { label: "Email", value: m.email || NA },
              { label: "Address", value: m.address || NA },
            ]}
          />

          <DetailBlock
            title="Membership"
            items={[
              { label: "Member since", value: fmtDate(m.membership_date) },
              { label: "Category", value: m.member_category || NA },
              { label: "Cooperative unit", value: m.cooperative_unit || NA },
              { label: "Cooperative ID", value: m.cooperative_id ?? NA },
            ]}
          />

          <DetailBlock
            title="Borrowing history"
            items={[
              { label: "Applications", value: `${s.total_applications} (${s.applications_by_status.pending ?? 0} pending)` },
              { label: "Loans", value: s.total_loans },
              { label: "Active", value: s.loans_by_status.active ?? 0 },
              { label: "Overdue", value: s.loans_by_status.overdue ?? 0 },
              { label: "Defaulted", value: s.loans_by_status.defaulted ?? 0 },
              { label: "Completed", value: s.loans_by_status.completed ?? 0 },
            ]}
          />

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Applications</h4>
            {profile.applications.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">No applications yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.06]">
                {profile.applications.slice(0, 5).map((a) => (
                  <li key={a.application_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-zinc-100">
                        #{a.application_id} · {titleCase(a.loan_type)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-500">
                        {naira(a.amount_requested)} · {fmtDate(a.application_date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge value={a.application_status} />
                      <Link href={`/loan-officer/applications?id=${a.application_id}`} className={rowButton}>Open</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {profile.applications.length > 5 && (
              <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">+ {profile.applications.length - 5} more in Applications.</p>
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Loans</h4>
            {profile.loans.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">No loans yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-white/[0.06]">
                {profile.loans.slice(0, 5).map((l) => (
                  <li key={l.loan_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-zinc-100">
                        Loan #{l.loan_id} · {titleCase(l.loan_type)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-zinc-500">
                        {naira(l.outstanding_balance)} outstanding of {naira(l.amount_approved)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge value={l.loan_status} />
                      <Link href={`/loan-officer/loans?id=${l.loan_id}`} className={rowButton}>Open</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {profile.loans.length > 5 && (
              <p className="mt-2 text-xs text-slate-500 dark:text-zinc-500">+ {profile.loans.length - 5} more in Loans.</p>
            )}
          </section>
        </>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MembersClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const body = await fetchJson<{ members: Member[] }>("/api/members/", "members");
      setMembers(body.members ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Deep links: ?id=12 opens a profile, ?new=1 opens the register form.
  useEffect(() => {
    const id = Number(searchParams.get("id"));
    const wantsNew = searchParams.get("new") === "1";
    if (!id && !wantsNew) return;

    if (id) setSelectedId(id);
    if (wantsNew) setRegistering(true);
    router.replace(pathname);
  }, [searchParams, router, pathname]);

  const categories = useMemo(
    () => [...new Set(members.map((m) => m.member_category).filter((v): v is string => !!v))].sort(),
    [members]
  );
  const units = useMemo(
    () => [...new Set(members.map((m) => m.cooperative_unit).filter((v): v is string => !!v))].sort(),
    [members]
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return members.filter((m) => {
      if (status !== "all" && (m.membership_status ?? "active") !== status) return false;
      if (!needle) return true;
      return [m.member_id, fullName(m), m.email, m.phone, m.member_category, m.cooperative_unit]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [members, search, status]);

  const pageInfo = paginate(filtered, page, pageSize);
  const activeCount = members.filter((m) => (m.membership_status ?? "active") === "active").length;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[#0b2545] dark:text-white">Members</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
            {loading ? "Loading members..." : `${members.length} members · ${activeCount} active`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className={pillButton}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button" onClick={() => setRegistering(true)} className={primaryButton}>
            <UserPlus size={17} />
            Register member
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" className={errorBox}>
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-2">
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}
      {notice && <div role="status" className={successBox}>{notice}</div>}

      <datalist id="member-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id="cooperative-units">{units.map((u) => <option key={u} value={u} />)}</datalist>

      <section className={`${cardSurface} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-white/[0.07]">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, email, phone, unit..."
              aria-label="Search members"
              className={`${fieldClass} w-full pl-9`}
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Membership status"
            className={fieldClass}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/[0.08] dark:text-zinc-500">
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Unit</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {loading && members.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500 dark:text-zinc-400">Loading members...</td></tr>
              ) : pageInfo.visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 dark:text-zinc-400">
                    {members.length === 0 ? "No members registered yet." : "No members match your search."}
                  </td>
                </tr>
              ) : (
                pageInfo.visible.map((m) => (
                  <tr
                    key={m.member_id}
                    onClick={() => setSelectedId(m.member_id)}
                    className="cursor-pointer transition hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`${iconTile} !rounded-full !p-0 flex h-9 w-9 items-center justify-center text-xs font-semibold`}>
                          {(m.first_name?.[0] ?? "").toUpperCase()}{(m.last_name?.[0] ?? "").toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-zinc-100">{fullName(m)}</p>
                          <p className="text-xs text-slate-500 dark:text-zinc-500">{m.email || NA}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-zinc-300">{m.phone || NA}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-zinc-300">{m.member_category || NA}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-zinc-300">{m.cooperative_unit || NA}</td>
                    <td className="px-5 py-4"><Badge value={m.membership_status ?? "active"} /></td>
                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-zinc-500">{fmtDate(m.membership_date)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(m.member_id); }}
                        className={rowButton}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          total={filtered.length}
          unfilteredTotal={members.length}
          info={pageInfo}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(size) => { setPageSize(size); setPage(1); }}
        />
      </section>

      {registering && (
        <RegisterDrawer
          onClose={() => setRegistering(false)}
          onCreated={() => { setNotice("Member registered successfully."); void load(); }}
          onOpenProfile={(id) => { setRegistering(false); setSelectedId(id); }}
        />
      )}

      {selectedId !== null && (
        <MemberDrawer
          memberId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}