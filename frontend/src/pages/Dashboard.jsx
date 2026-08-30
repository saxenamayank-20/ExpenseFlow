import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import {
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  HeartPulse,
  Plus,
  Download,
  Trash2,
  Save,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Trophy,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api";
import { getPrefs } from "../lib/prefs";
import StatCard from "../components/StatCard";
import DatePicker from "../components/DatePicker";
import DateRangePicker from "../components/DateRangePicker";

const PIE_COLORS = ["#7c3aed", "#a855f7", "#ec4899", "#f472b6", "#c084fc", "#f97316", "#22c55e", "#3b82f6", "#94a3b8"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "add", label: "Add Expense" },
  { key: "history", label: "History & Manage" },
];

const HISTORY_COLUMNS = [
  { key: "expense_date", label: "Date" },
  { key: "amount", label: "Amount" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "payment_method", label: "Payment Method" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function prevMonthKey(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [meta, setMeta] = useState({ categories: [], payment_methods: [] });
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [historyCategory, setHistoryCategory] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [sortKey, setSortKey] = useState("expense_date");
  const [sortDir, setSortDir] = useState("desc");

  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const [addForm, setAddForm] = useState({
    expense_date: todayStr(),
    amount: "",
    category: "",
    description: "",
    payment_method: "",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);

  const loadExpenses = async () => {
    const data = await api.listExpenses(token);
    setExpenses(data);
    if (data.length) {
      const dates = data.map((e) => e.expense_date).sort();
      setStartDate((s) => s || dates[0]);
      setEndDate((e) => e || dates[dates.length - 1]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [metaData] = await Promise.all([api.meta(), loadExpenses()]);
        setMeta(metaData);
        const prefs = getPrefs();
        const defaultCategory =
          prefs.defaultCategory && metaData.categories.includes(prefs.defaultCategory)
            ? prefs.defaultCategory
            : metaData.categories[0] || "";
        const defaultPaymentMethod =
          prefs.defaultPaymentMethod && metaData.payment_methods.includes(prefs.defaultPaymentMethod)
            ? prefs.defaultPaymentMethod
            : metaData.payment_methods[0] || "";
        setAddForm((f) => ({ ...f, category: defaultCategory, payment_method: defaultPaymentMethod }));
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dataMinDate = useMemo(
    () => (expenses.length ? expenses.map((e) => e.expense_date).sort()[0] : null),
    [expenses]
  );
  const dataMaxDate = useMemo(
    () => (expenses.length ? expenses.map((e) => e.expense_date).sort().slice(-1)[0] : null),
    [expenses]
  );

  const dateFiltered = useMemo(() => {
    return expenses.filter((e) => {
      if (startDate && e.expense_date < startDate) return false;
      if (endDate && e.expense_date > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  // History shows every expense regardless of the Overview date range --
  // only its own independent search box and category dropdown filter it.
  const historyFiltered = useMemo(() => {
    let rows = historyCategory ? expenses.filter((e) => e.category === historyCategory) : expenses;
    const q = historySearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.payment_method?.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [expenses, historyCategory, historySearch]);

  const historySorted = useMemo(() => {
    const rows = [...historyFiltered];
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === "amount") return (a.amount - b.amount) * dir;
      return String(a[sortKey]).localeCompare(String(b[sortKey])) * dir;
    });
    return rows;
  }, [historyFiltered, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "expense_date" ? "desc" : "asc");
    }
  };

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

  const dailyData = useMemo(() => {
    const map = {};
    dateFiltered.forEach((e) => {
      map[e.expense_date] = (map[e.expense_date] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => {
        const [, month, day] = date.split("-");
        return { date: `${day}-${Number(month)}`, amount };
      });
  }, [dateFiltered]);

  const monthlyData = useMemo(() => {
    const map = {};
    dateFiltered.forEach((e) => {
      const month = e.expense_date.slice(0, 7);
      map[month] = (map[month] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
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
      await loadExpenses();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddSubmitting(false);
    }
  };

  const selectRow = (row) => {
    setSelectedId(row.id);
    setEditForm({ ...row, amount: String(row.amount) });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (Number(editForm.amount) <= 0 || !editForm.description.trim()) {
      toast.error("Amount and description are required.");
      return;
    }
    try {
      await api.updateExpense(
        selectedId,
        { ...editForm, amount: Number(editForm.amount), description: editForm.description.trim() },
        token
      );
      toast.success("Expense updated!");
      setSelectedId(null);
      setEditForm(null);
      await loadExpenses();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteExpense(selectedId, token);
      toast.success("Transaction deleted!");
      setSelectedId(null);
      setEditForm(null);
      await loadExpenses();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportCsv = () => {
    const header = ["Date", "Amount", "Category", "Description", "Payment Method"];
    const rows = historySorted.map((e) => [e.expense_date, e.amount, e.category, e.description, e.payment_method]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "expenses.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const chartAxisColor = isDark ? "#64748b" : "#94a3b8";
  const chartGridColor = isDark ? "#334155" : "#e2e8f0";
  const tooltipStyle = {
    contentStyle: {
      background: isDark ? "#1e293b" : "#fff",
      border: "none",
      borderRadius: 10,
      color: isDark ? "#f1f5f9" : "#0f172a",
      boxShadow: "0 8px 24px -8px rgba(15,23,42,0.25)",
    },
    labelStyle: { color: isDark ? "#f1f5f9" : "#0f172a" },
  };
  const legendStyle = { color: isDark ? "#cbd5e1" : "#475569" };

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
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl shadow-card p-4 mb-6">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Showing expenses for</span>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(s, e) => {
                setStartDate(s);
                setEndDate(e);
              }}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-5">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Spending by Category</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => currency(v)} {...tooltipStyle} />
                    <Legend wrapperStyle={legendStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-5">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Daily Spending</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
                    <YAxis tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
                    <Tooltip
                      formatter={(v) => currency(v)}
                      cursor={{ fill: isDark ? "rgba(168,85,247,0.12)" : "rgba(168,85,247,0.08)" }}
                      {...tooltipStyle}
                    />
                    <Bar dataKey="amount" fill="#a855f7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-5 lg:col-span-2">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Monthly Spending Trend</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
                    <YAxis tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
                    <Tooltip formatter={(v) => currency(v)} {...tooltipStyle} />
                    <Line type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: "#7c3aed" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "add" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6 max-w-lg">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Add a new expense</h3>
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

      {tab === "history" && (
        <div>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Filter by category</label>
              <select
                value={historyCategory}
                onChange={(e) => setHistoryCategory(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">All Categories</option>
                {meta.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Search</label>
              <Search className="absolute left-3 top-[calc(50%+0.375rem)] -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search description, category..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {!historySorted.length ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-12 text-center text-slate-400">
              No expenses found.
            </div>
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-left">
                        {HISTORY_COLUMNS.map((col) => (
                          <th key={col.key} className="px-4 py-3 font-medium">
                            <button
                              onClick={() => toggleSort(col.key)}
                              className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-100 transition"
                            >
                              {col.label}
                              {sortKey === col.key ? (
                                sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                              )}
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historySorted.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => selectRow(row)}
                          className={`border-t border-slate-100 dark:border-slate-800 cursor-pointer transition ${
                            selectedId === row.id
                              ? "bg-brand-50 dark:bg-brand-900/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
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
              </div>

              <button
                onClick={exportCsv}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition mb-6"
              >
                <Download className="w-4 h-4" />
                Export filtered expenses as CSV
              </button>

              {!selectedId ? (
                <p className="text-sm text-slate-400">👆 Click a row above to edit or delete that transaction — handy if something was added by mistake.</p>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6 max-w-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      Edit or delete: {editForm.description} — {currency(editForm.amount)}
                    </h3>
                    <button
                      onClick={() => { setSelectedId(null); setEditForm(null); }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
                      <DatePicker
                        value={editForm.expense_date}
                        onChange={(v) => setEditForm((f) => ({ ...f, expense_date: v }))}
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
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
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
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
                      <select
                        value={editForm.payment_method}
                        onChange={(e) => setEditForm((f) => ({ ...f, payment_method: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {meta.payment_methods.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-gradient text-white font-medium py-2.5 shadow-glow hover:opacity-90 transition"
                      >
                        <Save className="w-4 h-4" />
                        Update
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-medium py-2.5 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
