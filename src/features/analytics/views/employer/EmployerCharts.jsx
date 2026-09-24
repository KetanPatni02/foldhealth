/**
 * Employer Impact Report: chart renderers. Recharts via LazyRecharts, the
 * same library as the rest of Analytics.
 *
 * Series colours come from the design system's ordered chart palette
 * (--chart-1 … --chart-5, the colours in the Figma), assigned by series
 * position in a widget's config so a colour always means the same series.
 * Those colours are soft, so identity never rides on colour alone: every
 * multi-series chart has a legend, stacked segments are split by a 2px
 * surface gap, and every mark has a tooltip.
 */
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, ComposedChart, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from '../../../../components/LazyRecharts/LazyRecharts';
import { seriesColor, formatValue } from './employerImpactFormat';
import styles from './EmployerImpactView.module.css';

const LINE_COLOR = 'var(--neutral-300)';

const AXIS_TICK = { fontSize: 'var(--font-sm)', fill: 'var(--neutral-300)' };
const GRID = { stroke: 'var(--neutral-100)' };

const compactTick = (format) => (v) => {
  if (format === 'currency') return v >= 1000 ? `$ ${(v / 1000).toFixed(v % 1000 ? 1 : 0)}K` : `$ ${v}`;
  if (format === 'percent') return `${v}`;
  return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}K` : String(v);
};

// ── Tooltip (matches Analytics' FoldTooltip) ──
function ImpactTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color }} />
          <span className={styles.tooltipName}>{p.name}</span>
          <span className={styles.tooltipValue}>{formatValue(p.value, format)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Legend: toggles a series; hidden ones keep their colour for when they return ──
export function ChartLegend({ series, hidden, onToggle, line }) {
  if (series.length < 2 && !line) return null;
  return (
    <div className={styles.legend}>
      {series.map((s, i) => {
        const off = hidden.has(s.key);
        return (
          <button
            key={s.key}
            type="button"
            className={[styles.legendItem, off ? styles.legendOff : ''].filter(Boolean).join(' ')}
            aria-pressed={!off}
            onClick={() => onToggle(s.key)}
          >
            <span className={styles.legendDot} style={{ background: seriesColor(i) }} />
            {s.label}
          </button>
        );
      })}
      {line && (
        <button
          type="button"
          className={[styles.legendItem, hidden.has(line.key) ? styles.legendOff : ''].filter(Boolean).join(' ')}
          aria-pressed={!hidden.has(line.key)}
          onClick={() => onToggle(line.key)}
        >
          <span className={styles.legendLine} />
          {line.label}
        </button>
      )}
    </div>
  );
}

const yAxisLabel = (value) => (value
  ? { value, angle: -90, position: 'insideLeft', offset: 10, style: { ...AXIS_TICK, textAnchor: 'middle' } }
  : undefined);
const xAxisLabel = (value) => (value
  ? { value, position: 'insideBottom', offset: -4, style: AXIS_TICK }
  : undefined);

/**
 * Vertical bars, stacked when there is more than one series. An optional
 * `line` (e.g. an average) draws on the same axis: never a second scale.
 */
export function StackedBars({ data, series, line, hidden, yLabel, xLabel, format, height = 260, denseX = false }) {
  const visible = series.map((s, i) => ({ ...s, i })).filter(s => !hidden.has(s.key));
  const topKey = visible[visible.length - 1]?.key;
  const Chart = line ? ComposedChart : BarChart;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 8, right: 8, bottom: denseX ? 28 : 16, left: 8 }} barCategoryGap="28%">
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis
          dataKey="x"
          tick={denseX ? { ...AXIS_TICK, angle: -60, textAnchor: 'end' } : AXIS_TICK}
          interval={0}
          height={denseX ? 48 : 30}
          tickLine={false}
          axisLine={{ stroke: 'var(--neutral-150)' }}
          label={xAxisLabel(xLabel)}
        />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={compactTick(format)} width={56} label={yAxisLabel(yLabel)} />
        <Tooltip content={<ImpactTooltip format={format} />} cursor={{ fill: 'var(--neutral-50)' }} />
        {visible.map(s => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            fill={seriesColor(s.i)}
            // A 2px surface gap between stacked segments keeps adjacent
            // series apart even where their colours are close.
            stroke="var(--neutral-0)"
            strokeWidth={visible.length > 1 ? 2 : 0}
            radius={s.key === topKey ? [4, 4, 0, 0] : 0}
            maxBarSize={36}
            isAnimationActive={false}
          />
        ))}
        {line && !hidden.has(line.key) && (
          <Line
            type="linear"
            dataKey={line.key}
            name={line.label}
            stroke={LINE_COLOR}
            strokeWidth={2}
            dot={{ r: 4, fill: LINE_COLOR, stroke: 'var(--neutral-0)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

export function Lines({ data, series, hidden, yLabel, xLabel, format, height = 260 }) {
  const visible = series.map((s, i) => ({ ...s, i })).filter(s => !hidden.has(s.key));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="x" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: 'var(--neutral-150)' }} label={xAxisLabel(xLabel)} padding={{ left: 16, right: 16 }} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={compactTick(format)} width={64} label={yAxisLabel(yLabel)} />
        <Tooltip content={<ImpactTooltip format={format} />} cursor={{ stroke: 'var(--neutral-150)' }} />
        {visible.map(s => (
          <Line
            key={s.key}
            type="linear"
            dataKey={s.key}
            name={s.label}
            stroke={seriesColor(s.i)}
            strokeWidth={2}
            dot={{ r: 4, fill: seriesColor(s.i), stroke: 'var(--neutral-0)', strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Horizontal bars for ranked or labelled categories. */
export function HBars({ data, seriesKey, seriesLabel, yLabel, xLabel, format, height }) {
  const h = height || Math.max(160, data.length * 36 + 60);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 16, left: 8 }} barCategoryGap="30%">
        <CartesianGrid {...GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={compactTick(format)} label={xAxisLabel(xLabel)} />
        <YAxis
          type="category"
          dataKey="x"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={130}
          label={yAxisLabel(yLabel)}
        />
        <Tooltip content={<ImpactTooltip format={format} />} cursor={{ fill: 'var(--neutral-50)' }} />
        <Bar dataKey={seriesKey} name={seriesLabel} fill={seriesColor(0)} radius={[0, 4, 4, 0]} maxBarSize={16} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** A donut with its values listed beside it, as in the design. */
export function Donut({ data, seriesKey, height = 240 }) {
  const total = data.reduce((a, r) => a + (r[seriesKey] || 0), 0);
  return (
    <div className={styles.donut}>
      <div className={styles.donutChart} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => (active && payload?.length ? (
                <div className={styles.tooltip}>
                  <div className={styles.tooltipLabel}>{payload[0].name}</div>
                  <div className={styles.tooltipRow}>
                    <span className={styles.tooltipDot} style={{ background: payload[0].payload.fill }} />
                    <span className={styles.tooltipName}>
                      {total ? `${Math.round((payload[0].value / total) * 100)}%` : ''}
                    </span>
                    <span className={styles.tooltipValue}>{formatValue(payload[0].value)}</span>
                  </div>
                </div>
              ) : null)}
            />
            <Pie
              data={data.map((r, i) => ({ name: r.x, value: r[seriesKey] || 0, fill: seriesColor(i) }))}
              dataKey="value"
              nameKey="name"
              innerRadius="52%"
              outerRadius="92%"
              stroke="var(--neutral-0)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {data.map((r, i) => <Cell key={r.x} fill={seriesColor(i)} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className={styles.donutLegend}>
        {data.map((r, i) => (
          <li key={r.x} className={styles.donutLegendItem}>
            <span className={styles.legendDot} style={{ background: seriesColor(i) }} />
            <span className={styles.donutLegendText}>
              <span className={styles.donutLegendLabel}>{r.x}</span>
              <span className={styles.donutLegendValue}>{formatValue(r[seriesKey])}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
