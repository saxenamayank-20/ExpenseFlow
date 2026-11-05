// salaries come from the api newest first, so the first one that started
// on or before the date is the one that date belongs to.
// 'other' amounts (savings, bonus...) never cover a date, you pick them by hand
export function salaryForDate(salaries, date) {
  return salaries.find((s) => s.kind !== "other" && s.received_date <= date) || null;
}

export function inSalary(salary, date) {
  return date >= salary.received_date && (!salary.end_date || date <= salary.end_date);
}

// where an expense's money came from: the amount it was paid from, or the salary for its date
export function paidFrom(salaries, expense) {
  if (expense.source_id) return salaries.find((s) => s.id === expense.source_id) || null;
  return salaryForDate(salaries, expense.expense_date);
}

export function belongsTo(salary, expense) {
  if (salary.kind === "other") return expense.source_id === salary.id;
  return !expense.source_id && inSalary(salary, expense.expense_date);
}

export function runningOthers(salaries) {
  return salaries.filter((s) => s.kind === "other" && !s.finished);
}
