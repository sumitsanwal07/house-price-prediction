import { ensureModel, getDatasetStats, listPredictions } from "@/lib/housing";
import { defaultHouseInput } from "@/lib/ml/features";
import { formatCompactUSD, formatNumber, formatUSD, titleCase } from "@/lib/format";
import { BarChart } from "@/components/charts";
import { Badge, Card, SectionTitle, StatCard } from "@/components/ui";
import PredictForm from "@/components/PredictForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [model, stats, recent] = await Promise.all([
    ensureModel(),
    getDatasetStats(),
    listPredictions(5),
  ]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage:
              "url('https://images.pexels.com/photos/31406334/pexels-photo-31406334.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />
        <div className="relative px-6 py-10 sm:px-10 sm:py-14">
          <Badge tone="emerald">model online · {model.version}</Badge>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            Estimate any house price in milliseconds
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
            A multiple linear regression ({model.featureNames.length} features) trained with gradient
            descent on {formatNumber(stats.count)} listings. Adjust the inputs and watch each feature
            push the price up or down.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              R² {model.metrics.r2.toFixed(3)} on held-out homes
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Mean error {formatCompactUSD(model.metrics.mae)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              Avg error {model.metrics.mape.toFixed(1)}%
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Listings in dataset"
          value={formatNumber(stats.count)}
          hint={`${stats.byCity.length} cities · ${stats.byNeighborhood.length} area types`}
          accent="indigo"
        />
        <StatCard
          label="Median sale price"
          value={formatCompactUSD(stats.medianPrice)}
          hint={`avg ${formatCompactUSD(stats.avgPrice)}`}
          accent="sky"
        />
        <StatCard
          label="Price range"
          value={`${formatCompactUSD(stats.minPrice)}–${formatCompactUSD(stats.maxPrice)}`}
          hint={`${formatUSD(stats.avgPricePerSqft)} per sqft average`}
          accent="amber"
        />
        <StatCard
          label="Typical living area"
          value={`${formatNumber(stats.avgArea)} sqft`}
          hint={`model error ±${formatCompactUSD(model.metrics.rmse)}`}
          accent="emerald"
        />
      </section>

      <section id="estimator">
        <SectionTitle
          title="Prediction studio"
          subtitle="Every estimate is scored by the live model and logged to PostgreSQL."
        />
        <PredictForm initialInput={defaultHouseInput()} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Average price by city" subtitle="Location is the strongest lever." />
          <BarChart
            data={stats.byCity.map((c) => ({ label: c.city.slice(0, 9), value: c.avgPrice }))}
            valueFormatter={(v) => formatCompactUSD(v)}
          />
        </Card>
        <Card>
          <SectionTitle title="Price distribution" subtitle={`${formatNumber(stats.count)} listings.`} />
          <BarChart
            data={stats.priceBuckets.map((b) => ({ label: b.label.replace("$", ""), value: b.count }))}
            valueFormatter={(v) => `${v}`}
          />
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <SectionTitle title="Area types compared" />
          <ul className="space-y-3">
            {stats.byNeighborhood.map((n) => (
              <li key={n.neighborhood} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">
                  {titleCase(n.neighborhood)}{" "}
                  <span className="text-xs text-slate-500">({n.count} listings)</span>
                </span>
                <span className="font-mono text-indigo-300">{formatCompactUSD(n.avgPrice)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle
            title="Latest estimates"
            action={
              <a href="/history" className="text-xs text-indigo-300 hover:text-indigo-200">
                View all →
              </a>
            }
          />
          {recent.length ? (
            <ul className="divide-y divide-white/5 text-sm">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="text-slate-300">
                    {p.area} sqft · {p.bedrooms} bd · {titleCase(p.neighborhood)} {p.city}
                  </span>
                  <span className="font-mono text-emerald-300">{formatCompactUSD(p.predictedPrice)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              No estimates yet — try the prediction studio above.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
