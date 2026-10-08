// salaries come from the api newest first, so the first one that started
// on or before the date is the one that date belongs to
export function salaryForDate(salaries, date) {
  return salaries.find((s) => s.received_date <= date) || null;
}

export function inSalary(salary, date) {
  return date >= salary.received_date && (!salary.end_date || date <= salary.end_date);
}
