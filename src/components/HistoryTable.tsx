"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PredictionListItem } from "@/lib/types";
import { formatCompactUSD, formatDateTime, titleCase } from "@/lib/format";
import { Badge, Card } from "@/components/ui";

export default function HistoryTable({ initial }: { initial: PredictionListItem[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<number | "all" | null>(null);

  const remove = async (id: number | "all") => {
    setBusy(id);
    try {
      const url = id === "all" ? "/api/predictions" : `/api/predictions?id=${id}`;
      await fetch(url, { method: "DELETE" });
      setRows((prev) => (id === "all" ? [] : prev.filter((r) => r.id !== id)));
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Saved estimates</h2>
          <p className="mt-1 text-sm text-slate-400">
            {rows.length} estimate{rows.length === 1 ? "" : "s"} stored in PostgreSQL.
          </p>
        </div>
        {rows.length ? (
          <button
            type="button"
            onClick={() => void remove("all")}
            disabled={busy === "all"}
            className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-50"
          >
            {busy === "all" ? "Clearing…" : "Clear all"}
          </button>
        ) : null}
      </div>

      {rows.length ? (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Area</th>
                <th className="px-3 py-2">Bd/Ba</th>
                <th className="px-3 py-2">Age</th>
                <th className="px-3 py-2">Cond.</th>
                <th className="px-3 py-2 text-right">Estimate</th>
                <th className="px-3 py-2 text-right">Range</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row) => (
                <tr key={row.id} className="text-slate-200 hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{row.city}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-400">
                    {titleCase(row.neighborhood)}
                  </td>
                  <td className="px-3 py-2 font-mono">{row.area}</td>
                  <td className="px-3 py-2 font-mono">
                    {row.bedrooms}/{row.bathrooms}
                  </td>
                  <td className="px-3 py-2 font-mono">{row.ageYears}y</td>
                  <td className="px-3 py-2 font-mono">{row.conditionScore}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-indigo-300">
                    {formatCompactUSD(row.predictedPrice)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-slate-400">
                    {formatCompactUSD(row.lowPrice)}–{formatCompactUSD(row.highPrice)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => void remove(row.id)}
                      disabled={busy === row.id}
                      className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10 disabled:opacity-40"
                    >
                      {busy === row.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
          Nothing here yet.{" "}
          <a href="/" className="text-indigo-300 hover:text-indigo-200">
            Run an estimate →
          </a>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="slate">DELETE /api/predictions?id=</Badge>
        <Badge tone="slate">DELETE /api/predictions</Badge>
      </div>
    </Card>
  );
}
