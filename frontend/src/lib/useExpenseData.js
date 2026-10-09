import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

// dashboard, analytics and history all need the same three things
export function useExpenseData() {
  const { token } = useAuth();
  const [meta, setMeta] = useState({ categories: [], payment_methods: [] });
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);

  // salary totals change whenever an expense does, so reload both
  const reload = async () => {
    const [e, s] = await Promise.all([api.listExpenses(token), api.listSalaries(token)]);
    setExpenses(e);
    setSalaries(s);
  };

  useEffect(() => {
    (async () => {
      try {
        const [m] = await Promise.all([api.meta(), reload()]);
        setMeta(m);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { meta, expenses, salaries, loading, reload };
}

// date range for the picker, starts as first..last expense once data is in
export function useDateRange(expenses) {
  const [range, setRange] = useState({ start: "", end: "" });

  const [minDate, maxDate] = useMemo(() => {
    if (!expenses.length) return [null, null];
    const dates = expenses.map((e) => e.expense_date).sort();
    return [dates[0], dates[dates.length - 1]];
  }, [expenses]);

  const start = range.start || minDate || "";
  const end = range.end || maxDate || "";

  const filtered = useMemo(
    () => expenses.filter((e) => (!start || e.expense_date >= start) && (!end || e.expense_date <= end)),
    [expenses, start, end]
  );

  return { start, end, setRange: (s, e) => setRange({ start: s, end: e }), minDate, maxDate, filtered };
}

export function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
