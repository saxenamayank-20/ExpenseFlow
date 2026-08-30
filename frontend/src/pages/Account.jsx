import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserRound,
  Calendar,
  Receipt,
  Wallet,
  Layers,
  KeyRound,
  Eye,
  EyeOff,
  IdCard,
  AtSign,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Moon,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api";
import { getPrefs, setPrefs } from "../lib/prefs";
import StatCard from "../components/StatCard";

function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const SECTIONS = [
  { key: "details", label: "Account Details", icon: IdCard },
  { key: "expenses", label: "Expense Details", icon: Receipt },
  { key: "password", label: "Change Password", icon: KeyRound },
  { key: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { key: "danger", label: "Danger Zone", icon: AlertTriangle },
];

export default function Account() {
  const { user, token, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [section, setSection] = useState("details");
  const [stats, setStats] = useState(null);
  const [meta, setMeta] = useState({ categories: [], payment_methods: [] });
  const [prefs, setPrefsState] = useState(getPrefs());

  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.accountStats(token).then(setStats).catch((err) => toast.error(err.message));
    api.meta().then(setMeta).catch(() => {});
  }, [token]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.changePassword(pwForm, token);
      toast.success("Password updated successfully.");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updatePref = (patch) => setPrefsState(setPrefs(patch));

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await api.deleteAccount({ current_password: deletePassword }, token);
      toast.success("Account deleted.");
      logout();
      navigate("/login");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const displayName = user?.full_name || user?.username || "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
          <UserRound className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Account</h1>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6 ml-[3.25rem]">
        Manage your profile, spending summary, and security.
      </p>

      {/* Profile banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-card mb-6">
        <div className="h-20 bg-brand-gradient" />
        <div className="bg-white dark:bg-slate-900 px-6 pb-5 flex items-end gap-4 -mt-8">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-card shrink-0">
            <div className="w-full h-full rounded-xl bg-brand-gradient text-white flex items-center justify-center text-xl font-bold">
              {initial || "?"}
            </div>
          </div>
          <div className="pb-1 min-w-0">
            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
            <p className="text-sm text-slate-400 truncate">@{user?.username}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5 items-start">
        {/* Settings sub-nav */}
        <nav className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                section === key
                  ? key === "danger"
                    ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                    : "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div>
          {section === "details" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <IdCard className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Account details</h3>
              </div>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <div className="flex items-center justify-between py-3.5">
                  <dt className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                    <UserRound className="w-4 h-4 text-slate-400" />
                    Full name
                  </dt>
                  <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{user?.full_name || "—"}</dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                    <AtSign className="w-4 h-4 text-slate-400" />
                    Username
                  </dt>
                  <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">@{user?.username}</dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Member since
                  </dt>
                  <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{user?.created_at}</dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    Account status
                  </dt>
                  <dd>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {section === "expenses" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Receipt className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Expense summary</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  icon={Receipt}
                  label="Expenses Logged"
                  value={stats ? stats.total_count : "—"}
                  accent={{ bg: "#fdf2f8", fg: "#ec4899" }}
                />
                <StatCard
                  icon={Wallet}
                  label="Total Tracked"
                  value={stats ? currency(stats.total_spent) : "—"}
                  accent={{ bg: "#f5f3ff", fg: "#7c3aed" }}
                />
                <StatCard
                  icon={Layers}
                  label="Categories Used"
                  value={stats ? stats.categories_used : "—"}
                  accent={{ bg: "#fff7ed", fg: "#f97316" }}
                />
              </div>
              <p className="text-sm text-slate-400 mt-5">
                Head to the Dashboard's History tab for a full breakdown and export options.
              </p>
            </div>
          )}

          {section === "password" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6 max-w-lg">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Change password</h3>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Current password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      required
                      value={pwForm.current_password}
                      onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 pr-11 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      value={pwForm.new_password}
                      onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 pr-11 outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={pwForm.confirm_password}
                      onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 pr-11 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-brand-gradient text-white font-medium py-2.5 shadow-glow hover:opacity-90 transition disabled:opacity-60"
                >
                  {submitting ? "Updating..." : "Update password"}
                </button>
              </form>
            </div>
          )}

          {section === "preferences" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6 max-w-lg">
              <div className="flex items-center gap-2 mb-5">
                <SlidersHorizontal className="w-5 h-5 text-slate-400" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Preferences</h3>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Appearance
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                      theme === "light"
                        ? "border-brand-500 bg-brand-50 text-brand-700"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                      theme === "dark"
                        ? "border-brand-500 bg-brand-900/40 text-brand-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </button>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Default category
                </label>
                <select
                  value={prefs.defaultCategory || ""}
                  onChange={(e) => updatePref({ defaultCategory: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">No default — use the first category</option>
                  {meta.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Default payment method
                </label>
                <select
                  value={prefs.defaultPaymentMethod || ""}
                  onChange={(e) => updatePref({ defaultPaymentMethod: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">No default — use the first payment method</option>
                  {meta.payment_methods.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Saved on this device only. These pre-fill the Add Expense form on the Dashboard.
              </p>
            </div>
          )}

          {section === "danger" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6 max-w-lg border border-red-100 dark:border-red-950/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-red-600 dark:text-red-400">Danger zone</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                Deleting your account permanently removes your profile and every expense you've
                logged. This cannot be undone.
              </p>
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm with your password
                  </label>
                  <div className="relative">
                    <input
                      type={showDeletePassword ? "text" : "password"}
                      required
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 pr-11 outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-medium py-2.5 hover:bg-red-700 transition disabled:opacity-60"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? "Deleting..." : "Delete my account"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
