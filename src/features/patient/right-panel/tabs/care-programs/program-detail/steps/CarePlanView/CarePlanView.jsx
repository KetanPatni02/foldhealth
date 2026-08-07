import { useState } from 'react';
import { Icon } from '../../../../../../../../components/Icon/Icon';
import { ActionButton } from '../../../../../../../../components/ActionButton/ActionButton';
import { Avatar } from '../../../../../../../../components/Avatar/Avatar';
import { CARE_PLAN_MOCK } from '../../../../../../data/carePlanMock';
import styles from './CarePlanView.module.css';

function PriorityIcon() {
  return <Icon name="solar:double-alt-arrow-up-linear" size={16} color="var(--secondary-300)" />;
}

function LinkChip({ count }) {
  return (
    <span className={`${styles.linkChip} ${count ? '' : styles.linkChipEmpty}`}>
      <Icon name="solar:link-linear" size={14} color="var(--neutral-300)" />
      {count > 0 && <span className={styles.linkCount}>{count}</span>}
    </span>
  );
}

function StatusPill({ value }) {
  return (
    <button type="button" className={styles.statusPill}>
      {value}
      <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--neutral-300)" />
    </button>
  );
}

function ProgressRing() {
  return <span className={styles.progressRing}>-</span>;
}

function GoalRow({ goal }) {
  return (
    <div className={styles.goalRow}>
      <span className={styles.pCell}><PriorityIcon /></span>
      <span className={styles.titleCell}>
        <span className={styles.rowIcon}><Icon name={goal.icon} size={16} color="var(--neutral-400)" /></span>
        <span className={styles.titleText}>
          <span className={styles.title}>{goal.title}</span>
          {goal.subtitle && <span className={styles.subtitle}>{goal.subtitle}</span>}
        </span>
        <LinkChip count={goal.links} />
      </span>
      <span className={`${styles.valueCell} ${goal.currentValue === 'No Data' ? styles.muted : ''}`}>{goal.currentValue || ''}</span>
      <span className={styles.trendCell}>{goal.trend}</span>
      <span className={styles.progressCell}><ProgressRing /></span>
      <span className={styles.statusCell}><StatusPill value={goal.status} /></span>
    </div>
  );
}

function InterventionRow({ item }) {
  return (
    <div className={styles.intvRow}>
      <span className={styles.pCell}><PriorityIcon /></span>
      <span className={styles.titleCell}>
        <span className={styles.rowIcon}><Icon name={item.icon} size={16} color="var(--neutral-400)" /></span>
        <span className={styles.titleText}>
          <span className={styles.title}>{item.title}</span>
          {item.duration && (
            <span className={styles.durationChip}>
              <Icon name="solar:clock-circle-linear" size={12} color="var(--neutral-300)" />
              {item.duration}
              <Icon name="solar:refresh-linear" size={12} color="var(--neutral-300)" />
            </span>
          )}
        </span>
        <LinkChip count={item.links} />
      </span>
      <span className={styles.assigneeCell}>
        <Avatar variant="staff" size={24} initials={item.assignee.initials} />
        <span className={styles.assigneeName}>{item.assignee.name}</span>
      </span>
      <span className={styles.adherenceCell}><ProgressRing /></span>
      <span className={styles.statusCell}><StatusPill value={item.status} /></span>
    </div>
  );
}

export function CarePlanView() {
  const data = CARE_PLAN_MOCK;
  const [conditionsOpen, setConditionsOpen] = useState(true);

  return (
    <div className={styles.container}>
      {/* Condition chips */}
      <div className={styles.conditionRow}>
        <button type="button" className={styles.collapseBtn} onClick={() => setConditionsOpen(o => !o)} aria-label="Toggle conditions">
          <Icon name={conditionsOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} size={16} color="var(--secondary-300)" />
        </button>
        {conditionsOpen && (
          <div className={styles.chips}>
            {data.conditions.map(c => (
              <span key={c.label} className={`${styles.chip} ${c.primary ? styles.chipPrimary : ''}`}>
                {c.label}
                {c.removable && <Icon name="solar:close-circle-linear" size={14} color="var(--neutral-300)" />}
              </span>
            ))}
          </div>
        )}
        <button type="button" className={styles.viewAll}>View All ({data.conditionTotal})</button>
      </div>

      <button type="button" className={styles.newProblems}>
        <Icon name="solar:magic-stick-3-linear" size={16} color="var(--primary-300)" />
        New Problems identified in HRA
      </button>

      {/* Goals */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>Goals</span>
          <div className={styles.sectionActions}>
            <button type="button" className={styles.trendsBtn}>
              <Icon name="solar:chart-2-linear" size={16} color="var(--neutral-300)" />
              Trends
            </button>
            <ActionButton icon="solar:add-circle-linear" size="S" tooltip="Add goal" />
          </div>
        </div>
        <div className={styles.table}>
          <div className={styles.goalHead}>
            <span className={styles.pCell}>P</span>
            <span className={styles.titleCell}>Goal Title</span>
            <span className={styles.valueCell}>Current Value</span>
            <span className={styles.trendCell}>Trend</span>
            <span className={styles.progressCell}>Progress</span>
            <span className={styles.statusCell}>Status</span>
          </div>
          {data.goals.map(g => <GoalRow key={g.id} goal={g} />)}
        </div>
      </div>

      {/* Interventions */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>Interventions</span>
          <div className={styles.sectionActions}>
            <ActionButton icon="solar:add-circle-linear" size="S" tooltip="Add intervention" />
          </div>
        </div>
        <div className={styles.table}>
          <div className={styles.intvHead}>
            <span className={styles.pCell}>P</span>
            <span className={styles.titleCell}>Name</span>
            <span className={styles.assigneeCell}>Assigned To</span>
            <span className={styles.adherenceCell}>Adherence</span>
            <span className={styles.statusCell}>Status</span>
          </div>
          {data.interventions.map(i => <InterventionRow key={i.id} item={i} />)}
        </div>
      </div>
    </div>
  );
}
