// how much of a salary is used up, goes red once you overspend
export default function SalaryBar({ amount, spent }) {
  const pct = amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0;
  const over = spent > amount;
  return (
    <div>
      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${over ? "bg-red-500" : "bg-brand-gradient"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
        {over ? "Overspent" : `${pct}% used`}
      </p>
    </div>
  );
}
