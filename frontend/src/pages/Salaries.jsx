import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Plus, ChevronRight, CircleCheck, PiggyBank } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { MONTH_NAMES, toISO, formatPretty } from "../lib/date";
import DatePicker from "../components/DatePicker";
import SalaryBar from "../components/SalaryBar";

function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function defaultLabel() {
  const d = new Date();
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()} Salary`;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500";

export default function Salaries() {
  const { token } = useAuth();
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: defaultLabel(), amount: "", received_date: toISO(new Date()) });
  const [submitting, setSubmitting] = useState(false);

  const loadSalaries = async () => {
    try {
      setSalaries(await api.listSalaries(token));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalaries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = salaries.find((s) => !s.closed_date);
  const past = salaries.filter((s) => s.closed_date);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      toast.error("Please give the salary a name.");
      return;
    }
    if (Number(form.amount) <= 0) {
      toast.error("Please enter an amount greater than ₹0.");
      return;
    }
    if (current && !window.confirm(`This will finish "${current.label}" and move it to history. Continue?`)) {
      return;
    }
    setSubmitting(true);
    try {
      await api.startSalary({ ...form, label: form.label.trim(), amount: Number(form.amount) }, token);
      toast.success("New salary started!");
      setForm({ label: defaultLabel(), amount: "", received_date: toISO(new Date()) });
      await loadSalaries();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = async () => {
    if (!window.confirm(`Finish "${current.label}"? New expenses won't be linked to it anymore.`)) return;
    try {
      await api.closeSalary(current.id, token);
      toast.success("Salary moved to history.");
      await loadSalaries();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8 animate-pulse">
        <div className="h-10 w-56 rounded-xl bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
          <Banknote className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Salaries</h1>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6 ml-[3.25rem]">
        Each salary keeps its own expenses, so months never get mixed up.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start mb-8">
        {/* current salary */}
        {current ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 mb-1.5">
                  Current salary
                </span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">{current.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Received {formatPretty(current.received_date)}</p>
              </div>
              <Link
                to={`/salaries/${current.id}`}
                className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap"
              >
                View expenses
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Salary</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{currency(current.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Spent</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{currency(current.spent)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Left</p>
                <p
                  className={`text-lg font-bold ${
                    current.amount - current.spent < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {currency(current.amount - current.spent)}
                </p>
              </div>
            </div>

            <SalaryBar amount={current.amount} spent={current.spent} />

            <button
              onClick={handleFinish}
              className="mt-5 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <CircleCheck className="w-4 h-4" />
              Finish this salary
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-10 text-center">
            <PiggyBank className="w-10 h-10 mx-auto text-brand-400 mb-3" />
            <p className="font-medium text-slate-800 dark:text-slate-100">No current salary</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Got paid? Start a new salary and every expense you add after that goes into it.
            </p>
          </div>
        )}

        {/* start a new one */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Start new salary</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {current ? `"${current.label}" will move to history.` : "Use this every time you get paid."}
          </p>
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Received on</label>
              <DatePicker value={form.received_date} onChange={(v) => setForm((f) => ({ ...f, received_date: v }))} />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-gradient text-white font-medium py-2.5 shadow-glow hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              {submitting ? "Starting..." : "Start Salary"}
            </button>
          </form>
        </div>
      </div>

      {/* past salaries */}
      <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Salary history</h2>
      {!past.length ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-10 text-center text-slate-400">
          Finished salaries show up here.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card overflow-hidden">
          {past.map((s) => {
            const left = s.amount - s.spent;
            return (
              <Link
                key={s.id}
                to={`/salaries/${s.id}`}
                className="flex items-center gap-4 px-5 py-4 border-t first:border-t-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{s.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatPretty(s.received_date)} – {formatPretty(s.closed_date)} · {s.expense_count} expenses
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Salary</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{currency(s.amount)}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Spent</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{currency(s.spent)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{left < 0 ? "Over" : "Saved"}</p>
                  <p className={`text-sm font-semibold ${left < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                    {currency(Math.abs(left))}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
