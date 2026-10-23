import { useEffect, useRef, useState } from 'react';
import { DashboardCard, DashboardCardBody } from '../../../../../../components/DashboardCard/DashboardCard';
import { Icon } from '../../../../../../components/Icon/Icon';
import { OVERVIEW_SEED } from '../../../../data/overviewData';
import {
  ResponsiveContainer, AreaChart, Area, YAxis, Tooltip, ReferenceLine,
} from '../../../../../../components/LazyRecharts/LazyRecharts';
import { goalTarget } from './vitalGoal';
import styles from './overviewCards.module.css';
import { CardInsights } from '../attention/CardInsights';

const TONE_COLOR = {
  error: 'var(--status-error-dark)',
  warning: 'var(--status-warning-dark)',
  success: 'var(--status-success-dark)',
};

const SOURCE_ICON = {
  bp: 'solar:stethoscope-linear',
  a1c: 'solar:test-tube-linear',
  glucose: 'solar:test-tube-linear',
  bmi: 'solar:scale-linear',
};

function ageLabel(measuredAt) {
  if (!measuredAt) return null;
  const match = String(measuredAt).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return measuredAt;
  const then = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  const days = Math.round((Date.now() - then.getTime()) / 86400000);
  if (Number.isNaN(days) || days < 0 || days >= 90) return measuredAt;
  if (days === 0) return 'Today';
  return `${days} d`;
}

// One reading under the cursor, with the goal. Only the latest reading has a
// date and the full value (e.g. 142/88); earlier BP readings carry a
// diastolic only when the data has a `diastolicSeries`.
function VitalTooltip({ active, payload, unit, measuredAt, latestValue, goal, dual, total }) {
  if (!active || !payload?.length) return null;
  const { value, dia, index } = payload[0].payload;
  const latest = index === total - 1;
  const reading = latest && latestValue ? latestValue : dia != null ? `${value}/${dia}` : value;
  const systolicOnly = dual && !(latest && latestValue) && dia == null;
  // "120/80" or "25" take the unit; "7%" and "140 mg/dL" already carry one.
  const goalText = goal && (/[a-z%]/i.test(goal) ? goal : `${goal} ${unit}`);
  return (
    <div className={styles.vitalTooltip}>
      <span className={styles.vitalTooltipLabel}>
        {latest ? `Latest${measuredAt ? ` · ${measuredAt}` : ''}` : `Reading ${index + 1} of ${total}`}
      </span>
      <span className={styles.vitalTooltipValue}>
        {systolicOnly ? 'Systolic ' : ''}{reading} {unit}
      </span>
      {systolicOnly && <span className={styles.vitalTooltipLabel}>Diastolic not on file</span>}
      {goalText && <span className={styles.vitalTooltipLabel}>Goal {goalText}</span>}
    </div>
  );
}

