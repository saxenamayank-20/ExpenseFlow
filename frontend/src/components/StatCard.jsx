export default function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accent?.bg || "#f5f3ff" }}
      >
        <Icon className="w-6 h-6" style={{ color: accent?.fg || "#7c3aed" }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 leading-tight">{label}</p>
        <p className="text-xl font-bold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}
