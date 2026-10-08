"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ModelSummary } from "@/lib/types";
import { formatCompactUSD } from "@/lib/format";
import { Badge, Card, SectionTitle } from "@/components/ui";

export default function ModelLab({ model }: { model: ModelSummary }) {
  const router = useRouter();
  const [epochs, setEpochs] = useState(model.hyperParams.epochs);
  const [learningRate, setLearningRate] = useState(model.hyperParams.learningRate);
  const [l2, setL2] = useState(model.hyperParams.l2);
  const [training, setTraining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [next, setNext] = useState<ModelSummary | null>(null);

  const retrain = async () => {
    setTraining(true);
    setMessage(null);
    try {
      const response = await fetch("/api/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epochs, learningRate, l2 }),
      });
      const json = (await response.json()) as { ok: boolean; model?: ModelSummary };
      if (json.ok && json.model) {
        setNext(json.model);
        setMessage(
          `Retrained ${json.model.version} — R² ${json.model.metrics.r2.toFixed(3)}, MAE ${formatCompactUSD(json.model.metrics.mae)}`,
        );
        router.refresh();
      } else {
        setMessage("Training failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setTraining(false);
    }
  };

  const active = next ?? model;

  return (
    <Card>
      <SectionTitle
        title="Retrain the model"
        subtitle="Gradient descent runs in the Node.js server and the weights are stored in PostgreSQL."
        action={training ? <Badge tone="amber">training…</Badge> : <Badge tone="indigo">idle</Badge>}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="text-xs text-slate-300">
          <span className="flex justify-between">
            <span>Epochs</span>
            <span className="font-mono text-indigo-300">{epochs}</span>
          </span>
          <input
            type="range"
            min={200}
            max={8000}
            step={100}
            value={epochs}
            onChange={(e) => setEpochs(Number(e.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-400"
          />
        </label>
        <label className="text-xs text-slate-300">
          <span className="flex justify-between">
            <span>Learning rate</span>
            <span className="font-mono text-indigo-300">{learningRate.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.02}
            max={1}
            step={0.02}
            value={learningRate}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-400"
          />
        </label>
        <label className="text-xs text-slate-300">
          <span className="flex justify-between">
            <span>L2 penalty</span>
            <span className="font-mono text-indigo-300">{l2.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={l2}
            onChange={(e) => setL2(Number(e.target.value))}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-indigo-400"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void retrain()}
          disabled={training}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:brightness-110 disabled:opacity-60"
        >
          {training ? "Training…" : "Train new model"}
        </button>
        <p className="text-xs text-slate-400">
          Current: {active.version} · {active.metrics.trainRows} train / {active.metrics.testRows} test rows
        </p>
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${message.startsWith("Retrained") ? "text-emerald-300" : "text-amber-300"}`}>
          {message}
        </p>
      ) : null}
    </Card>
  );
}
