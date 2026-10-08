import { getDatasetStats, listHouses } from "@/lib/housing";
import { formatCompactUSD, formatNumber } from "@/lib/format";
import { BarChart } from "@/components/charts";
import { Card, SectionTitle, StatCard } from "@/components/ui";
import DatasetExplorer from "@/components/DatasetExplorer";

export const dynamic = "force-dynamic";

export default async function DatasetPage() {
  const [listing, stats] = await Promise.all([
    listHouses({ page: 1, pageSize: 15 }),
    getDatasetStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Training dataset</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          {formatNumber(stats.count)} synthetic but realistic listings generated from a known pricing
          process (location premium, size, age, condition, distance to downtown) plus market noise.
          Because the ground truth is known, the model&apos;s error is an honest measurement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rows" value={formatNumber(stats.count)} accent="indigo" />
        <StatCard label="Avg price" value={formatCompactUSD(stats.avgPrice)} accent="sky" />
        <StatCard
          label="Cheapest"
          value={formatCompactUSD(stats.minPrice)}
          hint={`most expensive ${formatCompactUSD(stats.maxPrice)}`}
          accent="emerald"
        />
        <StatCard label="Avg lot size" value={`${formatNumber(stats.avgArea)} sqft living`} accent="amber" />
      </div>

      <DatasetExplorer
        initial={{
          ok: true,
          rows: listing.rows.map((r) => ({
            id: r.id,
            city: r.city,
            neighborhood: r.neighborhood,
            area: r.area,
            bedrooms: r.bedrooms,
            bathrooms: r.bathrooms,
            stories: r.stories,
            ageYears: r.ageYears,
            lotSize: r.lotSize,
            garageSpaces: r.garageSpaces,
            conditionScore: r.conditionScore,
            distanceKm: r.distanceKm,
            hasBasement: r.hasBasement,
            yearsSinceRenovation: r.yearsSinceRenovation,
            price: r.price,
          })),
          total: listing.total,
          avgPrice: listing.avgPrice,
          page: listing.page,
          pages: listing.pages,
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Listings per city" />
          <BarChart
            data={stats.byCity.map((c) => ({ label: c.city.slice(0, 9), value: c.count }))}
          />
        </Card>
        <Card>
          <SectionTitle title="Average price by area type" />
          <BarChart
            data={stats.byNeighborhood.map((n) => ({
              label: n.neighborhood.slice(0, 9),
              value: n.avgPrice,
            }))}
            valueFormatter={(v) => formatCompactUSD(v)}
          />
        </Card>
      </div>
    </div>
  );
}
