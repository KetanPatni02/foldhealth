import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { DiagnosisIcon } from '../../../components/Icon/DiagnosisIcon';
import { DIAGNOSIS_GAP_ITEMS } from '../data/careGapsMock';
import styles from './DiagnosisGapsTable.module.css';

function DiagnosisGapRow({ item }) {
  return (
    <div className={styles.row}>
      <div className={styles.content}>
        <span className={styles.title}>{item.title}</span>
        <div className={styles.meta}>
          <span className={styles.metaText}>Last Documented: {item.lastDocumented} •&nbsp;</span>
          <DiagnosisIcon size={12} />
          <button className={styles.icdLink}>{item.icdCount} ICD{item.icdCount !== 1 ? 's' : ''}</button>
        </div>
      </div>
      <div className={styles.statusCell}>
        <span className={styles.status}>{item.status}</span>
      </div>
      <div className={styles.moreBtn}>
        <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
      </div>
    </div>
  );
}

export function DiagnosisGapsTable() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.colHeader}>
          <span className={styles.colTitle}>Title</span>
          <span className={styles.colStatus}>Status</span>
          <span className={styles.colActions} />
        </div>
        {DIAGNOSIS_GAP_ITEMS.map(item => (
          <DiagnosisGapRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
