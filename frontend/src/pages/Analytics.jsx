import { useMemo } from "react";
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
import { ChartColumn, Lightbulb } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import DateRangePicker from "../components/DateRangePicker";
import { formatPretty, toISO } from "../lib/date";
import { useExpenseData, useDateRange, currency } from "../lib/useExpenseData";

const PIE_COLORS = ["#7c3aed", "#a855f7", "#ec4899", "#f472b6", "#c084fc", "#f97316", "#22c55e", "#3b82f6", "#94a3b8"];

// card with a chart, a line on what it shows and a takeaway from the data
function ChartCard({ title, explain, takeaway, className = "", children }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-card p-5 ${className}`}>
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{explain}</p>
      {children}
      {takeaway && (
        <div className="flex items-start gap-2 mt-3 rounded-xl bg-brand-50 dark:bg-brand-900/30 px-3 py-2 text-sm text-brand-800 dark:text-brand-200">
          <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{takeaway}</span>
        </div>
      )}
    </div>
  );
}

function monthName(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function Analytics() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { expenses, salaries, loading } = useExpenseData();
  const { start, end, setRange, minDate, maxDate, filtered } = useDateRange(expenses);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const categoryData = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const dailyTotals = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      map[e.expense_date] = (map[e.expense_date] || 0) + e.amount;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const dailyData = dailyTotals.map(([date, amount]) => {
    const [, month, day] = date.split("-");
    return { date: `${day}-${Number(month)}`, amount };
  });

  const monthlyData = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      const month = e.expense_date.slice(0, 7);
      map[month] = (map[month] || 0) + e.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }, [filtered]);

  // salaries that already started, oldest first. not tied to the date range
  const salaryData = useMemo(() => {
    const today = toISO(new Date());
    return salaries
      .filter((s) => s.received_date <= today)
      .reverse()
      .map((s) => ({
        name: s.label.replace(/ salary$/i, ""),
        label: s.label,
        salary: s.amount,
        spent: s.spent,
        rate: s.amount > 0 ? Math.round(((s.amount - s.spent) / s.amount) * 100) : 0,
        finished: !!s.end_date,
      }));
  }, [salaries]);

  // ---------- takeaways ----------

  const categoryTakeaway = categoryData.length
    ? `${categoryData[0].name} takes the biggest share: ${currency(categoryData[0].value)} (${Math.round(
        (categoryData[0].value / total) * 100
      )}% of everything you spent here).`
    : null;

  const dailyTakeaway = (() => {
    if (!dailyTotals.length) return null;
    const [topDate, topAmount] = [...dailyTotals].sort((a, b) => b[1] - a[1])[0];
    const avg = total / dailyTotals.length;
    return `Your most expensive day was ${formatPretty(topDate)} at ${currency(topAmount)}. On days you spend, it's about ${currency(avg)} on average.`;
  })();

  const monthlyTakeaway = (() => {
    if (monthlyData.length < 2) return monthlyData.length ? "Pick a longer date range to compare months." : null;
    const prev = monthlyData[monthlyData.length - 2];
    const last = monthlyData[monthlyData.length - 1];
    const change = prev.amount ? Math.round(((last.amount - prev.amount) / prev.amount) * 100) : 0;
    return `From ${monthName(prev.month)} to ${monthName(last.month)} your spending went ${change >= 0 ? "up" : "down"} ${Math.abs(change)}%.`;
  })();

  // only finished salaries, the running one would look great just because the month isn't over
  const salaryTakeaway = (() => {
    const done = salaryData.filter((d) => d.finished);
    if (!done.length) return salaryData.length ? "Once your first salary period ends, you'll see how much of it you kept." : null;
    const avgRate = Math.round(done.reduce((s, d) => s + d.rate, 0) / done.length);
    const best = [...done].sort((a, b) => b.rate - a.rate)[0];
    const base = `On average you keep ${avgRate}% of each finished salary.`;
    return done.length > 1 ? `${base} Best one so far: ${best.label} (${best.rate}% saved).` : base;
  })();

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
  const barCursor = { fill: isDark ? "rgba(168,85,247,0.12)" : "rgba(168,85,247,0.08)" };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8 animate-pulse">
        <div className="h-10 w-72 rounded-xl bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
          <ChartColumn className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Performance & Analytics</h1>
      </div>
      <p className="text-slate-500 dark:text-slate-400 mb-6 ml-[3.25rem]">
        Where your money goes, how it changes over time, and how much of each salary you keep.
      </p>

      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl shadow-card p-4 mb-6">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Showing expenses for</span>
        <DateRangePicker startDate={start} endDate={end} onChange={setRange} minDate={minDate} maxDate={maxDate} />
      </div>

      {!filtered.length ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-12 text-center text-slate-400 mb-5">
          No expenses in this date range yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <ChartCard
            title="Spending by Category"
            explain="How your spending in this date range splits across categories."
            takeaway={categoryTakeaway}
          >
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
          </ChartCard>

          <ChartCard
            title="Daily Spending"
            explain="Total spent on each day. Tall bars are the days that cost the most."
            takeaway={dailyTakeaway}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
                <YAxis tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
                <Tooltip formatter={(v) => currency(v)} cursor={barCursor} {...tooltipStyle} />
                <Bar dataKey="amount" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            className="lg:col-span-2"
            title="Monthly Spending Trend"
            explain="Total spent per calendar month, so you can see if spending is going up or down."
            takeaway={monthlyTakeaway}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
                <YAxis tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
                <Tooltip formatter={(v) => currency(v)} {...tooltipStyle} />
                <Line type="monotone" dataKey="amount" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: "#7c3aed" }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      <ChartCard
        title="Salary Performance"
        explain="Each salary next to what you spent from it. This one shows all your salaries, whatever the date range above."
        takeaway={salaryTakeaway}
      >
        {!salaryData.length ? (
          <p className="text-sm text-slate-400 py-8 text-center">Add a salary on the Salaries page to see this.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salaryData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
              <YAxis tick={{ fontSize: 12, fill: chartAxisColor }} stroke={chartAxisColor} />
              <Tooltip formatter={(v, name) => [currency(v), name]} cursor={barCursor} {...tooltipStyle} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="salary" name="Salary" fill="#c4b5fd" radius={[6, 6, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
