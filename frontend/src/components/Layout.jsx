import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Wallet, LayoutDashboard, UserRound, LogOut, Menu, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/account", label: "My Account", icon: UserRound },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out.");
    navigate("/login");
  };

  const displayName = user?.full_name || user?.username || "";
  const initial = displayName.charAt(0).toUpperCase();

  const activeLabel = navItems.find((n) => location.pathname.startsWith(n.to))?.label || "";

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-slate-200 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-slate-800">ExpenseFlow</span>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-brand-gradient text-white flex items-center justify-center text-sm font-semibold shrink-0">
            {initial || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">@{user?.username}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full mt-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed inset-x-0 top-0 h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 z-30">
        <button onClick={() => setMobileOpen(true)} className="text-slate-500 hover:text-slate-800">
          <Menu className="w-6 h-6" />
        </button>
        <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-slate-800">{activeLabel || "ExpenseFlow"}</span>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar: fixed on desktop, slide-in drawer on mobile */}
      <aside
        className={`w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
