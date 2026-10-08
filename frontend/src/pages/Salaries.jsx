import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, Plus, ChevronRight, PiggyBank } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { MONTH_NAMES, toISO, formatPretty } from "../lib/date";
import DatePicker from "../components/DatePicker";
import SalaryBar from "../components/SalaryBar";
import { salaryForDate } from "../lib/salary";

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

  const today = toISO(new Date());
  const current = salaryForDate(salaries, today);
  const others = salaries.filter((s) => s !== current);

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
    setSubmitting(true);
    try {
      await api.startSalary({ ...form, label: form.label.trim(), amount: Number(form.amount) }, token);
      toast.success("Salary added!");
      setForm({ label: defaultLabel(), amount: "", received_date: toISO(new Date()) });
      await loadSalaries();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
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
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {formatPretty(current.received_date)} – {current.end_date ? formatPretty(current.end_date) : "next salary"}
                </p>
              </div>
              <Link
                to={`/salaries/${current.id}`}
                className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap"
              >
                View expenses
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Salary</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{currency(current.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Carried over</p>
                <p className={`text-lg font-bold ${current.carried_over < 0 ? "text-red-500" : "text-slate-900 dark:text-slate-100"}`}>
                  {current.carried_over < 0 ? "-" : ""}
                  {currency(Math.abs(current.carried_over))}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Spent</p>
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{currency(current.spent)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Left</p>
                <p className={`text-lg font-bold ${current.left < 0 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                  {current.left < 0 ? "-" : ""}
                  {currency(Math.abs(current.left))}
                </p>
              </div>
            </div>

            <SalaryBar amount={current.available} spent={current.spent} />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-10 text-center">
            <PiggyBank className="w-10 h-10 mx-auto text-brand-400 mb-3" />
            <p className="font-medium text-slate-800 dark:text-slate-100">No current salary</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Got paid? Add your salary and everything you spend from that day goes into it.
            </p>
          </div>
        )}

        {/* start a new one */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Add salary</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            It covers every expense from this date until your next salary. Past salaries work too.
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
              {submitting ? "Adding..." : "Add Salary"}
            </button>
          </form>
        </div>
      </div>

      {/* every other salary */}
      <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Salary history</h2>
      {!others.length ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-10 text-center text-slate-400">
          Older salaries show up here.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card overflow-hidden">
          {others.map((s) => {
            // just this salary, without what was carried in
            const left = s.amount - s.spent;
            const upcoming = s.received_date > today;
            return (
              <Link
                key={s.id}
                to={`/salaries/${s.id}`}
                className="flex items-center gap-4 px-5 py-4 border-t first:border-t-0 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {s.label}
                    {upcoming && <span className="ml-2 text-xs font-normal text-slate-400">upcoming</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatPretty(s.received_date)} – {s.end_date ? formatPretty(s.end_date) : "next salary"} ·{" "}
                    {s.expense_count} expenses
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
