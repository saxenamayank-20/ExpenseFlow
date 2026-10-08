import { useState } from "react";
import { Copy, Check, ShieldAlert } from "lucide-react";

// shows a recovery code once, the server only keeps the hash
export default function RecoveryCodeBox({ code }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked, they can still select it by hand
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 px-4 py-3">
        <code className="flex-1 text-lg font-bold tracking-widest text-brand-700 dark:text-brand-300 select-all">{code}</code>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 mt-2">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        Save this somewhere safe. It is the only way to reset your password, and it will not be shown again.
      </p>
    </div>
  );
}
