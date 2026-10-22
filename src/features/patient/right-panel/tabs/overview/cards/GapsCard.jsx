import { useState } from 'react';
import { DashboardCard, DashboardCardBody } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { SubTabs } from '../../../../../../components/SubTabs/SubTabs';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Button } from '../../../../../../components/Button/Button';
import { useAppStore } from '../../../../../../store/useAppStore';
import styles from './overviewCards.module.css';

export function GapsCard({ overview, actions }) {
  const showToast = useAppStore(s => s.showToast);
  const gaps = (overview?.gaps || []).filter(g => g.status !== 'Closed');
  const quality = gaps.filter(g => g.category !== 'hcc');
  const hcc = gaps.filter(g => g.category === 'hcc');
  const [tab, setTab] = useState('quality');
  const list = tab === 'hcc' ? hcc : quality;

  const run = (gap) => {
    if (gap.cta === 'Create Task') { actions.addTask(); return; }
    showToast(`${gap.cta} is coming soon`);
  };

  return (
    <DashboardCard icon="solar:danger-triangle-linear" title="Gaps" count={gaps.length || null}>
      {gaps.length > 0 && (
        <div className={styles.tabs}>
          <SubTabs
            tabs={[{ key: 'quality', label: `Quality gaps (${quality.length})` }, { key: 'hcc', label: `HCC gaps (${hcc.length})` }]}
            activeKey={tab}
            onChange={setTab}
          />
        </div>
      )}
      <DashboardCardBody>
        {gaps.length === 0 ? (
          <p className={styles.empty}>No open gaps.</p>
        ) : list.length === 0 ? (
          <p className={styles.empty}>No open {tab === 'hcc' ? 'HCC' : 'quality'} gaps.</p>
        ) : list.map(g => (
          <PanelSectionItem
            key={g.id}
            leading={<span className={styles.codeChip}>{g.code}</span>}
            title={g.title}
            meta={g.detail}
            trailing={(
              <span className={styles.trail}>
                <span className={styles.statusSlot}><Badge tone={g.tone || 'grey'} size="S" label={g.status} /></span>
                {g.cta
                  ? <Button variant="secondary" size="S" className={styles.ctaButton} onClick={() => run(g)}>{g.cta}</Button>
                  : <span className={styles.ctaButton} />}
              </span>
            )}
          />
        ))}
      </DashboardCardBody>
    </DashboardCard>
  );
}