function VitalTrend({ values, diastolic, color, target, unit, measuredAt, latestValue, goal, dual }) {
  if (!Array.isArray(values) || values.length < 2) return <div className={styles.vitalTrend} />;
  const hasDia = Array.isArray(diastolic) && diastolic.length === values.length;
  const data = values.map((value, index) => ({ index, value, dia: hasDia ? diastolic[index] : null }));
  // The scale stretches to include the target, so its line is always on the chart.
  const all = [...values, ...(hasDia ? diastolic : []), ...(target != null ? [target] : [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = (max - min || 1) * 0.12;
  return (
    <div className={styles.vitalTrend}>
      <ResponsiveContainer width="100%" height="100%" minHeight={48}>
        {/* Edge to edge: the area meets the card's sides and bottom. */}
        <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <YAxis hide domain={[min - pad, max + pad]} />
          {target != null && <ReferenceLine y={target} stroke="var(--neutral-300)" strokeDasharray="3 3" ifOverflow="extendDomain" />}
          <Tooltip
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '2 2' }}
            content={(
              <VitalTooltip unit={unit} measuredAt={measuredAt} latestValue={latestValue} goal={goal} dual={dual} total={values.length} />
            )}
            wrapperStyle={{ zIndex: 2 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={color}
            fillOpacity={0.16}
            dot={{ r: 2.5, fill: 'var(--neutral-0)', stroke: color, strokeWidth: 1 }}
            activeDot={{ r: 4, fill: color, stroke: 'var(--neutral-0)', strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
          {hasDia && (
            <Area
              type="monotone"
              dataKey="dia"
              stroke={color}
              strokeWidth={1}
              strokeDasharray="4 2"
              fill="none"
              dot={false}
              activeDot={{ r: 3, fill: color, stroke: 'var(--neutral-0)', strokeWidth: 1 }}
              isAnimationActive={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VitalsCard({ overview, memberId }) {
  const seeded = Object.fromEntries((OVERVIEW_SEED[memberId]?.vitals || []).map(v => [v.key, v]));
  const vitals = (overview?.vitals || []).map(v => {
    const sample = seeded[v.key];
    return {
      ...v,
      goalFrom: v.goalFrom || sample?.goalFrom,
      goalTo: v.goalTo || sample?.goalTo,
      // Sample diastolic history (BP), like the goals, until the row carries its own.
      diastolicSeries: v.diastolicSeries || sample?.diastolicSeries,
      sourceIcon: v.sourceIcon || sample?.sourceIcon,
    };
  });
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdges({ left: el.scrollLeft > 2, right: max - el.scrollLeft > 2 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [vitals.length]);

  const scrollByCard = (direction) => {
    const el = scroller.current;
    const card = el?.firstElementChild;
    if (!el || !card) return;
    const gap = 12;
    el.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: 'smooth' });
  };

  return (
    <DashboardCard
      icon="solar:heart-pulse-linear"
      title="Vitals"
      actions={vitals.length > 0 ? (
        <span className={styles.vitalNavs}>
          <button type="button" className={styles.vitalNav} aria-label="Previous vitals" disabled={!edges.left} onClick={() => scrollByCard(-1)}>
            <Icon name="solar:alt-arrow-left-linear" size={16} />
          </button>
          <button type="button" className={styles.vitalNav} aria-label="Next vitals" disabled={!edges.right} onClick={() => scrollByCard(1)}>
            <Icon name="solar:alt-arrow-right-linear" size={16} />
          </button>
        </span>
      ) : null}
    >
      <DashboardCardBody>
        {vitals.length === 0 ? (
          <p className={styles.empty}>No vitals recorded.</p>
        ) : (
          <div className={styles.vitalsRow} ref={scroller}>
            {vitals.map(v => {
              const tone = v.tone === 'error' || v.tone === 'warning' || v.tone === 'success' ? v.tone : 'success';
              const color = TONE_COLOR[tone];
              const when = ageLabel(v.measuredAt);
              const icon = v.sourceIcon || SOURCE_ICON[v.key];
              return (
                <article key={v.key} className={styles.vital} data-tone={tone}>
                  <div className={styles.vitalBody}>
                    {(v.goalFrom || v.goalTo) && (
                      <p className={styles.vitalGoal}>
                        Goal:
                        {v.goalFrom && <span>{v.goalFrom}</span>}
                        {v.goalFrom && v.goalTo && <span aria-hidden="true">→</span>}
                        {v.goalTo && <span>{v.goalTo}</span>}
                      </p>
                    )}
                    <p className={styles.vitalName}>{v.label}</p>
                    <p className={styles.vitalValueRow}>
                      <span className={styles.vitalReading}>
                        <span className={styles.vitalValue}>{v.value}</span>
                        {v.unit && <span className={styles.vitalUnit}>{v.unit}</span>}
                      </span>
                      {v.change && (
                        <span className={styles.vitalPill}>
                          <Icon name={v.direction === 'down' ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-up-linear'} size={10} />
                          {v.change}
                        </span>
                      )}
                    </p>
                    {(when || icon) && (
                      <p className={styles.vitalMeta}>
                        {when}
                        {when && icon && <span aria-hidden="true">•</span>}
                        {icon && <Icon name={icon} size={12} />}
                      </p>
                    )}
                  </div>
                  <VitalTrend
                    values={v.series}
                    diastolic={v.diastolicSeries}
                    color={color}
                    target={goalTarget(v.goalTo)}
                    goal={v.goalTo}
                    unit={v.unit}
                    measuredAt={v.measuredAt}
                    latestValue={v.value}
                    dual={v.key === 'bp'}
                  />
                </article>
              );
            })}
          </div>
        )}
      </DashboardCardBody>
      <CardInsights />
    </DashboardCard>
  );
}
