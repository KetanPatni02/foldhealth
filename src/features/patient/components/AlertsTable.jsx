import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { ALERT_ITEMS } from '../data/careGapsMock';
import styles from './AlertsTable.module.css';

function FlagIcon({ severity }) {
  const color = severity === 'error' ? '#D72825' : '#D9A50B';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2.5 1.5V12.5" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M2.5 2H10C10 2 8.5 4 8.5 5.5C8.5 7 10 9 10 9H2.5V2Z" fill={color}/>
    </svg>
  );
}

function AlertRow({ item }) {
  return (
    <div className={styles.row}>
      <div className={styles.content}>
        <span className={styles.title}>{item.title}</span>
        <div className={styles.meta}>
          <FlagIcon severity={item.severity} />
          <span className={styles.metaDot}>•</span>
          <span className={styles.metaText}>{item.category} • {item.time}</span>
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

export function AlertsTable() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.colHeader}>
          <span className={styles.colTitle}>Title</span>
          <span className={styles.colStatus}>Status</span>
          <span className={styles.colActions} />
        </div>
        {ALERT_ITEMS.map(item => (
          <AlertRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
