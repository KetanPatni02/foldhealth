import styles from '../TableSkeleton/TableSkeleton.module.css';

function SimpleRow({ cols = 6 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--neutral-100)', gap: 16 }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={styles.bone} style={{ height: 12, width: i === 0 ? 160 : 80, flex: i === 0 ? 'none' : 1 }} />
      ))}
    </div>
  );
}

export function SimpleTableSkeleton({ rows = 6, cols = 6 }) {
  return (
    <div style={{ background: 'var(--neutral-0)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <SimpleRow key={i} cols={cols} />
      ))}
    </div>
  );
}
