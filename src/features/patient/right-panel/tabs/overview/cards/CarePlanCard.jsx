import { useEffect, useMemo, useState } from 'react';
import { DashboardCard, DashboardCardBody, DashboardCardSkeleton } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem, PanelSectionMore } from '../../../../../../components/PanelSection/PanelSection';
import { SubTabs } from '../../../../../../components/SubTabs/SubTabs';
import { PriorityIcon } from '../../../../../../components/PriorityIcon/PriorityIcon';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Button } from '../../../../../../components/Button/Button';
import { useAppStore } from '../../../../../../store/useAppStore';
import styles from './overviewCards.module.css';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const VISIBLE = 3;
const isClosed = status => /^(resolved|closed|completed|met|achieved|discontinued|not applicable)$/i.test(status || '');

function itemTone(status) {
  if (isClosed(status) && !/not applicable/i.test(status || '')) return 'success';
  if (/not met|overdue/i.test(status || '')) return 'error';
  if (/in progress/i.test(status || '')) return 'warning';
  return 'grey';
}

function personName(assignee) {
  if (!assignee) return null;
  return typeof assignee === 'string' ? assignee : assignee.name || null;
}

// Open work first, then priority, so the three visible rows are the ones to act on.
function byAttention(a, b) {
  const closed = Number(isClosed(a.status)) - Number(isClosed(b.status));
  if (closed) return closed;
  return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
}

export function CarePlanCard({ patientId, actions }) {
  const plans = useAppStore(s => s.patientCarePlans);
  const loading = useAppStore(s => s.patientCarePlanAllLoading[patientId]);
  const loaded = useAppStore(s => s.patientCarePlanAllLoadedFor[patientId]);
  const fetchAll = useAppStore(s => s.fetchAllPatientCarePlans);
  const [tab, setTab] = useState('goals');
  const [expanded, setExpanded] = useState(false);

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
    merged.goals.sort(byAttention);
    merged.interventions.sort(byAttention);
    merged.barriers.sort(byAttention);
    return merged;
  }, [plans, patientId]);

  if (!loaded && loading !== false) return <DashboardCardSkeleton icon="solar:clipboard-list-linear" title="Care Plan" />;

  const lists = { goals, interventions, barriers };
  const list = lists[tab];
  const empty = goals.length === 0 && interventions.length === 0 && barriers.length === 0;
  const shown = expanded ? list : list.slice(0, VISIBLE);

  const selectTab = (key) => {
    setTab(key);
    setExpanded(false);
  };

  return (
    <DashboardCard
      icon="solar:clipboard-list-linear"
      title="Care Plan"
      tabs={!empty && (
        <SubTabs
          className={styles.tabRow}
          tabs={[
            { key: 'goals', label: `Goals (${goals.length})` },
            { key: 'interventions', label: `Interventions (${interventions.length})` },
            { key: 'barriers', label: `Barriers (${barriers.length})` },
          ]}
          activeKey={tab}
          onChange={selectTab}
        />
      )}
      actions={<Button variant="ghost" size="S" onClick={actions.openCarePlan}>Open care plan</Button>}
    >
      <DashboardCardBody className={styles.listBody}>
        {empty ? (
          <p className={styles.empty}>No care plan yet. Open the care plan to add goals, interventions and barriers.</p>
        ) : list.length === 0 ? (
          <p className={styles.empty}>No {tab} on this care plan yet.</p>
        ) : (
          <>
            {shown.map(item => (
              <PanelSectionItem
                key={item.id || item.title}
                inset
                leading={<PriorityIcon priority={item.priority} title={item.priority ? `${item.priority} priority` : 'No priority'} />}
                title={item.title}
                meta={tab === 'goals'
                  ? [item.targetDate && `Target ${item.targetDate}`, item.currentValue && `Current ${item.currentValue}${item.customUnit ? ` ${item.customUnit}` : ''}`]
                  : [personName(item.assignee)]}
                trailing={(
                  <span className={styles.statusSlotWide}>
                    <Badge tone={itemTone(item.status)} size="S" label={item.status || 'Not Started'} />
                  </span>
                )}
              />
            ))}
            <PanelSectionMore expanded={expanded} hiddenCount={list.length - VISIBLE} onToggle={() => setExpanded(v => !v)} />
          </>
        )}
      </DashboardCardBody>
    </DashboardCard>
  );
}
