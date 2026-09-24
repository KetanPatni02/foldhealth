/** Series colour by position in a widget's config, from the ordered chart palette. */
export const seriesColor = (i) => `var(--chart-${(i % 12) + 1})`;

export function formatValue(v, format) {
  if (v == null || Number.isNaN(v)) return '–';
  if (format === 'currency') return `$ ${Math.round(v).toLocaleString()}`;
  if (format === 'percent') return `${v}%`;
  if (format === 'minutes') return `${v} min`;
  return Number(v).toLocaleString();
}
