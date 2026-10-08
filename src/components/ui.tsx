import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "indigo",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "indigo" | "emerald" | "amber" | "sky" | "rose";
}) {
  const accents: Record<string, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/0 text-indigo-300",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300",
    sky: "from-sky-500/20 to-sky-500/0 text-sky-300",
    rose: "from-rose-500/20 to-rose-500/0 text-rose-300",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accents[accent]}`} />
      <div className="relative">
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald" | "indigo" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-500/15 text-slate-300 border-slate-400/20",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
    indigo: "bg-indigo-500/15 text-indigo-300 border-indigo-400/25",
    amber: "bg-amber-500/15 text-amber-300 border-amber-400/25",
    rose: "bg-rose-500/15 text-rose-300 border-rose-400/25",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
