import { useEffect, useMemo } from 'react';
import { DashboardCard, DashboardCardBody, DashboardCardSkeleton } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { PriorityIcon } from '../../../../../../components/PriorityIcon/PriorityIcon';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Button } from '../../../../../../components/Button/Button';
import { useAppStore } from '../../../../../../store/useAppStore';
import styles from './overviewCards.module.css';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const isMet = status => /^(met|achieved|completed)$/i.test(status || '');
const isClosed = status => /^(resolved|closed|completed|met|achieved|discontinued)$/i.test(status || '');

function goalTone(status) {
  if (isMet(status)) return 'success';
  if (/not met|overdue/i.test(status || '')) return 'error';
  if (/in progress/i.test(status || '')) return 'warning';
  return 'grey';
}

const VISIBLE_GOALS = 3;

export function CarePlanCard({ patientId, actions }) {
  const plans = useAppStore(s => s.patientCarePlans);
  const loading = useAppStore(s => s.patientCarePlanAllLoading[patientId]);
  const loaded = useAppStore(s => s.patientCarePlanAllLoadedFor[patientId]);
  const fetchAll = useAppStore(s => s.fetchAllPatientCarePlans);

  useEffect(() => { if (patientId) fetchAll(patientId); }, [patientId, fetchAll]);

  // Every program's plan for this patient, merged: the Overview shows the
  // patient's whole plan, not one program's.
  const { goals, interventions, barriers } = useMemo(() => {
    const prefix = `${patientId}::`;
    const merged = { goals: [], interventions: [], barriers: [] };
    for (const [key, plan] of Object.entries(plans)) {
      if (!key.startsWith(prefix) || !plan) continue;
      merged.goals.push(...(plan.goals || []));
      merged.interventions.push(...(plan.interventions || []));
      merged.barriers.push(...(plan.barriers || []));
    }
    return merged;
  }, [plans, patientId]);

  if (!loaded && loading !== false) return <DashboardCardSkeleton icon="solar:clipboard-list-linear" title="Care Plan" />;

  const openGoals = goals
    .filter(g => !isMet(g.status))
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3));
  const progress = goals.length
    ? Math.round(goals.reduce((sum, g) => sum + (Number(g.progress) || 0), 0) / goals.length)
    : 0;
  const openBarriers = barriers.filter(b => !isClosed(b.status)).length;
  const activeInterventions = interventions.filter(i => !isClosed(i.status)).length;
  const hiddenGoals = openGoals.length - VISIBLE_GOALS;

  return (
    <DashboardCard
      icon="solar:clipboard-list-linear"
      title="Care Plan"
      actions={<Button variant="ghost" size="S" onClick={actions.openCarePlan}>Open care plan</Button>}
    >
      <DashboardCardBody>
        {goals.length === 0 && interventions.length === 0 && barriers.length === 0 ? (
          <p className={styles.empty}>No care plan yet. Open the care plan to add goals, interventions and barriers.</p>
        ) : (
          <>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.muted}>Goals</span>
                <span className={styles.statValue}>
                  <span className={styles.statNumber}>{goals.length}</span>
                  <span className={`${styles.muted} ${styles.textSuccess}`}>{goals.filter(g => isMet(g.status)).length} met</span>
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.muted}>Interventions</span>
                <span className={styles.statValue}>
                  <span className={styles.statNumber}>{interventions.length}</span>
                  <span className={styles.muted}>{activeInterventions} active</span>
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.muted}>Barriers</span>
                <span className={styles.statValue}>
                  <span className={styles.statNumber}>{barriers.length}</span>
                  <span className={`${styles.muted} ${openBarriers ? styles.textError : ''}`}>{openBarriers} open</span>
                </span>
              </div>
            </div>
            {goals.length > 0 && (
              <div className={styles.progressRow}>
                <span className={styles.muted}>Overall progress</span>
                <span className={styles.bar} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Overall goal progress">
                  <span className={styles.barFill} style={{ width: `${progress}%` }} />
                </span>
                <span className={styles.progressPct}>{progress}%</span>
              </div>
            )}
            {openGoals.length > 0 && <h4 className={styles.sectionLabel}>Active goals</h4>}
            {openGoals.slice(0, VISIBLE_GOALS).map(g => (
              <PanelSectionItem
                key={g.id}
                leading={<PriorityIcon priority={g.priority} title={`${g.priority} priority`} />}
                title={g.title}
                meta={[g.targetDate && `Target ${g.targetDate}`, g.currentValue && `Current ${g.currentValue}${g.customUnit ? ` ${g.customUnit}` : ''}`]}
                trailing={<Badge tone={goalTone(g.status)} size="S" label={g.status} />}
              />
            ))}
            {hiddenGoals > 0 && (
              <Button variant="ghost" size="S" className={styles.moreLink} onClick={actions.openCarePlan}>
                +{hiddenGoals} more goals
              </Button>
            )}
          </>
        )}
      </DashboardCardBody>
    </DashboardCard>
  );
}
