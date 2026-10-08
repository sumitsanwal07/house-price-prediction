import { ensureModel, listPredictions } from "@/lib/housing";
import { formatCompactUSD } from "@/lib/format";
import { Card, SectionTitle, StatCard } from "@/components/ui";
import HistoryTable from "@/components/HistoryTable";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const model = await ensureModel();
  const rows = await listPredictions(40);

  const avg = rows.length
    ? Math.round(rows.reduce((acc, r) => acc + r.predictedPrice, 0) / rows.length)
    : 0;
  const spread = rows.length
    ? rows.reduce((acc, r) => acc + (r.highPrice - r.lowPrice), 0) / rows.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Prediction history</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Estimates saved from the prediction studio. Use them to compare how changing location,
          size, or condition moves the model&apos;s output.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Saved estimates" value={String(rows.length)} accent="indigo" />
        <StatCard label="Average estimate" value={formatCompactUSD(avg)} accent="sky" />
        <StatCard
          label="Typical range width"
          value={formatCompactUSD(spread)}
          hint={`±${formatCompactUSD(Math.round(spread / 2))} around the estimate`}
          accent="emerald"
        />
      </div>

      <HistoryTable
        initial={rows.map((r) => ({
          ...r,
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
        }))}
      />

      <Card>
        <SectionTitle title="How the numbers are produced" />
        <ol className="list-inside list-decimal space-y-2 text-sm text-slate-300">
          <li>The house is encoded into {model.featureNames.length} numeric features (including one-hot city and area-type columns).</li>
          <li>Each feature is standardised with the training mean and standard deviation.</li>
          <li>The standardised dot product with the stored weights gives the price.</li>
          <li>A 95% interval is added using the test-set residual standard deviation.</li>
        </ol>
      </Card>
    </div>
  );
}
