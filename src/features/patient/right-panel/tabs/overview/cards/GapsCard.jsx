import { lazy, Suspense, useEffect, useState } from 'react';
import { DashboardCard, DashboardCardBody } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { CappedRows } from './CappedRows';
import { SubTabs } from '../../../../../../components/SubTabs/SubTabs';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Button } from '../../../../../../components/Button/Button';
import { useAppStore } from '../../../../../../store/useAppStore';
import { openOverviewGap } from './overviewItemActions';
import styles from './overviewCards.module.css';

const CareGapDetailDrawer = lazy(() => import('../../../../../hedis-worklist/CareGapDetailDrawer').then(m => ({ default: m.CareGapDetailDrawer })));

export function GapsCard({ overview, actions, patient }) {
  const showToast = useAppStore(s => s.showToast);
  const hedisMembers = useAppStore(s => s.hedisMembers);
  const hedisLoading = useAppStore(s => s.hedisLoading);
  const fetchHedisMembers = useAppStore(s => s.fetchHedisMembers);
  const hccMembers = useAppStore(s => s.hccMembers);
  const hccLoading = useAppStore(s => s.hccMembersLoading);
  const fetchHccMembers = useAppStore(s => s.fetchHccMembers);
  const openDiagPanel = useAppStore(s => s.openDiagPanel);
  const [careGap, setCareGap] = useState(null);
  const gaps = (overview?.gaps || []).filter(g => g.status !== 'Closed');
  const quality = gaps.filter(g => g.category !== 'hcc');
  const hcc = gaps.filter(g => g.category === 'hcc');
  const [tab, setTab] = useState('quality');
  const list = tab === 'hcc' ? hcc : quality;

  useEffect(() => {
    fetchHedisMembers?.();
    fetchHccMembers?.();
  }, [fetchHedisMembers, fetchHccMembers]);

  const openGap = (gap) => openOverviewGap(gap, {
    patient, hedisMembers, hedisLoading, hccMembers, hccLoading, openDiagPanel, showToast, setCareGap,
  });

  const run = (gap, event) => {
    event.stopPropagation();
    if (gap.cta === 'Create Task') { actions.addTask(); return; }
    if (gap.cta === 'Review') { openGap(gap); return; }
    showToast(`${gap.cta} is coming soon`);
  };

  return (
    <DashboardCard
      icon="solar:danger-triangle-linear"
      title="Gaps"
      count={gaps.length || null}
      tabs={gaps.length > 0 && (
        <SubTabs
          className={styles.tabRow}
          tabs={[{ key: 'quality', label: `Quality gaps (${quality.length})` }, { key: 'hcc', label: `HCC gaps (${hcc.length})` }]}
          activeKey={tab}
          onChange={setTab}
        />
      )}
    >
      <DashboardCardBody className={styles.listBody}>
        {gaps.length === 0 ? (
          <p className={styles.empty}>No open gaps.</p>
        ) : list.length === 0 ? (
          <p className={styles.empty}>No open {tab === 'hcc' ? 'HCC' : 'quality'} gaps.</p>
        ) : (
          <CappedRows
            items={list}
            resetKey={tab}
            render={g => (
              <div key={g.id} className={styles.clickRow}>
                <PanelSectionItem
                  inset
                  leading={<span className={styles.codeChip}>{g.code}</span>}
                  title={(
                    <button type="button" className={`${styles.titleButton} ${styles.stretch}`} onClick={() => openGap(g)}>
                      {g.title}
                    </button>
                  )}
                  meta={g.detail}
                  trailing={(
                    <span className={`${styles.trail} ${styles.aboveStretch}`}>
                      <span className={styles.statusSlot}><Badge tone={g.tone || 'grey'} size="S" label={g.status} /></span>
                      {g.cta
                        ? <Button variant="secondary" size="S" className={styles.ctaButton} onClick={(e) => run(g, e)}>{g.cta}</Button>
                        : <span className={styles.ctaButton} />}
                    </span>
                  )}
                />
              </div>
            )}
          />
        )}
      </DashboardCardBody>
      {careGap && (
        <Suspense fallback={null}>
          <CareGapDetailDrawer
            member={careGap.member}
            gapCode={careGap.gapCode}
            year={careGap.year}
            onClose={() => setCareGap(null)}
          />
        </Suspense>
      )}
    </DashboardCard>
  );
}
