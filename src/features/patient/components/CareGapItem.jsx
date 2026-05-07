import { ActionButton } from '../../../components/ActionButton/ActionButton';
import styles from './CareGapItem.module.css';

export function CareGapItem({ item, selected, onSelect }) {
  return (
    <div
      className={`${styles.row} ${selected ? styles.rowSelected : ''}`}
      onClick={() => onSelect?.(item.id)}
    >
      <div className={styles.content}>
        <span className={styles.title}>{item.title}</span>
        {item.diagnosis && <span className={styles.meta}>{item.diagnosis}</span>}
      </div>
      <span className={styles.status}>{item.status}</span>
      <div className={styles.moreBtn} onClick={e => e.stopPropagation()}>
        <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
      </div>
    </div>
  );
}
