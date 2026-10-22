import { DashboardCard, DashboardCardBody } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { CappedRows } from './CappedRows';
import { Icon } from '../../../../../../components/Icon/Icon';
import styles from './overviewCards.module.css';

const KIND = {
  encounter: { icon: 'solar:heart-pulse-linear', tone: 'error' },
  lab: { icon: 'solar:test-tube-linear', tone: 'warning' },
  medication: { icon: 'solar:pill-linear', tone: 'info' },
  risk: { icon: 'solar:danger-triangle-linear', tone: 'warning' },
};

export function HighlightsCard({ overview }) {
  const highlights = overview?.highlights || [];
  return (
    <DashboardCard icon="solar:lightbulb-minimalistic-linear" title="Highlights" count={highlights.length || null}>
      <DashboardCardBody>
        {highlights.length === 0 ? (
          <p className={styles.empty}>Nothing notable recently.</p>
        ) : (
          <CappedRows
            items={highlights}
            render={(h) => {
              const kind = KIND[h.kind] || { icon: 'solar:info-circle-linear', tone: '' };
              return (
                <PanelSectionItem
                  key={h.id}
                  leading={<span className={`${styles.tile} ${styles[kind.tone] || ''}`}><Icon name={kind.icon} size={16} /></span>}
                  title={h.title}
                  meta={[h.date, h.source]}
                />
              );
            }}
          />
        )}
      </DashboardCardBody>
    </DashboardCard>
  );
}
