import { ensureModel, getEvaluation } from "@/lib/housing";
import { FEATURE_LABELS } from "@/lib/ml/features";
import { formatCompactUSD, formatDateTime, formatNumber, formatUSD } from "@/lib/format";
import { LossCurve, RankedBars, ScatterPlot } from "@/components/charts";
import { Badge, Card, SectionTitle, StatCard } from "@/components/ui";
import ModelLab from "@/components/ModelLab";

export const dynamic = "force-dynamic";

export default async function ModelPage() {
  const model = await ensureModel();
  const evaluation = await getEvaluation();
  const within10Pct = (evaluation.within10 / Math.max(evaluation.points.length, 1)) * 100;

  const coefficients = model.coefficients
    .slice(0, 12)
    .map((c) => ({
      label: FEATURE_LABELS[c.name] ?? c.name,
      value: c.weight,
      display: formatUSD(c.weight),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Model lab</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Standardised multiple linear regression trained with batch gradient descent and L2
          regularisation. Weights live in the <code className="text-indigo-300">model_state</code>{" "}
          table, so every server restart reuses the trained model instead of relearning it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="R² (test)"
          value={model.metrics.r2.toFixed(3)}
          hint={`${formatNumber(model.metrics.testRows)} held-out homes`}
          accent="indigo"
        />
        <StatCard label="RMSE" value={formatCompactUSD(model.metrics.rmse)} accent="rose" />
        <StatCard label="MAE" value={formatCompactUSD(model.metrics.mae)} accent="amber" />
        <StatCard
          label="Within 10%"
          value={`${within10Pct.toFixed(0)}%`}
          hint={`mean error ${model.metrics.mape.toFixed(1)}%`}
          accent="emerald"
        />
      </div>

      <ModelLab model={model} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Learning curve" subtitle="RMSE per logged epoch." />
          <LossCurve points={model.lossHistory} />
        </Card>
        <Card>
          <SectionTitle
            title="Predicted vs actual"
            subtitle="Held-out test homes; the dashed line is a perfect prediction."
          />
          <ScatterPlot points={evaluation.points} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle
            title="Standardised coefficients"
            subtitle="Dollars added per one standard deviation of the feature."
          />
          <RankedBars items={coefficients} />
        </Card>

        <div className="space-y-6">
          <Card>
            <SectionTitle title="Most surprising misses" subtitle="Largest test-set residuals." />
            <ul className="divide-y divide-white/5 text-sm">
              {evaluation.worst.map((w, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span className="text-slate-300">
                    {w.city} · {formatNumber(w.area)} sqft
                  </span>
                  <span className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-500">{formatCompactUSD(w.actual)}</span>
                    <span
                      className={
                        w.predicted > w.actual ? "text-rose-300" : "text-emerald-300"
                      }
                    >
                      {w.predicted > w.actual ? "+" : ""}
                      {formatCompactUSD(w.predicted - w.actual)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionTitle title="Run details" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Version</dt>
                <dd>{model.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Trained</dt>
                <dd>{formatDateTime(model.trainedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Features</dt>
                <dd>{model.featureNames.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Intercept</dt>
                <dd className="font-mono">{formatUSD(model.bias)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Residual σ</dt>
                <dd className="font-mono">{formatCompactUSD(model.residualStd)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Hyper-params</dt>
                <dd className="font-mono text-xs">
                  lr {model.hyperParams.learningRate} · {model.hyperParams.epochs} epochs · L2{" "}
                  {model.hyperParams.l2}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="indigo">GET /api/model</Badge>
              <Badge tone="emerald">POST /api/predict</Badge>
              <Badge tone="amber">GET /api/stats</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
