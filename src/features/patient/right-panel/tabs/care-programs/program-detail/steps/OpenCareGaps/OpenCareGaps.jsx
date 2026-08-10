import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Button } from '../../../../../../../../components/Button/Button';
import { Checkbox } from '../../../../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { CARE_GAP_SECTIONS_EXTENDED } from '../../../../../../data/careGapsMock';
import styles from './OpenCareGaps.module.css';

// Per-gap overlay: who it's assigned to and which resolve action it needs.
// Gaps not listed fall back to Unassigned + "Add Value".
const GAP_META = {
  cm1: { assignee: 'Delores Conn', action: 'Add Value' },
  cm2: { assignee: 'Randy Klein', action: 'Add Value' },
  cm3: { action: 'Schedule' },
  lb1: { assignee: 'Kerry Nienow', action: 'Add Value' },
  lb2: { action: 'Schedule' },
  lb3: { action: 'Schedule' },
  rf1: { action: 'Add Value' },
  rf2: { action: 'Schedule' },
};

function GapRow({ item }) {
  const meta = GAP_META[item.id] || {};
  return (
    <div className={styles.row}>
      <span className={styles.checkCell} onClick={e => e.stopPropagation()}>
        <Checkbox aria-label={`Select ${item.title}`} />
      </span>
      <span className={styles.titleCell}>{item.title}</span>
      <span className={styles.statusCell}>{item.status}</span>
      <span className={styles.assigneeCell}>
        {meta.assignee ? (
          <>
            <Icon name="solar:user-rounded-linear" size={15} color="var(--status-success)" />
            <button type="button" className={styles.assigneeName}>{meta.assignee}</button>
          </>
        ) : (
          <button type="button" className={styles.assignBtn}>
            <Icon name="solar:user-plus-rounded-linear" size={15} color="var(--neutral-300)" />
            Assign
          </button>
        )}
      </span>
      <span className={styles.actionCell}>
        <Button variant="tertiary" size="S">{meta.action || 'Add Value'}</Button>
      </span>
    </div>
  );
}

export function OpenCareGaps() {
  return (
    <div className={styles.container}>
      {CARE_GAP_SECTIONS_EXTENDED.map(section => (
        <div key={section.title} className={styles.section}>
          <div className={styles.sectionLabel}>{section.title}</div>
          <div className={styles.table}>
            <div className={styles.headRow}>
              <span className={styles.checkCell} />
              <span className={styles.titleCell}>Title</span>
              <span className={styles.statusCell}>Status</span>
              <span className={styles.assigneeCell}>Assignee</span>
              <span className={styles.actionCell}>Action</span>
            </div>
            {section.items.map(item => <GapRow key={item.id} item={item} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
