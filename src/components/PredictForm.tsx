"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CITIES,
  NEIGHBORHOODS,
  defaultHouseInput,
  type HouseInput,
  type NumericFeature,
} from "@/lib/ml/features";
import { NUMERIC_FEATURES } from "@/lib/ml/features";
import type { PredictionResult } from "@/lib/types";
import { formatCompactUSD, formatNumber, formatUSD, titleCase } from "@/lib/format";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { ContributionBars } from "@/components/charts";

const PRESETS: { name: string; emoji: string; patch: Partial<HouseInput> }[] = [
  {
    name: "Starter home",
    emoji: "🏡",
    patch: { area: 1050, bedrooms: 2, bathrooms: 1, stories: 1, ageYears: 35, conditionScore: 6, garageSpaces: 0, neighborhood: "rural", lotSize: 4000, distanceKm: 18, yearsSinceRenovation: 12, hasBasement: false },
  },
  {
    name: "Family suburb",
    emoji: "🌳",
    patch: { area: 2200, bedrooms: 4, bathrooms: 2.5, stories: 2, ageYears: 14, conditionScore: 8, garageSpaces: 2, neighborhood: "suburb", lotSize: 8000, distanceKm: 10, yearsSinceRenovation: 3, hasBasement: true },
  },
  {
    name: "Downtown pad",
    emoji: "🌆",
    patch: { area: 1350, bedrooms: 2, bathrooms: 2, stories: 1, ageYears: 6, conditionScore: 9, garageSpaces: 1, neighborhood: "urban", lotSize: 2500, distanceKm: 2, yearsSinceRenovation: 1, hasBasement: false },
  },
  {
    name: "Waterfront villa",
    emoji: "🌊",
    patch: { area: 3800, bedrooms: 5, bathrooms: 4, stories: 2, ageYears: 8, conditionScore: 10, garageSpaces: 3, neighborhood: "waterfront", lotSize: 15000, distanceKm: 6, yearsSinceRenovation: 2, hasBasement: false },
  },
];

function Slider({
  feature,
  value,
  onChange,
}: {
  feature: NumericFeature;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs text-slate-300">
        <span>{feature.label}</span>
        <span className="font-mono text-[13px] text-indigo-300">
          {formatNumber(value, feature.step < 1 ? 1 : 0)}
          {feature.unit ? ` ${feature.unit}` : ""}
        </span>
      </span>
      <input
        type="range"
        min={feature.min}
        max={feature.max}
        step={feature.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-400"
      />
    </label>
  );
}

export default function PredictForm({ initialInput }: { initialInput: HouseInput }) {
  const [input, setInput] = useState<HouseInput>(initialInput);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [preview, setPreview] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((patch: Partial<HouseInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }, []);

  const request = useCallback(async (payload: HouseInput, persist: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, persist }),
      });
      const json = (await response.json()) as
        | { ok: true; result: PredictionResult }
        | { ok: false; errors: string[] };
      if (!json.ok) {
        setError(json.errors[0] ?? "Prediction failed");
        return;
      }
      if (persist) {
        setResult(json.result);
        setSaved(true);
      } else {
        setPreview(json.result);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  // live preview (not persisted) whenever the inputs change
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void request(input, false);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [input, request]);

  const shown = preview ?? result;
  const topContributions = useMemo(
    () =>
      (shown?.contributions ?? [])
        .slice(0, 8)
        .map((c) => ({ label: c.label, value: c.value, display: formatCompactUSD(c.value) })),
    [shown],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <Card>
        <SectionTitle
          title="Describe the house"
          subtitle="Move the sliders — the estimate updates live."
        />

        <div className="mb-5 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => update(preset.patch)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-indigo-400/40 hover:bg-indigo-500/15"
            >
              <span className="mr-1">{preset.emoji}</span>
              {preset.name}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-slate-300">
            City
            <select
              value={input.city}
              onChange={(event) => update({ city: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            >
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate-300">
            Area type
            <select
              value={input.neighborhood}
              onChange={(event) => update({ neighborhood: event.target.value })}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
            >
              {NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {titleCase(n)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {NUMERIC_FEATURES.filter((f) => f.name !== "hasBasement").map((feature) => (
            <Slider
              key={feature.name}
              feature={feature}
              value={Number(input[feature.name as keyof HouseInput])}
              onChange={(value) => update({ [feature.name]: value } as Partial<HouseInput>)}
            />
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={input.hasBasement}
            onChange={(event) => update({ hasBasement: event.target.checked })}
            className="h-4 w-4 accent-indigo-500"
          />
          House has a basement
        </label>

        <button
          type="button"
          onClick={() => void request(input, true)}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? "Estimating…" : "Estimate & save to history"}
        </button>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        {saved && result ? (
          <p className="mt-3 text-xs text-emerald-300">
            Saved estimate #{result.predictedPrice ? "" : ""}
            {result.modelVersion} — see it on the history page.
          </p>
        ) : null}
      </Card>

      <div className="space-y-6">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
                Estimated market value
              </p>
              {shown ? <Badge tone="indigo">{shown.modelVersion}</Badge> : null}
            </div>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-white">
              {shown ? formatUSD(shown.predictedPrice) : "—"}
            </p>
            {shown ? (
              <>
                <p className="mt-1 text-sm text-slate-400">
                  Likely range {formatCompactUSD(shown.lowPrice)} – {formatCompactUSD(shown.highPrice)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">$/sqft</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatUSD(shown.pricePerSqft)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Confidence</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-300">
                      {(shown.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900/60 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">± margin</p>
                    <p className="mt-1 text-sm font-semibold text-amber-300">
                      {formatCompactUSD(shown.residualStd)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Loading model…</p>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle
            title="What drives this price?"
            subtitle="Dollar impact of each feature, measured against an average listing in the dataset."
          />
          {topContributions.length ? (
            <ContributionBars items={topContributions} />
          ) : (
            <p className="text-sm text-slate-400">Waiting for the first estimate…</p>
          )}
        </Card>

        <Card>
          <SectionTitle title="Comparable listings" subtitle="Similar sold homes in the same city." />
          {shown?.comparables.length ? (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Area</th>
                    <th className="px-3 py-2">Beds/Baths</th>
                    <th className="px-3 py-2">Cond.</th>
                    <th className="px-3 py-2 text-right">Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {shown.comparables.map((c) => (
                    <tr key={c.id} className="text-slate-200">
                      <td className="px-3 py-2">{formatNumber(c.area)} sqft</td>
                      <td className="px-3 py-2">
                        {c.bedrooms}/{c.bathrooms}
                      </td>
                      <td className="px-3 py-2">{c.conditionScore}/10</td>
                      <td className="px-3 py-2 text-right font-mono text-indigo-300">
                        {formatCompactUSD(c.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No close comparables found for this city.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
