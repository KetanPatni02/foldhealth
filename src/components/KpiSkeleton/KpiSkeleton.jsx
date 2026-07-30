import styles from '../TableSkeleton/TableSkeleton.module.css';

function KpiCardSkeleton() {
  return (
    <div style={{
      background: 'var(--neutral-0)', border: '0.5px solid var(--neutral-100)', borderRadius: 8,
      padding: 14, flex: 1, minWidth: 140,
    }}>
      <div className={styles.bone} style={{ width: '60%', height: 10, marginBottom: 8 }} />
      <div className={styles.bone} style={{ width: '40%', height: 22, marginBottom: 6 }} />
      <div className={styles.bone} style={{ width: '70%', height: 8 }} />
    </div>
  );
}

export function KpiSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 0' }}>
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}
