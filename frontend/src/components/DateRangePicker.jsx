import { useEffect, useRef, useState } from "react";
import { CalendarRange } from "lucide-react";
import Calendar from "./Calendar";
import {
  parseISO,
  toISO,
  formatShort,
  addDays,
  startOfWeek,
  startOfMonth,
  startOfYear,
} from "../lib/date";

export default function DateRangePicker({ startDate, endDate, onChange, minDate, maxDate, className = "" }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseISO(endDate) || new Date());
  const [pendingStart, setPendingStart] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    setPendingStart(null);
    setViewDate(parseISO(endDate) || new Date());
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, endDate]);

  const rangeStart = parseISO(startDate);
  const rangeEnd = parseISO(endDate);

  const applyRange = (a, b) => {
    onChange(toISO(a), toISO(b));
    setOpen(false);
  };

  const presets = [
    { label: "Today", get: () => { const t = new Date(); return [t, t]; } },
    { label: "This week", get: () => { const t = new Date(); return [startOfWeek(t), t]; } },
    { label: "Last 30 days", get: () => { const t = new Date(); return [addDays(t, -29), t]; } },
    { label: "This month", get: () => { const t = new Date(); return [startOfMonth(t), t]; } },
    { label: "This year", get: () => { const t = new Date(); return [startOfYear(t), t]; } },
    {
      label: "All time",
      get: () => [parseISO(minDate) || new Date(), parseISO(maxDate) || new Date()],
      disabled: !minDate || !maxDate,
    },
  ];

  const handleSelectDay = (d) => {
    if (!pendingStart) {
      setPendingStart(d);
      return;
    }
    if (d.getTime() < pendingStart.getTime()) {
      applyRange(d, pendingStart);
    } else {
      applyRange(pendingStart, d);
    }
    setPendingStart(null);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:border-slate-300 transition"
      >
        <CalendarRange className="w-4 h-4 text-brand-500 shrink-0" />
        <span className="font-medium">
          {rangeStart && rangeEnd ? `${formatShort(rangeStart)} – ${formatShort(rangeEnd)}` : "Select date range"}
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 bg-white rounded-2xl shadow-card border border-slate-100 flex overflow-hidden">
          <div className="w-40 border-r border-slate-100 p-2 flex flex-col gap-0.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={p.disabled}
                onClick={() => applyRange(...p.get())}
                className="text-left px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition disabled:opacity-40 disabled:pointer-events-none"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-4">
            <p className="text-xs text-slate-400 mb-2 h-4">
              {pendingStart ? `Pick an end date (start: ${formatShort(pendingStart)})` : "Pick a start date"}
            </p>
            <Calendar
              viewDate={viewDate}
              onViewDateChange={setViewDate}
              rangeStart={pendingStart || rangeStart}
              rangeEnd={pendingStart ? null : rangeEnd}
              onSelectDay={handleSelectDay}
            />
          </div>
        </div>
      )}
    </div>
  );
}
