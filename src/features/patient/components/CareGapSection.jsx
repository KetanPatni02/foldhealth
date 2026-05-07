import { CareGapItem } from './CareGapItem';
import styles from './CareGapSection.module.css';

export function CareGapSection({ section, selectedGaps, onToggleGap }) {
  if (!section.items.length) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.sectionLabel}>{section.title}</div>
      <div className={styles.card}>
        {/* Column header */}
        <div className={styles.colHeader}>
          <span className={styles.colTitle}>Title</span>
          <span className={styles.colStatus}>Status</span>
          <span className={styles.colActions} />
        </div>
        {/* Items */}
        {section.items.map(item => (
          <CareGapItem
            key={item.id}
            item={item}
            selected={selectedGaps.includes(item.id)}
            onSelect={onToggleGap}
          />
        ))}
      </div>
    </div>
  );
}
