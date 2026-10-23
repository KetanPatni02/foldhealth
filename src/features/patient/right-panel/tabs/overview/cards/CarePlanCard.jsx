import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { DashboardCard, DashboardCardBody, DashboardCardSkeleton } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem, PanelSectionMore } from '../../../../../../components/PanelSection/PanelSection';
import { SubTabs } from '../../../../../../components/SubTabs/SubTabs';
import { PriorityIcon } from '../../../../../../components/PriorityIcon/PriorityIcon';
import { Button } from '../../../../../../components/Button/Button';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { useAppStore } from '../../../../../../store/useAppStore';
import { GbiStatusButton, gbiStatusMenuItems } from '../../care-programs/care-plan/tables/carePlanTableShared';
import styles from './overviewCards.module.css';

const GoalPreviewDrawer = lazy(() => import('../../care-programs/care-plan/drawers/GoalPreviewDrawer/GoalPreviewDrawer').then(m => ({ default: m.GoalPreviewDrawer })));
const InterventionPreviewDrawer = lazy(() => import('../../care-programs/care-plan/drawers/InterventionPreviewDrawer/InterventionPreviewDrawer').then(m => ({ default: m.InterventionPreviewDrawer })));
const BarrierDetailDrawer = lazy(() => import('../../care-programs/care-plan/drawers/BarrierDetailDrawer/BarrierDetailDrawer').then(m => ({ default: m.BarrierDetailDrawer })));

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const VISIBLE = 3;
const TYPE_BY_TAB = { goals: 'goal', interventions: 'intervention', barriers: 'barrier' };
const isClosed = status => /^(resolved|closed|completed|met|achieved|discontinued|not applicable)$/i.test(status || '');

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
  const saveCarePlanLiveField = useAppStore(s => s.saveCarePlanLiveField);
  const [tab, setTab] = useState('goals');
  const [expanded, setExpanded] = useState(false);
  const [statusMenu, setStatusMenu] = useState(null);
  const [goal, setGoal] = useState(null);
  const [intervention, setIntervention] = useState(null);
  const [barrier, setBarrier] = useState(null);

  useEffect(() => { if (patientId) fetchAll(patientId); }, [patientId, fetchAll]);

  // Every program's plan for this patient, merged. Each row keeps the program
  // it belongs to so the preview drawer and status save hit the right plan.
  const { goals, interventions, barriers } = useMemo(() => {
    const prefix = `${patientId}::`;
    const merged = { goals: [], interventions: [], barriers: [] };
    for (const [key, plan] of Object.entries(plans)) {
      if (!key.startsWith(prefix) || !plan) continue;
      const program = { id: plan.plan?.programId || key.slice(prefix.length) };
      const tag = (items) => (items || []).map(item => ({
        ...item,
        program: item.program?.id ? item.program : program,
      }));
      merged.goals.push(...tag(plan.goals));
      merged.interventions.push(...tag(plan.interventions));
      merged.barriers.push(...tag(plan.barriers));
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
  const type = TYPE_BY_TAB[tab];

  const selectTab = (key) => {
    setTab(key);
    setExpanded(false);
  };

  const openItem = (item) => {
    const next = { item, program: item.program };
    if (type === 'goal') setGoal(next);
    else if (type === 'intervention') setIntervention(next);
    else setBarrier(next);
  };

  const changeStatus = (status) => {
    const menu = statusMenu;
    setStatusMenu(null);
    if (!menu?.item?.program?.id || !menu.item.id) return;
    saveCarePlanLiveField(patientId, menu.item.program, menu.type, menu.item.id, { status });
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
              <div key={`${item.program?.id || ''}-${item.id || item.title}`} className={styles.clickRow}>
                <PanelSectionItem
                  inset
                  leading={<PriorityIcon priority={item.priority} title={item.priority ? `${item.priority} priority` : 'No priority'} />}
                  title={(
                    <button type="button" className={`${styles.titleButton} ${styles.stretch}`} onClick={() => openItem(item)}>
                      {item.title}
                    </button>
                  )}
                  meta={tab === 'goals'
                    ? [item.targetDate && `Target ${item.targetDate}`, item.currentValue && `Current ${item.currentValue}${item.customUnit ? ` ${item.customUnit}` : ''}`]
                    : [personName(item.assignee)]}
                  trailing={(
                    <span className={`${styles.statusSlotWide} ${styles.aboveStretch}`}>
                      <GbiStatusButton
                        value={item.status || 'Not Started'}
                        disabled={!item.id || !item.program?.id}
                        onOpen={(rect) => setStatusMenu({ type, item, rect })}
                      />
                    </span>
                  )}
                />
              </div>
            ))}
            <PanelSectionMore expanded={expanded} hiddenCount={list.length - VISIBLE} onToggle={() => setExpanded(v => !v)} />
          </>
        )}
      </DashboardCardBody>
      {statusMenu && (
        <MenuPopover
          anchorRect={statusMenu.rect}
          align="left"
          width={200}
          ariaLabel="Change status"
          items={gbiStatusMenuItems(statusMenu.type, statusMenu.item?.status)}
          onSelect={changeStatus}
          onClose={() => setStatusMenu(null)}
        />
      )}
      {goal && (
        <Suspense fallback={null}>
          <GoalPreviewDrawer
            goal={goal.item}
            patientId={patientId}
            program={goal.program}
            onClose={() => setGoal(null)}
            onOpenIntervention={(item) => setIntervention({ item: { ...item, program: item.program || goal.program }, program: item.program || goal.program })}
            onOpenBarrier={(item) => setBarrier({ item: { ...item, program: item.program || goal.program }, program: item.program || goal.program })}
          />
        </Suspense>
      )}
      {intervention && (
        <Suspense fallback={null}>
          <InterventionPreviewDrawer
            intervention={intervention.item}
            patientId={patientId}
            program={intervention.program}
            onClose={() => setIntervention(null)}
            onOpenGoal={(item) => setGoal({ item: { ...item, program: item.program || intervention.program }, program: item.program || intervention.program })}
          />
        </Suspense>
      )}
      {barrier && (
        <Suspense fallback={null}>
          <BarrierDetailDrawer
            barrier={barrier.item}
            patientId={patientId}
            program={barrier.program}
            onClose={() => setBarrier(null)}
            onOpenGoal={(item) => setGoal({ item: { ...item, program: item.program || barrier.program }, program: item.program || barrier.program })}
          />
        </Suspense>
      )}
    </DashboardCard>
  );
}
