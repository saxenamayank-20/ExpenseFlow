import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Receipt, TrendingUp, TrendingDown, HeartPulse, Plus, Trophy, Zap, Banknote, ChartColumn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { getPrefs } from "../lib/prefs";
import StatCard from "../components/StatCard";
import DatePicker from "../components/DatePicker";
import DateRangePicker from "../components/DateRangePicker";
import SalaryBar from "../components/SalaryBar";
import { salaryForDate } from "../lib/salary";
import { toISO } from "../lib/date";
import { useExpenseData, useDateRange, currency } from "../lib/useExpenseData";

// charts live on the analytics page and the table on history, this is just the overview + add
const TABS = [
  { key: "overview", label: "Overview" },
  { key: "add", label: "Add Expense" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

function prevMonthKey(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const { token } = useAuth();
  const { meta, expenses, salaries, loading, reload } = useExpenseData();
  const {
    start: startDate,
    end: endDate,
    setRange,
    minDate: dataMinDate,
    maxDate: dataMaxDate,
    filtered: dateFiltered,
  } = useDateRange(expenses);
  const [tab, setTab] = useState("overview");

  const [addForm, setAddForm] = useState({
    expense_date: todayStr(),
    amount: "",
    category: "",
    description: "",
    payment_method: "",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  // fill in the saved default category / payment method once meta is in
  useEffect(() => {
    if (!meta.categories.length) return;
    const prefs = getPrefs();
    const defaultCategory =
      prefs.defaultCategory && meta.categories.includes(prefs.defaultCategory)
        ? prefs.defaultCategory
        : meta.categories[0] || "";
    const defaultPaymentMethod =
      prefs.defaultPaymentMethod && meta.payment_methods.includes(prefs.defaultPaymentMethod)
        ? prefs.defaultPaymentMethod
        : meta.payment_methods[0] || "";
    setAddForm((f) => ({ ...f, category: defaultCategory, payment_method: defaultPaymentMethod }));
  }, [meta]);

  const activeSalary = salaryForDate(salaries, toISO(new Date()));
  // the salary a new expense will land in, based on the date picked
  const addSalary = salaryForDate(salaries, addForm.expense_date);

  const total = dateFiltered.reduce((s, e) => s + e.amount, 0);
  const count = dateFiltered.length;
  const average = count ? total / count : 0;
  const medical = dateFiltered.filter((e) => e.category === "Medical").reduce((s, e) => s + e.amount, 0);

  const categoryData = useMemo(() => {
    const map = {};
    dateFiltered.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [dateFiltered]);

  // Smart Insights: computed straight from data already in memory.
  const insights = useMemo(() => {
    const out = [];

    if (categoryData.length) {
      const top = [...categoryData].sort((a, b) => b.value - a.value)[0];
      const pct = total ? Math.round((top.value / total) * 100) : 0;
      out.push({
        icon: Trophy,
        text: (
          <>
            <span className="font-semibold">{top.name}</span> is your top category this period —{" "}
            {currency(top.value)} ({pct}%)
          </>
        ),
      });
    }

    if (dateFiltered.length) {
      const biggest = [...dateFiltered].sort((a, b) => b.amount - a.amount)[0];
      out.push({
        icon: Zap,
        text: (
          <>
            Biggest expense this period: <span className="font-semibold">{currency(biggest.amount)}</span> on{" "}
            {biggest.description}
          </>
        ),
      });
    }

    const thisMonthKey = todayStr().slice(0, 7);
    const lastMonthKey = prevMonthKey(thisMonthKey);
    const thisMonthTotal = expenses
      .filter((e) => e.expense_date.startsWith(thisMonthKey))
      .reduce((s, e) => s + e.amount, 0);
    const lastMonthTotal = expenses
      .filter((e) => e.expense_date.startsWith(lastMonthKey))
      .reduce((s, e) => s + e.amount, 0);
    if (lastMonthTotal > 0) {
      const change = Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100);
      out.push({
        icon: change >= 0 ? TrendingUp : TrendingDown,
        text: (
          <>
            You've spent <span className="font-semibold">{Math.abs(change)}% {change >= 0 ? "more" : "less"}</span>{" "}
            this month than last month
          </>
        ),
      });
    }

    return out;
  }, [categoryData, dateFiltered, expenses, total]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (Number(addForm.amount) <= 0) {
      toast.error("Please enter an amount greater than ₹0.");
      return;
    }
    if (!addForm.description.trim()) {
      toast.error("Please add a description.");
      return;
    }
    setAddSubmitting(true);
    try {
      await api.addExpense(
        { ...addForm, amount: Number(addForm.amount), description: addForm.description.trim() },
        token
      );
      toast.success("Expense added!");
      setAddForm((f) => ({ ...f, amount: "", description: "" }));
      await reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8 animate-pulse">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-4 w-64 rounded bg-slate-200 dark:bg-slate-800 mb-6 ml-[3.25rem]" />
        <div className="h-10 w-72 rounded-xl bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Expense Tracker</h1>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6 ml-[3.25rem]">Track, filter, and understand your spending.</p>

      <div className="flex gap-1 mb-6 bg-white dark:bg-slate-900 rounded-xl shadow-card p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key
                ? "bg-brand-gradient text-white shadow-glow"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          {activeSalary && (
            <Link
              to={`/salaries/${activeSalary.id}`}
              className="block bg-white dark:bg-slate-900 rounded-2xl shadow-card p-4 mb-6 hover:shadow-lg transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Banknote className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{activeSalary.label}</span>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {currency(activeSalary.spent)} of {currency(activeSalary.available)} spent ·{" "}
                  <span
                    className={
                      activeSalary.left < 0
                        ? "text-red-500 font-medium"
                        : "text-green-600 dark:text-green-400 font-medium"
                    }
                  >
                    {currency(activeSalary.left)} left
                  </span>
                </span>
              </div>
              <SalaryBar amount={activeSalary.available} spent={activeSalary.spent} />
            </Link>
          )}

          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl shadow-card p-4 mb-6">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Showing expenses for</span>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={setRange}
              minDate={dataMinDate}
              maxDate={dataMaxDate}
            />
          </div>

          {insights.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {insights.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-white dark:bg-slate-900 rounded-2xl shadow-card p-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
                    <insight.icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug pt-1.5">{insight.text}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Wallet} label="Total Spent" value={currency(total)} accent={{ bg: "#f5f3ff", fg: "#7c3aed" }} />
            <StatCard icon={Receipt} label="Transactions" value={count} accent={{ bg: "#fdf2f8", fg: "#ec4899" }} />
            <StatCard icon={TrendingUp} label="Average Expense" value={currency(average)} accent={{ bg: "#fff7ed", fg: "#f97316" }} />
            <StatCard icon={HeartPulse} label="Medical Spending" value={currency(medical)} accent={{ bg: "#fef2f2", fg: "#ef4444" }} />
          </div>

          {!dateFiltered.length ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-12 text-center text-slate-400">
              No expenses match your current filters. Add one from the "Add Expense" tab.
            </div>
          ) : (
            <Link
              to="/analytics"
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-white dark:hover:bg-slate-900 transition"
            >
              <ChartColumn className="w-4 h-4" />
              See the charts on Performance & Analytics
            </Link>
          )}
        </div>
      )}

      {tab === "add" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6 max-w-lg">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Add a new expense</h3>
          {addSalary ? (
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm px-4 py-2.5 mb-4">
              <Banknote className="w-4 h-4 shrink-0" />
              <span>
                Goes into <span className="font-semibold">{addSalary.label}</span> ·{" "}
                {currency(addSalary.left)} left
              </span>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm px-4 py-2.5 mb-4">
              {salaries.length ? "This date is before your first salary." : "You have no salaries yet."}{" "}
              <Link to="/salaries" className="font-semibold underline">
                Add one
              </Link>
            </div>
          )}
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
              <DatePicker
                value={addForm.expense_date}
                onChange={(v) => setAddForm((f) => ({ ...f, expense_date: v }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={addForm.amount}
                onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
              >
                {meta.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
              <input
                type="text"
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Grocery, medicine..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
              <select
                value={addForm.payment_method}
                onChange={(e) => setAddForm((f) => ({ ...f, payment_method: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
              >
                {meta.payment_methods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={addSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-gradient text-white font-medium py-2.5 shadow-glow hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              {addSubmitting ? "Adding..." : "Add Expense"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
