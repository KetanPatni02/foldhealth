import { useEffect, useMemo, useState } from 'react';
import { DashboardCard, DashboardCardBody } from '../../../../../../components/DashboardCard/DashboardCard';
import { PanelSectionItem } from '../../../../../../components/PanelSection/PanelSection';
import { SubTabs } from '../../../../../../components/SubTabs/SubTabs';
import { PriorityIcon } from '../../../../../../components/PriorityIcon/PriorityIcon';
import { Checkbox } from '../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Button } from '../../../../../../components/Button/Button';
import { useAppStore } from '../../../../../../store/useAppStore';
import { groupTasksForTab } from '../../../../left-panel/tabs/tasks/TasksTab/groupTasksForTab';
import { TaskDetailDrawer } from '../../../../../tasks/TaskDetailDrawer';
import styles from './overviewCards.module.css';

const VISIBLE = 4;

// Same patient match as the Monitoring tab: member id, store id, or name.
function tasksForPatient(tasks, patient) {
  const memberKey = patient?.memberId ? String(patient.memberId) : null;
  return (tasks || []).filter(t => !t.is_subtask && (
    (memberKey && String(t.patient_id) === memberKey)
    || (patient?.id && String(t.patient_id) === String(patient.id))
    || (patient?.name && t.member === patient.name)
  ));
}

export function TasksCard({ patient, actions }) {
  const allTasks = useAppStore(s => s.tasks);
  const fetchTasks = useAppStore(s => s.fetchTasks);
  const updateTask = useAppStore(s => s.updateTask);
  const [pickedTab, setTab] = useState(null);
  const [openTaskId, setOpenTaskId] = useState(null);

  useEffect(() => { fetchTasks?.(); }, [fetchTasks]);

  const groups = useMemo(() => groupTasksForTab(tasksForPatient(allTasks, patient)), [allTasks, patient]);
  // Until the user picks a tab, open on Overdue when nothing is merely open,
  // so the card never leads with an empty list while work is waiting.
  const tab = pickedTab ?? (groups.pending.length === 0 && groups.overdue.length > 0 ? 'overdue' : 'pending');
  const list = groups[tab] || [];
  const isOverdueTab = tab === 'overdue';
  // The drawer reads the live store task, so edits made in it show here.
  const openTask = openTaskId ? (allTasks || []).find(t => String(t.id) === String(openTaskId)) : null;

  const toggle = (task) => {
    if (tab === 'completed') updateTask(task.id, { status: 'pending', completed_at: null });
    else updateTask(task.id, { status: 'completed', completed_at: new Date().toISOString() });
  };

  return (
    <DashboardCard
      icon="solar:checklist-linear"
      title="Tasks"
      count={groups.pending.length + groups.overdue.length || null}
      actions={<Button variant="ghost" size="S" onClick={actions.addTask}>Add task</Button>}
    >
      <div className={styles.tabs}>
        <SubTabs
          tabs={[
            { key: 'pending', label: `Open (${groups.pending.length})` },
            { key: 'overdue', label: `Overdue (${groups.overdue.length})` },
            { key: 'completed', label: 'Completed' },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
      </div>
      <DashboardCardBody>
        {list.length === 0 ? (
          <p className={styles.empty}>{tab === 'completed' ? 'No completed tasks.' : isOverdueTab ? 'Nothing overdue.' : 'No open tasks.'}</p>
        ) : list.slice(0, VISIBLE).map(t => (
          <div key={t.id} className={styles.clickRow}>
            <PanelSectionItem
              leading={(
                <span className={styles.leadPair}>
                  <span className={styles.aboveStretch}>
                    <Checkbox
                      checked={tab === 'completed'}
                      onCheckedChange={() => toggle(t)}
                      aria-label={tab === 'completed' ? `Reopen ${t.title}` : `Complete ${t.title}`}
                    />
                  </span>
                  <PriorityIcon priority={t.priority} title={`${t.priority} priority`} />
                </span>
              )}
              title={(
                <button type="button" className={`${styles.titleButton} ${styles.stretch}`} onClick={() => setOpenTaskId(t.id)}>
                  {t.title}
                </button>
              )}
              meta={[
                t.due && <span key="due" className={isOverdueTab ? styles.textError : undefined}>{isOverdueTab ? 'Overdue • ' : ''}Due {t.due}</span>,
                t.assignee,
              ]}
            />
          </div>
        ))}
      </DashboardCardBody>
      {openTask && (
        <TaskDetailDrawer
          task={openTask}
          onClose={() => setOpenTaskId(null)}
          onSelectTask={next => setOpenTaskId(next?.id ?? null)}
        />
      )}
    </DashboardCard>
  );
}
