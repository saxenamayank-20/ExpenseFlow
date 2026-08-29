import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import Calendar from "./Calendar";
import { parseISO, toISO, formatPretty } from "../lib/date";

// Popover-based replacement for a native <input type="date">.
export default function DatePicker({ value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseISO(value) || new Date());
  const ref = useRef(null);

  useEffect(() => {
    if (value) setViewDate(parseISO(value) || new Date());
  }, [value]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const selected = parseISO(value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 rounded-xl border border-slate-200 px-4 py-2.5 text-left text-slate-900 bg-white outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition hover:border-slate-300"
      >
        <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
        <span className={value ? "" : "text-slate-400"}>
          {value ? formatPretty(value) : "Select a date"}
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 bg-white rounded-2xl shadow-card border border-slate-100 p-4">
          <Calendar
            viewDate={viewDate}
            onViewDateChange={setViewDate}
            selected={selected}
            onSelectDay={(d) => {
              onChange(toISO(d));
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
