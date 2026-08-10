import { Toggle } from '../../components/Toggle/Toggle';
import { TopBar } from '../../components/TopBar/TopBar';
import { SectionTitleBar } from '../../components/SectionTitleBar/SectionTitleBar';
import { FilterBar } from '../../components/FilterBar/FilterBar';
import { AddTaskDrawer } from './AddTaskDrawer';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { VIEW_TOGGLE_ITEMS } from './TasksViewIcons';
import { useTasksView } from './useTasksView';
import { TasksViewContent } from './TasksViewContent';
import styles from './TasksView.module.css';

export { AddTaskDrawer } from './AddTaskDrawer';
export { TaskDetailDrawer } from './TaskDetailDrawer';
export { TaskListSection } from './TasksViewListSection';

export function TasksView() {
  const view = useTasksView();

  return (
    <div className={styles.wrapper}>
      <TopBar />

      <SectionTitleBar
        tabs={view.TABS.map(t => ({ ...t, count: view.tabCounts[t.key] }))}
        activeTab={view.tasksTab}
        onTabChange={view.setTasksTab}
        rightExtras={
          <>
            <Toggle
              items={VIEW_TOGGLE_ITEMS}
              active={view.tasksViewMode}
              onChange={view.setTasksViewMode}
              size="S"
            />
            <span style={{ width: 1, height: 16, background: 'var(--neutral-150)', flexShrink: 0 }} aria-hidden="true" />
          </>
        }
        actions={['filter']}
        filterActive={view.showTasksFilterBar}
        onFilter={view.toggleTasksFilterBar}
        primaryActionLabel="Add Task"
        onPrimaryAction={() => { view.setAddDrawerStatus('pending'); view.setShowAddDrawer(true); }}
      />

      {view.showTasksFilterBar && (
        <FilterBar
          leading={null}
          filterDefs={view.filterDefs}
          filters={view.tasksFilters}
          onFilterChange={view.setTasksFilter}
          onClearAll={view.clearTasksFilters}
          getOptions={(def) => def.options || []}
          showMoreFilters={false}
          showSaveFilter={false}
        />
      )}

      <TasksViewContent
        tasksLoading={view.tasksLoading}
        tasks={view.tasks}
        filteredTasks={view.filteredTasks}
        tasksViewMode={view.tasksViewMode}
        kanbanGroups={view.kanbanGroups}
        grouped={view.grouped}
        hideAssignedTo={view.hideAssignedTo}
        handleToggle={view.handleToggle}
        handleTaskMove={view.handleTaskMove}
        onTaskClick={view.setSelectedTask}
        onAddTask={(s) => { view.setAddDrawerStatus(s); view.setShowAddDrawer(true); }}
      />

      {view.selectedTask && (
        <TaskDetailDrawer
          task={view.tasks.find(t => t.id === view.selectedTask.id) || view.selectedTask}
          onClose={() => view.setSelectedTask(null)}
          onSelectTask={t => view.setSelectedTask(t)}
        />
      )}
      {view.showAddDrawer && (
        <AddTaskDrawer
          onClose={() => { view.setShowAddDrawer(false); view.setAddDrawerInitialMember(null); }}
          defaultStatus={view.addDrawerStatus}
          initialMember={view.addDrawerInitialMember}
          onTaskCreated={(task) => {
            view.setShowAddDrawer(false);
            view.setAddDrawerInitialMember(null);
            view.setSelectedTask(task);
          }}
        />
      )}
    </div>
  );
}
