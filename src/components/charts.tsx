type Point = { x: number; y: number };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (max === min) return [min];
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? magnitude * 10;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(v);
  return ticks;
}

/** Line chart used for the training / validation loss curves. */
export function LossCurve({
  points,
  height = 200,
}: {
  points: { epoch: number; train: number; test: number }[];
  height?: number;
}) {
  const width = 560;
  const pad = { left: 58, right: 14, top: 14, bottom: 32 };
  if (points.length < 2) {
    return <p className="text-sm text-slate-400">Not enough training history.</p>;
  }
  const xs = points.map((p) => p.epoch);
  const ys = points.flatMap((p) => [p.train, p.test]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = 0;
  const yMax = Math.max(...ys) * 1.05;

  const sx = (v: number) =>
    pad.left + ((v - xMin) / Math.max(xMax - xMin, 1)) * (width - pad.left - pad.right);
  const sy = (v: number) =>
    height - pad.bottom - (v / Math.max(yMax, 1)) * (height - pad.top - pad.bottom);

  const path = (key: "train" | "test") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.epoch).toFixed(1)},${sy(p[key]).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full">
      {niceTicks(yMin, yMax, 4).map((t) => (
        <g key={t}>
          <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} stroke="rgba(148,163,184,0.15)" />
          <text x={pad.left - 8} y={sy(t) + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
            {Math.round(t / 1000)}k
          </text>
        </g>
      ))}
      {niceTicks(xMin, xMax, 4).map((t) => (
        <text key={t} x={sx(t)} y={height - 10} textAnchor="middle" className="fill-slate-500 text-[10px]">
          {t}
        </text>
      ))}
      <path d={path("train")} fill="none" stroke="#818cf8" strokeWidth={2} />
      <path d={path("test")} fill="none" stroke="#34d399" strokeWidth={2} strokeDasharray="5 4" />
      <text x={width - pad.right} y={pad.top + 4} textAnchor="end" className="fill-indigo-300 text-[10px]">
        train RMSE
      </text>
      <text x={width - pad.right} y={pad.top + 18} textAnchor="end" className="fill-emerald-300 text-[10px]">
        test RMSE
      </text>
      <text x={pad.left} y={height - 10} className="fill-slate-500 text-[10px]">
        epoch
      </text>
    </svg>
  );
}

/** Actual vs predicted scatter with a perfect-prediction diagonal. */
export function ScatterPlot({
  points,
  height = 300,
}: {
  points: Point[];
  height?: number;
}) {
  const width = 560;
  const pad = { left: 62, right: 16, top: 16, bottom: 38 };
  if (!points.length) return <p className="text-sm text-slate-400">No evaluation points.</p>;

  const maxVal = Math.max(...points.flatMap((p) => [p.x, p.y])) * 1.05;
  const sx = (v: number) => pad.left + (v / maxVal) * (width - pad.left - pad.right);
  const sy = (v: number) => height - pad.bottom - (v / maxVal) * (height - pad.top - pad.bottom);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {niceTicks(0, maxVal, 4).map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={pad.top} y2={height - pad.bottom} stroke="rgba(148,163,184,0.12)" />
          <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} stroke="rgba(148,163,184,0.12)" />
          <text x={pad.left - 8} y={sy(t) + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
            {Math.round(t / 1000)}k
          </text>
          <text x={sx(t)} y={height - 14} textAnchor="middle" className="fill-slate-500 text-[10px]">
            {Math.round(t / 1000)}k
          </text>
        </g>
      ))}
      <line
        x1={sx(0)}
        y1={sy(0)}
        x2={sx(maxVal)}
        y2={sy(maxVal)}
        stroke="rgba(129,140,248,0.7)"
        strokeDasharray="6 5"
      />
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.2} fill="#38bdf8" fillOpacity={0.75} />
      ))}
      <text x={width / 2} y={height - 2} textAnchor="middle" className="fill-slate-400 text-[10px]">
        actual price →
      </text>
      <text
        x={12}
        y={height / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${height / 2})`}
        className="fill-slate-400 text-[10px]"
      >
        predicted price →
      </text>
    </svg>
  );
}

/** Vertical bar chart (price distribution / averages). */
export function BarChart({
  data,
  height = 200,
  valueFormatter,
}: {
  data: { label: string; value: number }[];
  height?: number;
  valueFormatter?: (value: number) => string;
}) {
  const width = 560;
  const pad = { left: 8, right: 8, top: 18, bottom: 30 };
  if (!data.length) return <p className="text-sm text-slate-400">No data.</p>;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const slot = (width - pad.left - pad.right) / data.length;
  const barWidth = Math.min(46, slot * 0.66);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barHeight = ((height - pad.top - pad.bottom) * d.value) / max;
        const x = pad.left + i * slot + (slot - barWidth) / 2;
        const y = height - pad.bottom - barHeight;
        return (
          <g key={`${d.label}-${i}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={5} fill="url(#barFill)" />
            <text
              x={x + barWidth / 2}
              y={y - 5}
              textAnchor="middle"
              className="fill-slate-300 text-[9px]"
            >
              {valueFormatter ? valueFormatter(d.value) : d.value}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-500 text-[9px]"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Diverging horizontal bars: how each feature pushed the price up/down. */
export function ContributionBars({
  items,
}: {
  items: { label: string; value: number; display: string }[];
}) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => Math.abs(i.value))) || 1;
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const pct = (Math.abs(item.value) / max) * 50;
        const positive = item.value >= 0;
        return (
          <li key={item.label} className="text-xs">
            <div className="mb-1 flex justify-between text-slate-300">
              <span className="truncate pr-2">{item.label}</span>
              <span className={positive ? "text-emerald-300" : "text-rose-300"}>{item.display}</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-slate-700/50">
              <div className="absolute left-1/2 top-0 h-full w-px bg-slate-500/60" />
              <div
                className={`absolute top-0 h-full rounded-full ${positive ? "bg-emerald-400/80" : "bg-rose-400/80"}`}
                style={
                  positive
                    ? { left: "50%", width: `${pct}%` }
                    : { right: "50%", width: `${pct}%` }
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Horizontal ranked bars, e.g. standardised model coefficients. */
export function RankedBars({
  items,
}: {
  items: { label: string; value: number; display?: string }[];
}) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => Math.abs(i.value))) || 1;
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const pct = (Math.abs(item.value) / max) * 100;
        const positive = item.value >= 0;
        return (
          <li key={item.label} className="text-xs">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-slate-300">{item.label}</span>
              <span className={positive ? "text-emerald-300" : "text-rose-300"}>
                {item.display ?? item.value.toFixed(2)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/40">
              <div
                className={`h-full rounded-full ${positive ? "bg-gradient-to-r from-indigo-500 to-emerald-400" : "bg-gradient-to-r from-rose-500 to-amber-400"}`}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
