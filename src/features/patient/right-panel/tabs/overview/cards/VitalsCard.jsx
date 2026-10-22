import { useEffect, useRef, useState } from 'react';
import { DashboardCard, DashboardCardBody } from '../../../../../../components/DashboardCard/DashboardCard';
import { Icon } from '../../../../../../components/Icon/Icon';
import { OVERVIEW_SEED } from '../../../../data/overviewData';
import styles from './overviewCards.module.css';

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

function VitalTrend({ values, color }) {
  if (!Array.isArray(values) || values.length < 2) return <div className={styles.vitalTrend} />;
  const width = 100;
  const height = 75;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = 6 + (1 - (value - min) / span) * (height - 14);
    return [x, y];
  });
  const line = points.map(point => point.join(',')).join(' ');
  return (
    <div className={styles.vitalTrend} aria-hidden="true">
      <svg className={styles.vitalTrendSvg} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polygon points={`0,${height} ${line} ${width},${height}`} fill={color} opacity="0.16" />
        <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {points.map(([x, y], i) => (
        <span
          key={i}
          className={styles.vitalDot}
          style={{ left: `${x}%`, top: `${(y / height) * 100}%`, borderColor: color }}
        />
      ))}
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
                  <VitalTrend values={v.series} color={color} />
                </article>
              );
            })}
          </div>
        )}
      </DashboardCardBody>
    </DashboardCard>
  );
}
