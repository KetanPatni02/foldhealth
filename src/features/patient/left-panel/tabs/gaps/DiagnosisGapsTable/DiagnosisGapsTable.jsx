import { useMemo } from 'react';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { DiagnosisIcon } from '../../../../../../components/Icon/DiagnosisIcon';
import { getOpenIcdsForMember } from '../../../../../hcc/data/icds';
import styles from './DiagnosisGapsTable.module.css';

function groupByHcc(icds) {
  const map = {};
  for (const icd of icds) {
    const key = icd.hcc || 'HCC Not Linked';
    if (!map[key]) map[key] = { title: key, icds: [], lastDocumented: null };
    map[key].icds.push(icd);
    if (icd.last && (!map[key].lastDocumented || icd.last > map[key].lastDocumented)) {
      map[key].lastDocumented = icd.last;
    }
  }
  return Object.values(map).map((g, i) => ({
    id: `dg-${i}`,
    title: g.title,
    status: 'Open',
    icdCount: g.icds.length,
    lastDocumented: g.lastDocumented || '—',
  }));
}

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

export function DiagnosisGapsTable({ memberName }) {
  const items = useMemo(() => {
    if (!memberName) return [];
    const { all } = getOpenIcdsForMember(memberName);
    return groupByHcc(all);
  }, [memberName]);

  if (!items.length) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.empty}>No open diagnosis gaps</div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.colHeader}>
          <span className={styles.colTitle}>Title</span>
          <span className={styles.colStatus}>Status</span>
          <span className={styles.colActions} />
        </div>
        {items.map(item => (
          <DiagnosisGapRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
