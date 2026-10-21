import { DashboardCard, DashboardCardBody } from '../../../../../../components/DashboardCard/DashboardCard';
import { Sparkline } from '../../../../../../components/Sparkline/Sparkline';
import { Icon } from '../../../../../../components/Icon/Icon';
import styles from './overviewCards.module.css';

const TONE_COLOR = {
  error: 'var(--status-error)',
  warning: 'var(--status-warning-dark)',
  success: 'var(--status-success)',
};
const TONE_CLASS = { error: styles.textError, warning: styles.textWarning, success: styles.textSuccess };

export function VitalsCard({ overview }) {
  const vitals = overview?.vitals || [];
  return (
    <DashboardCard
      icon="solar:heart-pulse-linear"
      title="Vitals"
      footer={vitals.length && overview.vitalsSource ? (
        <>
          <Icon name="solar:smartphone-linear" size={14} color="var(--neutral-200)" />
          {overview.vitalsSource}
        </>
      ) : null}
    >
      <DashboardCardBody>
        {vitals.length === 0 ? (
          <p className={styles.empty}>No vitals recorded.</p>
        ) : (
          <div className={styles.vitalsGrid}>
            {vitals.map(v => (
              <div key={v.key} className={styles.vital}>
                <span className={styles.muted}>{v.label}</span>
                <span className={styles.vitalValueRow}>
                  <span className={styles.vitalValue}>{v.value}</span>
                  <span className={styles.muted}>{v.unit}</span>
                  {v.change && (
                    <span className={`${styles.vitalChange} ${TONE_CLASS[v.tone] || ''}`}>
                      {v.direction === 'down' ? '▼' : '▲'} {v.change}
                    </span>
                  )}
                </span>
                <Sparkline values={v.series} color={TONE_COLOR[v.tone] || 'var(--primary-300)'} label={`${v.label} trend`} />
                <span className={styles.muted}>{v.measuredAt}</span>
              </div>
            ))}
          </div>
        )}
      </DashboardCardBody>
    </DashboardCard>
  );
}
