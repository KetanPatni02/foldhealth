/** Series colour by position in a widget's config, from the ordered chart palette. */
export const seriesColor = (i) => `var(--chart-${(i % 12) + 1})`;

export function formatValue(v, format) {
  if (v == null || Number.isNaN(v)) return '–';
  if (format === 'currency') return `$ ${Math.round(v).toLocaleString()}`;
  if (format === 'percent') return `${v}%`;
  if (format === 'minutes') return `${v} min`;
  return Number(v).toLocaleString();
}

/** Short axis tick text: "$ 2.5K", "750", "40" (percent axes drop the %). */
export const compactTick = (format) => (v) => {
  if (format === 'currency') return v >= 1000 ? `$ ${(v / 1000).toFixed(v % 1000 ? 1 : 0)}K` : `$ ${v}`;
  if (format === 'percent') return `${v}`;
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}K` : String(v);
};

const TICK_COUNT = 5;

/** 0 … a round top value, in TICK_COUNT steps, covering `max`. */
export function niceTicks(max) {
  if (!(max > 0)) return [0, 1];
  const rough = max / (TICK_COUNT - 1);
  const mag = 10 ** Math.floor(Math.log10(rough));
  const n = rough / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}
