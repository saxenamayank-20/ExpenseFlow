import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_NAMES, WEEKDAY_LABELS, getMonthGrid, isSameDay } from "../lib/date";

// Shared month-grid renderer used by both the single-date and
// range date pickers. Selection semantics are left to the caller:
// pass either `selected` (single mode) or `rangeStart`/`rangeEnd`.
export default function Calendar({
  viewDate,
  onViewDateChange,
  selected,
  rangeStart,
  rangeEnd,
  onSelectDay,
  today = new Date(),
}) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const grid = getMonthGrid(year, month);

  const inRange = (d) =>
    rangeStart && rangeEnd && d.getTime() > rangeStart.getTime() && d.getTime() < rangeEnd.getTime();

  return (
    <div className="w-[264px] select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onViewDateChange(new Date(year, month - 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-800">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => onViewDateChange(new Date(year, month + 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center text-[11px] font-medium text-slate-400 h-7 flex items-center justify-center">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {grid.map((d, i) => {
          const outside = d.getMonth() !== month;
          const isToday = isSameDay(d, today);
          const isSelected = selected && isSameDay(d, selected);
          const isRangeEdge = (rangeStart && isSameDay(d, rangeStart)) || (rangeEnd && isSameDay(d, rangeEnd));
          const isInRange = inRange(d);

          return (
            <div key={i} className="flex items-center justify-center h-8">
              <button
                type="button"
                onClick={() => onSelectDay(d)}
                className={[
                  "w-8 h-8 rounded-lg text-sm flex items-center justify-center transition",
                  outside ? "text-slate-300" : "text-slate-700",
                  isInRange && !isRangeEdge ? "bg-brand-100 text-brand-700 rounded-none" : "",
                  isRangeEdge ? "bg-brand-gradient text-white font-semibold shadow-glow" : "",
                  isSelected && !isRangeEdge ? "bg-brand-gradient text-white font-semibold shadow-glow" : "",
                  !isSelected && !isRangeEdge && !isInRange ? "hover:bg-slate-100" : "",
                  isToday && !isSelected && !isRangeEdge ? "ring-1 ring-inset ring-brand-400" : "",
                ].join(" ")}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
