"use client";

import { useCallback, useEffect, useState } from "react";
import { CITIES, NEIGHBORHOODS } from "@/lib/ml/features";
import type { HouseListItem } from "@/lib/types";
import { formatCompactUSD, formatNumber, titleCase } from "@/lib/format";
import { Badge, Card } from "@/components/ui";

type ApiResponse = {
  ok: boolean;
  rows: HouseListItem[];
  total: number;
  avgPrice: number;
  page: number;
  pages: number;
};

const HEADERS = [
  "City",
  "Type",
  "Area",
  "Beds",
  "Baths",
  "Stories",
  "Age",
  "Lot",
  "Garage",
  "Condition",
  "Dist.",
  "Renovated",
  "Price",
];

export default function DatasetExplorer({ initial }: { initial: ApiResponse }) {
  const [data, setData] = useState<ApiResponse>(initial);
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "15" });
    if (city) params.set("city", city);
    if (neighborhood) params.set("neighborhood", neighborhood);
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (maxPrice) params.set("maxPrice", maxPrice);
    try {
      const response = await fetch(`/api/houses?${params.toString()}`);
      const json = (await response.json()) as ApiResponse;
      if (json.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [city, neighborhood, bedrooms, maxPrice, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setCity("");
    setNeighborhood("");
    setBedrooms("");
    setMaxPrice("");
    setPage(1);
  };

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-300">
          City
          <select
            value={city}
            onChange={(e) => {
              setPage(1);
              setCity(e.target.value);
            }}
            className="mt-1 block w-36 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1.5 text-sm text-white"
          >
            <option value="">All</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Area type
          <select
            value={neighborhood}
            onChange={(e) => {
              setPage(1);
              setNeighborhood(e.target.value);
            }}
            className="mt-1 block w-36 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1.5 text-sm text-white"
          >
            <option value="">All</option>
            {NEIGHBORHOODS.map((n) => (
              <option key={n} value={n}>
                {titleCase(n)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Bedrooms
          <select
            value={bedrooms}
            onChange={(e) => {
              setPage(1);
              setBedrooms(e.target.value);
            }}
            className="mt-1 block w-24 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1.5 text-sm text-white"
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5, 6].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-300">
          Max price
          <input
            value={maxPrice}
            inputMode="numeric"
            placeholder="e.g. 600000"
            onChange={(e) => {
              setPage(1);
              setMaxPrice(e.target.value.replace(/[^0-9]/g, ""));
            }}
            className="mt-1 block w-32 rounded-lg border border-white/10 bg-slate-900/70 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
        >
          Reset
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          {loading ? <Badge tone="amber">loading…</Badge> : null}
          <span>
            {formatNumber(data.total)} matches · avg {formatCompactUSD(data.avgPrice)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              {HEADERS.map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-slate-200">
            {data.rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.03]">
                <td className="whitespace-nowrap px-3 py-2 font-sans">{row.city}</td>
                <td className="whitespace-nowrap px-3 py-2 font-sans text-slate-400">
                  {titleCase(row.neighborhood)}
                </td>
                <td className="px-3 py-2">{formatNumber(row.area)}</td>
                <td className="px-3 py-2">{row.bedrooms}</td>
                <td className="px-3 py-2">{row.bathrooms}</td>
                <td className="px-3 py-2">{row.stories}</td>
                <td className="px-3 py-2">{row.ageYears}</td>
                <td className="px-3 py-2">{formatNumber(row.lotSize)}</td>
                <td className="px-3 py-2">{row.garageSpaces}</td>
                <td className="px-3 py-2">{row.conditionScore}</td>
                <td className="px-3 py-2">{row.distanceKm}km</td>
                <td className="px-3 py-2">{row.yearsSinceRenovation}y</td>
                <td className="whitespace-nowrap px-3 py-2 text-indigo-300">
                  {formatCompactUSD(row.price)}
                </td>
              </tr>
            ))}
            {!data.rows.length ? (
              <tr>
                <td colSpan={HEADERS.length} className="px-3 py-6 text-center font-sans text-slate-400">
                  No listings match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          disabled={data.page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40"
        >
          ← Prev
        </button>
        <span>
          Page {data.page} of {data.pages}
        </span>
        <button
          type="button"
          disabled={data.page >= data.pages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </Card>
  );
}
