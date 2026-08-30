import { Link, Navigate } from "react-router-dom";
import {
  Wallet,
  PieChart,
  CalendarRange,
  ShieldCheck,
  Search,
  Moon,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  {
    icon: PieChart,
    title: "Visual insights",
    desc: "Category breakdowns, daily trends, and monthly comparisons rendered as clean, interactive charts.",
  },
  {
    icon: CalendarRange,
    title: "Flexible date ranges",
    desc: "Quick presets or a custom calendar range — filter your Overview to exactly the period you care about.",
  },
  {
    icon: Search,
    title: "Searchable history",
    desc: "Sort and search every transaction you've logged, with one-click CSV export.",
  },
  {
    icon: ShieldCheck,
    title: "Private by account",
    desc: "Every account's expenses are isolated — sign up and your data is yours alone.",
  },
];

export default function Landing() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="max-w-6xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">ExpenseFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium rounded-xl bg-brand-gradient text-white px-4 py-2 shadow-glow hover:opacity-90 transition"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 sm:px-8 pt-12 pb-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-xs font-medium px-3 py-1 mb-6">
          <Moon className="w-3 h-3" />
          Now with dark mode
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight max-w-2xl mx-auto mb-5">
          Take control of your money,{" "}
          <span className="bg-brand-gradient bg-clip-text text-transparent">beautifully</span>.
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto mb-8">
          Track every rupee, spot spending trends, and stay on budget — with a dashboard that's
          actually enjoyable to look at.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient text-white font-medium px-6 py-3 shadow-glow hover:opacity-90 active:scale-[0.99] transition"
        >
          Start tracking for free
          <ArrowRight className="w-4 h-4" />
        </Link>

        <div className="relative mt-16 rounded-3xl overflow-hidden shadow-card bg-brand-gradient p-1">
          <div className="rounded-[1.4rem] bg-white dark:bg-slate-900 p-8 sm:p-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div>
              <p className="text-sm text-slate-400">Total Spent</p>
              <p className="text-2xl font-bold text-brand-600">₹24,850</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Transactions</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">142</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Top Category</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">Food</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 sm:px-8 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-card p-6 border border-transparent dark:border-slate-800"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-sm text-slate-400">
        ExpenseFlow — a personal expense tracker.
      </footer>
    </div>
  );
}
