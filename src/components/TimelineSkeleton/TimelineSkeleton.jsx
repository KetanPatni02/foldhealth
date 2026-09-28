import bone from '../TableSkeleton/TableSkeleton.module.css';
import styles from './TimelineSkeleton.module.css';

// Row shapes cycle so the placeholder reads like a real feed: some entries
// carry a detail card, some are one line.
const ROWS = [
  { title: '38%', card: true },
  { title: '30%', card: false },
  { title: '44%', card: true },
  { title: '26%', card: false },
  { title: '34%', card: true },
];

/**
 * TimelineSkeleton: loading placeholder shaped like the Activity / History
 * timeline (month header, icon rail with connector, meta line, title and an
 * optional detail card), so the feed doesn't jump when entries arrive.
 *
 * @param {object} props
 * @param {number} [props.rows=5]
 */
export function TimelineSkeleton({ rows = 5 }) {
  const list = Array.from({ length: rows }, (_, i) => ROWS[i % ROWS.length]);
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading activity">
      <span className={bone.bone} style={{ width: 120, height: 14 }} />
      {list.map((r, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.rail}>
            <span className={[styles.connector, i === 0 ? styles.connectorFirst : ''].join(' ')} />
            <span className={`${bone.bone} ${styles.icon}`} />
            <span className={[styles.connector, styles.connectorGrow, i === list.length - 1 ? styles.connectorLast : ''].join(' ')} />
          </div>
          <div className={styles.body}>
            <span className={bone.bone} style={{ width: 180, height: 10 }} />
            <span className={bone.bone} style={{ width: r.title, height: 14 }} />
            {r.card && (
              <div className={styles.card}>
                <span className={bone.bone} style={{ width: '46%', height: 12 }} />
                <span className={bone.bone} style={{ width: '64%', height: 10 }} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
