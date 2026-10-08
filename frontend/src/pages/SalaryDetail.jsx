import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Banknote, Wallet, PiggyBank, Receipt, Pencil, CircleCheck, RotateCcw, Trash2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { formatPretty } from "../lib/date";
import StatCard from "../components/StatCard";
import DatePicker from "../components/DatePicker";
import SalaryBar from "../components/SalaryBar";

function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500";

export default function SalaryDetail() {
  const { id } = useParams();
  const salaryId = Number(id);
  const { token } = useAuth();
  const navigate = useNavigate();

  const [salaries, setSalaries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState(null);

  const load = async () => {
    try {
      const [s, e] = await Promise.all([api.listSalaries(token), api.listExpenses(token)]);
      setSalaries(s);
      setExpenses(e);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaryId]);

  const salary = salaries.find((s) => s.id === salaryId);
  const rows = useMemo(() => expenses.filter((e) => e.salary_id === salaryId), [expenses, salaryId]);

  const byCategory = useMemo(() => {
    const map = {};
    rows.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editForm.label.trim() || Number(editForm.amount) <= 0) {
      toast.error("Name and an amount above ₹0 are required.");
      return;
    }
    try {
      await api.updateSalary(salaryId, { ...editForm, label: editForm.label.trim(), amount: Number(editForm.amount) }, token);
      toast.success("Salary updated!");
      setEditForm(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleFinish = async () => {
    if (!window.confirm(`Finish "${salary.label}"? New expenses won't be linked to it anymore.`)) return;
    try {
      await api.closeSalary(salaryId, token);
      toast.success("Salary moved to history.");
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReopen = async () => {
    try {
      await api.reopenSalary(salaryId, token);
      toast.success("Salary reopened.");
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${salary.label}"? Its expenses are kept, they just won't belong to any salary.`)) return;
    try {
      await api.deleteSalary(salaryId, token);
      toast.success("Salary deleted.");
      navigate("/salaries");
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8 animate-pulse">
        <div className="h-10 w-56 rounded-xl bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  if (!salary) {
    return (
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
        <p className="text-slate-500 dark:text-slate-400 mb-4">That salary was not found.</p>
        <Link to="/salaries" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
          Back to salaries
        </Link>
      </div>
    );
  }

  const left = salary.amount - salary.spent;
  const isCurrent = !salary.closed_date;

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
      <Link
        to="/salaries"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        All salaries
      </Link>

      <div className="flex flex-wrap items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shrink-0">
          <Banknote className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{salary.label}</h1>
            {isCurrent && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                Current
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {formatPretty(salary.received_date)} – {isCurrent ? "now" : formatPretty(salary.closed_date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEditForm({ label: salary.label, amount: String(salary.amount), received_date: salary.received_date })}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          {isCurrent ? (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <CircleCheck className="w-4 h-4" />
              Finish
            </button>
          ) : (
            <button
              onClick={handleReopen}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Reopen
            </button>
          )}
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {editForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6 max-w-lg mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Edit salary</h3>
            <button onClick={() => setEditForm(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
              <input
                type="text"
                value={editForm.label}
                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Received on</label>
              <DatePicker value={editForm.received_date} onChange={(v) => setEditForm((f) => ({ ...f, received_date: v }))} />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-gradient text-white font-medium py-2.5 shadow-glow hover:opacity-90 transition"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Banknote} label="Salary" value={currency(salary.amount)} accent={{ bg: "#f5f3ff", fg: "#7c3aed" }} />
        <StatCard icon={Wallet} label="Spent" value={currency(salary.spent)} accent={{ bg: "#fdf2f8", fg: "#ec4899" }} />
        <StatCard
          icon={PiggyBank}
          label={left < 0 ? "Overspent" : isCurrent ? "Left" : "Saved"}
          value={currency(Math.abs(left))}
          accent={left < 0 ? { bg: "#fef2f2", fg: "#ef4444" } : { bg: "#f0fdf4", fg: "#16a34a" }}
        />
        <StatCard icon={Receipt} label="Expenses" value={salary.expense_count} accent={{ bg: "#fff7ed", fg: "#f97316" }} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-5 mb-6">
        <SalaryBar amount={salary.amount} spent={salary.spent} />
      </div>

      {!rows.length ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-12 text-center text-slate-400">
          No expenses in this salary yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 items-start">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-5">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Where it went</h3>
            <div className="space-y-3">
              {byCategory.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{currency(c.value)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${salary.spent ? (c.value / salary.spent) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.expense_date}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium whitespace-nowrap">{currency(row.amount)}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.category}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.description}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 px-4 py-3 border-t border-slate-100 dark:border-slate-800">
              To edit or move an expense, use History & Manage on the dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
