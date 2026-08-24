const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const message = data?.detail || "Something went wrong. Please try again.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }
  return data;
}

export const api = {
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/api/auth/me", { token }),
  changePassword: (payload, token) =>
    request("/api/auth/password", { method: "PUT", body: payload, token }),
  meta: () => request("/api/meta"),
  listExpenses: (token) => request("/api/expenses", { token }),
  addExpense: (payload, token) => request("/api/expenses", { method: "POST", body: payload, token }),
  updateExpense: (id, payload, token) =>
    request(`/api/expenses/${id}`, { method: "PUT", body: payload, token }),
  deleteExpense: (id, token) => request(`/api/expenses/${id}`, { method: "DELETE", token }),
  accountStats: (token) => request("/api/account/stats", { token }),
};
