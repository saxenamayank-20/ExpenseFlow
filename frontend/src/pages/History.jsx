import { useMemo, useState } from "react";
import { Download, Trash2, Save, X, Search, ArrowUp, ArrowDown, ArrowUpDown, History as HistoryIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import DatePicker from "../components/DatePicker";
import { salaryForDate } from "../lib/salary";
import { useExpenseData, currency } from "../lib/useExpenseData";

const HISTORY_COLUMNS = [
  { key: "expense_date", label: "Date" },
  { key: "amount", label: "Amount" },
  { key: "category", label: "Category" },
  { key: "description", label: "Description" },
  { key: "payment_method", label: "Payment Method" },
  { key: "salary_label", label: "Salary" },
];

export default function History() {
  const { token } = useAuth();
  const { meta, expenses, salaries, loading, reload } = useExpenseData();

  const [historyCategory, setHistoryCategory] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [sortKey, setSortKey] = useState("expense_date");
  const [sortDir, setSortDir] = useState("desc");

  const [selectedId, setSelectedId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // which salary each expense falls in, worked out from its date
  const expensesWithSalary = useMemo(
    () => expenses.map((e) => ({ ...e, salary_label: salaryForDate(salaries, e.expense_date)?.label || "" })),
    [expenses, salaries]
  );

  const historyFiltered = useMemo(() => {
    let rows = historyCategory
      ? expensesWithSalary.filter((e) => e.category === historyCategory)
      : expensesWithSalary;
    const q = historySearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.payment_method?.toLowerCase().includes(q) ||
          e.salary_label.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [expensesWithSalary, historyCategory, historySearch]);

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
      await reload();
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
      await reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportCsv = () => {
    const header = ["Date", "Amount", "Category", "Description", "Payment Method", "Salary"];
    const rows = historySorted.map((e) => [e.expense_date, e.amount, e.category, e.description, e.payment_method, e.salary_label]);
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
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8 animate-pulse">
        <div className="h-10 w-56 rounded-xl bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="h-10 w-96 rounded-xl bg-slate-200 dark:bg-slate-800 mb-4" />
        <div className="h-96 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
          <HistoryIcon className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">History</h1>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6 ml-[3.25rem]">
        Every expense you have added. Click a row to fix or delete it.
      </p>

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
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.salary_label || "—"}</td>
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
    </div>
  );
}
