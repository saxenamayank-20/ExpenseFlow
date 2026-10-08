import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wallet, Eye, EyeOff, UserPlus, User, UserRound, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import RecoveryCodeBox from "../components/RecoveryCodeBox";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // shown once after sign up, before going to the dashboard
  const [recoveryCode, setRecoveryCode] = useState("");

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await register(form);
      if (data.claimed_legacy_expenses) {
        toast.success(
          `Welcome! ${data.claimed_legacy_expenses} previously recorded expenses were linked to your new account.`,
          { duration: 5000 }
        );
      } else {
        toast.success("Account created!");
      }
      setRecoveryCode(data.recovery_code);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-gradient relative overflow-hidden items-center justify-center p-12">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Wallet className="w-7 h-7" />
            </div>
            <span className="text-2xl font-semibold">ExpenseFlow</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Your own dashboard, your own data.
          </h1>
          <p className="text-white/80 text-lg">
            Every account keeps its expenses private and separate. Sign up in seconds and start
            tracking today.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-800 dark:text-slate-100">ExpenseFlow</span>
          </div>

          {recoveryCode ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Save your recovery code</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                If you ever forget your password, you will need your username and this code to reset it.
              </p>
              <RecoveryCodeBox code={recoveryCode} />
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full mt-6 rounded-xl bg-brand-gradient text-white font-medium py-2.5 shadow-glow hover:opacity-90 active:scale-[0.99] transition"
              >
                I have saved it, continue
              </button>
            </div>
          ) : (
          <>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Create your account</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Takes less than a minute.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full name</label>
              <div className="relative">
                <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={update("full_name")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  placeholder="Jane Doe"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={update("username")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  placeholder="3-20 characters"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={update("password")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-11 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.confirm_password}
                  onChange={update("confirm_password")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-gradient text-white font-medium py-2.5 shadow-glow hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
            >
              <UserPlus className="w-4 h-4" />
              {submitting ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">
              Log in
            </Link>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
