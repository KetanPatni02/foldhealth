import { useMemo } from 'react';
import { WorklistShell } from '../../components/WorklistShell/WorklistShell';
import { useAppStore } from '../../store/useAppStore';
import { KanbanBoard, EmptyState } from './TasksViewKanban';
import { StatusGroupRows } from './TasksViewStatusGroup';

const PERSONAL_TABS = new Set(['assigned', 'created', 'mentions']);

function buildColumns(hideAssignedTo) {
  // Widths tuned so the AssigneeChange pill (fillContainer) can hold
  // full names like "Suryakumar Vishwakarma" without truncating. Status
  // and Due Date give up room since they always fit their shortest labels.
  const cols = [
    { key: 'check', label: '', width: 48, align: 'center' },
    { key: 'task', label: 'Tasks' },
    { key: 'priority', label: 'P', width: 60, align: 'center' },
    { key: 'status', label: 'Status', width: 110 },
    { key: 'due', label: 'Due Date', width: 130 },
  ];
  if (!hideAssignedTo) cols.push({ key: 'assigned', label: 'Assigned To', width: 200 });
  cols.push(
    { key: 'member', label: 'Member', width: 210 },
    { key: 'labels', label: 'Labels', width: 220 },
    { key: 'actions', label: '', width: 48 },
  );
  return cols;
}

export function TasksViewContent({
  tasksLoading,
  tasks,
  filteredTasks,
  tasksViewMode,
  kanbanGroups,
  grouped,
  hideAssignedTo,
  handleToggle,
  handleTaskMove,
  onTaskClick,
  onAddTask,
}) {
  const currentUserProfile = useAppStore(s => s.currentUserProfile);
  const tasksTab = useAppStore(s => s.tasksTab);

  const columns = useMemo(() => buildColumns(hideAssignedTo), [hideAssignedTo]);
  const colCount = columns.length;
  // 48 + task(min 258 flex) + 60 + 110 + 130 + 200 + 210 + 220 + 48 = 1284
  const minTableWidth = hideAssignedTo ? 1086 : 1286;

  if (filteredTasks.length === 0 && !(tasksLoading && tasks.length === 0)) {
    if (PERSONAL_TABS.has(tasksTab) && !currentUserProfile?.id && !currentUserProfile?.name) {
      return (
        <EmptyState
          title="Sign in to see your tasks"
          description="Assigned to Me, Created by Me, and Mentions filter against your signed-in profile."
          icon="solar:user-linear"
        />
      );
    }
    return (
      <EmptyState
        title="No tasks found"
        description="Try adjusting your filters or switch to a different tab."
        icon="solar:magnifer-linear"
      />
    );
  }

  if (tasksViewMode === 'board') {
    return (
      <KanbanBoard
        kanbanGroups={kanbanGroups}
        onToggle={handleToggle}
        onTaskMove={handleTaskMove}
        onTaskClick={onTaskClick}
      />
    );
  }

  return (
    <WorklistShell
      header={null}
      columns={columns}
      rows={grouped}
      renderRow={(group) => (
        <StatusGroupRows
          key={group.status}
          group={group}
          colCount={colCount}
          onToggle={handleToggle}
          onTaskClick={onTaskClick}
          hideAssignedTo={hideAssignedTo}
          onAddTask={onAddTask}
        />
      )}
      loading={tasksLoading && tasks.length === 0}
      minTableWidth={minTableWidth}
    />
  );
}
