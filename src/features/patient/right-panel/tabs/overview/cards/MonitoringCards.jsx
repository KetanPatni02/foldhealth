// Overview cards backed by the patient's patient_monitoring snapshot (the
// same data as the Monitoring tab): since-last-touch recap, program steps.
import { useEffect } from 'react';
import { DashboardCard, DashboardCardBody, DashboardCardSkeleton } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { CappedRows } from './CappedRows';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Icon } from '../../../../../../components/Icon/Icon';
import { useAppStore } from '../../../../../../store/useAppStore';
import styles from './overviewCards.module.css';

function useMonitoring(memberId) {
  const data = useAppStore(s => (memberId ? s.patientMonitoring[memberId] : null));
  const fetchPatientMonitoring = useAppStore(s => s.fetchPatientMonitoring);
  useEffect(() => { if (memberId) fetchPatientMonitoring(memberId); }, [memberId, fetchPatientMonitoring]);
  return data;
}

export function SinceLastTouchCard({ memberId }) {
  const data = useMonitoring(memberId);
  if (memberId && data === undefined) return <DashboardCardSkeleton icon="custom:history" title="Since Last Touch" />;
  const items = data?.timeline || [];
  return (
    <DashboardCard
      icon="custom:history"
      title="Since Last Touch"
      count={items.length || null}
      footer={data?.continuityNext ? `Next touchpoint: ${data.continuityNext}` : null}
    >
      <DashboardCardBody>
        {data?.continuityLast && <PanelSectionItem title="Last touch" meta={data.continuityLast} />}
        {items.length === 0 ? (
          <p className={styles.empty}>Nothing new recorded since the last touch.</p>
        ) : (
          <CappedRows
            items={items}
            render={t => (
              <PanelSectionItem
                key={t.text}
                title={t.text}
                wrapTitle
                trailing={t.source ? <span className={styles.statusSlotWide}><Badge tone="grey" size="S" label={t.source} /></span> : null}
              />
            )}
          />
        )}
      </DashboardCardBody>
    </DashboardCard>
  );
}

const STEP = {
  done: { icon: 'solar:check-circle-linear', className: styles.textSuccess },
  current: { icon: 'solar:arrow-right-linear', className: styles.textWarning },
};

export function ProgramProgressCard({ memberId }) {
  const data = useMonitoring(memberId);
  if (memberId && data === undefined) return <DashboardCardSkeleton icon="solar:checklist-linear" title="Program Progress" />;
  const programs = (data?.programs || []).filter(p => p.steps?.length || p.progress);
  return (
    <DashboardCard icon="solar:checklist-linear" title="Program Progress" count={programs.length || null}>
      <DashboardCardBody>
        {programs.length === 0 ? (
          <p className={styles.empty}>No program steps tracked for this patient yet.</p>
        ) : programs.slice(0, 2).map(p => (
          <div key={p.code} className={styles.programBlock}>
            <PanelSectionItem
              leading={<span className={styles.codeChip}>{p.code}</span>}
              title={p.name}
              meta={[p.progress, p.next]}
              wrapTitle
            />
            {(p.steps || []).slice(0, 3).map(s => {
              const st = STEP[s.status];
              return (
                <PanelSectionItem
                  key={s.label}
                  leading={<span className={st?.className || styles.muted}><Icon name={st?.icon || 'solar:record-linear'} size={14} /></span>}
                  title={s.label}
                  meta={s.meta || s.sub}
                  wrapTitle
                />
              );
            })}
          </div>
        ))}
        {programs.length > 2 && (
          <p className={styles.muted}>{programs.length - 2} more program{programs.length - 2 === 1 ? '' : 's'} on the Care Management tab.</p>
        )}
      </DashboardCardBody>
    </DashboardCard>
  );
}
