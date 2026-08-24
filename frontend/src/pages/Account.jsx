import { useEffect, useState } from "react";
import { UserRound, Mail, Calendar, Receipt, Wallet, Layers, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import StatCard from "../components/StatCard";

function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function Account() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.accountStats(token).then(setStats).catch((err) => toast.error(err.message));
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

  const displayName = user?.full_name || user?.username || "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
          <UserRound className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-2xl shadow-card p-6 lg:col-span-1">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-brand-gradient text-white flex items-center justify-center text-2xl font-bold mb-3">
              {initial || "?"}
            </div>
            <p className="font-semibold text-slate-900">{displayName}</p>
            <p className="text-sm text-slate-400">@{user?.username}</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2.5 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              {user?.email}
            </div>
            {user?.created_at && (
              <div className="flex items-center gap-2.5 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                Member since {user.created_at}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
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
      </div>

      <div className="bg-white rounded-2xl shadow-card p-6 max-w-lg">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Change password</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Current password</label>
            <input
              type="password"
              required
              value={pwForm.current_password}
              onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
            <input
              type="password"
              required
              value={pwForm.new_password}
              onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm new password</label>
            <input
              type="password"
              required
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
            />
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
    </div>
  );
}
