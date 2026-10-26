import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { DashboardCard, DashboardCardBody, DashboardCardSkeleton } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { PriorityIcon } from '../../../../../../components/PriorityIcon/PriorityIcon';
import { Button } from '../../../../../../components/Button/Button';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import { useAppStore } from '../../../../../../store/useAppStore';
import { GbiStatusButton, gbiStatusMenuItems } from '../../care-programs/care-plan/tables/carePlanTableShared';
import { carePlanAttention } from '../attention/carePlanAttention';
import styles from './overviewCards.module.css';

const GoalPreviewDrawer = lazy(() => import('../../care-programs/care-plan/drawers/GoalPreviewDrawer/GoalPreviewDrawer').then(m => ({ default: m.GoalPreviewDrawer })));
const InterventionPreviewDrawer = lazy(() => import('../../care-programs/care-plan/drawers/InterventionPreviewDrawer/InterventionPreviewDrawer').then(m => ({ default: m.InterventionPreviewDrawer })));
const BarrierDetailDrawer = lazy(() => import('../../care-programs/care-plan/drawers/BarrierDetailDrawer/BarrierDetailDrawer').then(m => ({ default: m.BarrierDetailDrawer })));

// Up to five rows: what needs attention, then recently updated items.
const LIMIT = 5;
const KIND_LABEL = { goal: 'Goal', intervention: 'Intervention', barrier: 'Barrier' };
const REASON_CLASS = { error: styles.textError, warning: styles.textWarning };

// The owner's name, or nothing for the "Unassigned" placeholder (its row says "No owner").
function personName(assignee) {
  const name = typeof assignee === 'string' ? assignee : assignee?.name;
  return name && name !== 'Unassigned' ? name : null;
}

export function CarePlanCard({ patientId, actions }) {
  const plans = useAppStore(s => s.patientCarePlans);
  const loading = useAppStore(s => s.patientCarePlanAllLoading[patientId]);
  const loaded = useAppStore(s => s.patientCarePlanAllLoadedFor[patientId]);
  const fetchAll = useAppStore(s => s.fetchAllPatientCarePlans);
  const saveCarePlanLiveField = useAppStore(s => s.saveCarePlanLiveField);
  const [statusMenu, setStatusMenu] = useState(null);
  const [goal, setGoal] = useState(null);
  const [intervention, setIntervention] = useState(null);
  const [barrier, setBarrier] = useState(null);

  // The clock the attention rules read (past due, new this month), taken once per mount.
  const [openedAt] = useState(() => Date.now());

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
    return merged;
  }, [plans, patientId]);
  const focus = useMemo(
    () => carePlanAttention({ goals, interventions, barriers, now: openedAt, limit: LIMIT }),
    [goals, interventions, barriers, openedAt],
  );

  if (!loaded && loading !== false) return <DashboardCardSkeleton icon="solar:clipboard-list-linear" title="Care Plan" />;

  const empty = focus.total === 0;
  const shown = focus.items.slice(0, LIMIT);
  const quiet = focus.open - focus.attention;

  const openItem = (kind, item) => {
    const next = { item, program: item.program };
    if (kind === 'goal') setGoal(next);
    else if (kind === 'intervention') setIntervention(next);
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
      count={focus.attention || null}
      actions={<Button variant="ghost" size="S" onClick={actions.openCarePlan}>Open care plan</Button>}
    >
      <DashboardCardBody className={styles.listBody}>
        {empty ? (
          <p className={styles.empty}>No care plan yet. Open the care plan to add goals, interventions and barriers.</p>
        ) : shown.length === 0 ? (
          <p className={styles.empty}>Nothing in the care plan needs attention. {focus.open} open {focus.open === 1 ? 'item is' : 'items are'} on track.</p>
        ) : (
          <>
            {shown.map(({ kind, item, reason, tone }) => (
              <div key={`${kind}-${item.program?.id || ''}-${item.id || item.title}`} className={styles.clickRow}>
                <PanelSectionItem
                  inset
                  leading={<PriorityIcon priority={item.priority} title={item.priority ? `${item.priority} priority` : 'No priority'} />}
                  title={(
                    <button type="button" className={`${styles.titleButton} ${styles.stretch}`} onClick={() => openItem(kind, item)}>
                      {item.title}
                    </button>
                  )}
                  meta={[
                    KIND_LABEL[kind],
                    <span key="why" className={REASON_CLASS[tone]}>{reason}</span>,
                    kind === 'goal'
                      ? item.currentValue && `Current ${item.currentValue}${item.customUnit ? ` ${item.customUnit}` : ''}`
                      : personName(item.assignee),
                  ]}
                  trailing={(
                    <span className={`${styles.statusSlotWide} ${styles.aboveStretch}`}>
                      <GbiStatusButton
                        value={item.status || 'Not Started'}
                        disabled={!item.id || !item.program?.id}
                        onOpen={(rect) => setStatusMenu({ type: kind, item, rect })}
                      />
                    </span>
                  )}
                />
              </div>
            ))}
            <p className={`${styles.muted} ${styles.listNote}`}>
              {focus.attention > LIMIT ? `${focus.attention - LIMIT} more need attention. ` : ''}
              {quiet > 0 ? `${quiet} other open ${quiet === 1 ? 'item is' : 'items are'} on track.` : ''}
            </p>
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
