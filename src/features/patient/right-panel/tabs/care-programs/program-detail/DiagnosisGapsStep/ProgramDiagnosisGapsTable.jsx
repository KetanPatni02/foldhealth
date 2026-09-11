import { useMemo, useState } from 'react';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import { DownChevronIcon } from '../../../../../../../components/Icon/DownChevronIcon';
import { getOpenIcdsForMember } from '../../../../../../hcc/data/icds';
import styles from './ProgramDiagnosisGapsTable.module.css';

// Program-step surface for the AWV / APE "Open Diagnosis Gaps" step. Same
// data source as the sidebar Diagnosis Gaps section, but the row UX
// exposes the linked ICDs inline behind an expand toggle so a scheduler
// can see exactly which ICDs the follow-up visit needs to close.
//
// Rule: only ICDs the physician hasn't already raised a claim for
// belong here. "Accepted" is our proxy for "physician claim raised",
// "Dismissed" is a hard close (both are filtered out by
// getOpenIcdsForMember's isIcdOpen), so what lands here are
// New / In Progress / Suspect / Recapture rows waiting on the
// follow-up visit that will close the gap in the EHR.

function splitHccLabel(raw) {
  if (!raw) return { code: '-', name: '' };
  const [codeRaw, ...rest] = String(raw).split(' - ');
  return { code: codeRaw.trim() || '-', name: rest.join(' - ').trim() };
}

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
  return Object.values(map).map((g, i) => {
    const { code, name } = splitHccLabel(g.title);
    return {
      id: `dg-${i}`,
      raw: g.title,
      code,
      name,
      icds: g.icds,
      icdCount: g.icds.length,
      lastDocumented: g.lastDocumented || '-',
    };
  });
}

function DiagnosisGapRow({ item }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded(v => !v);
  const countLabel = `${item.icdCount} ICD${item.icdCount !== 1 ? 's' : ''} Linked`;
  return (
    <div className={styles.rowGroup}>
      <div className={styles.row}>
        <div className={styles.content}>
          <span className={styles.title}>
            <span className={styles.hccCode}>{item.code}</span>
            {item.name ? <span className={styles.hccSep}> - </span> : null}
            <span className={styles.hccName}>{item.name}</span>
          </span>
          <div className={styles.meta}>
            <span className={styles.metaText}>Last Documented: {item.lastDocumented}</span>
            <span className={styles.metaSep} aria-hidden="true">•</span>
            <button
              type="button"
              className={styles.icdLink}
              onClick={toggle}
              aria-expanded={expanded}
              aria-label={expanded ? `Collapse ${countLabel}` : `Expand ${countLabel}`}
            >
              <span>{countLabel}</span>
              <DownChevronIcon
                size={14}
                color="var(--primary-300)"
                className={expanded ? styles.icdChevronOpen : styles.icdChevron}
              />
            </button>
          </div>
        </div>
        <div className={styles.moreBtn}>
          <ActionButton icon="solar:menu-dots-linear" size="S" tooltip="More" />
        </div>
      </div>
      {expanded && item.icds.length > 0 && (
        <div className={styles.icdList} role="table" aria-label={`ICDs linked to ${item.raw}`}>
          <div className={styles.icdHeaderRow} role="row">
            <span className={styles.icdHeaderCell} role="columnheader">ICD Code</span>
            <span className={styles.icdHeaderCell} role="columnheader">Description</span>
          </div>
          {item.icds.map(icd => (
            <div key={icd.code} className={styles.icdRow} role="row">
              <span className={styles.icdCode} role="cell">{icd.code}</span>
              <span className={styles.icdDesc} role="cell" title={icd.desc}>{icd.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgramDiagnosisGapsTable({ memberName, search }) {
  const items = useMemo(() => {
    if (!memberName) return [];
    const { all } = getOpenIcdsForMember(memberName);
    const grouped = groupByHcc(all);
    const q = (search || '').trim().toLowerCase();
    if (!q) return grouped;
    return grouped.filter(g => {
      const inTitle = g.raw.toLowerCase().includes(q);
      const inIcds = g.icds.some(i =>
        (i.code || '').toLowerCase().includes(q)
        || (i.desc || '').toLowerCase().includes(q),
      );
      return inTitle || inIcds;
    });
  }, [memberName, search]);

  if (!items.length) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.empty}>
          {search ? 'No diagnosis gaps match your search' : 'No open diagnosis gaps'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {items.map(item => (
          <DiagnosisGapRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
