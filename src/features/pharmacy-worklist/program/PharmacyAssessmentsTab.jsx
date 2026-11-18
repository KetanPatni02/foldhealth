import { useMemo, useState } from 'react';
import { ActivityLog } from '../../../components/ActivityLog/ActivityLog';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import { Link } from '../../../components/Link/Link';
import { assessmentContactLine } from './pharmacyRecords';
import styles from './PharmacyAssessmentsTab.module.css';

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Saved Assessments as the drawer's other timelines show their entries:
// month headers, the icon rail, who and when, gap badges and the outcome.
// View Assessment opens the record read-only; the download icon saves that
// one Assessment as a PDF.
function assessmentEntries(records, { onOpen, onDownload } = {}) {
  const out = [];
  let month = null;
  for (const r of records) {
    const [mm, dd, yyyy] = r.date.split('/');
    const label = `${MONTH[Number(mm) - 1]} ${yyyy}`;
    if (label !== month) { out.push({ t: 'group', label }); month = label; }
    out.push({
      id: r.id,
      t: 'call',
      icon: 'solar:clipboard-check-linear',
      date: `${mm}/${dd}`,
      time: r.time || '',
      by: r.by,
      title: assessmentContactLine(r),
      badges: r.measures || [],
      outcome: r.outcome,
      // As the Activity log colors a saved Assessment.
      outcomeColor: r.result === 'failed' ? 'var(--status-warning)' : 'var(--status-success)',
      viewDetailsLabel: 'View Assessment',
      onViewDetails: onOpen ? () => onOpen(r) : undefined,
      trailingHover: onDownload ? <ActionButton icon="solar:download-minimalistic-linear" size="sm" tooltip="Download PDF" tooltipLeft onClick={() => onDownload(r)} /> : null,
    });
  }
  return out;
}

// Logged Assessments by date, gap and user (Suresh), filterable by both.
// `records`: newest first (assessmentRecords). `onOpen(record)`,
// `onDownload(record)`.
export function PharmacyAssessmentsTab({ records, onOpen, onDownload }) {
  const [gaps, setGaps] = useState([]);
  const [people, setPeople] = useState([]);
  const options = useMemo(() => ({
    gaps: [...new Set(records.flatMap(r => r.measures || []))].sort(),
    people: [...new Set(records.map(r => r.by).filter(Boolean))].sort(),
  }), [records]);
  const kept = records.filter(r => (!gaps.length || (r.measures || []).some(c => gaps.includes(c))) && (!people.length || people.includes(r.by)));
  const filtered = gaps.length > 0 || people.length > 0;
  return (
    <div className={styles.wrap}>
      {records.length > 0 && (
        <div className={styles.filters}>
          <FilterChip label="Gap" options={options.gaps} selected={gaps} onChange={setGaps} />
          <FilterChip label="By" searchable options={options.people} selected={people} onChange={setPeople} />
          {filtered && <Link variant="secondary" onClick={() => { setGaps([]); setPeople([]); }}>Clear All</Link>}
        </div>
      )}
      <ActivityLog
        entries={assessmentEntries(kept, { onOpen, onDownload })}
        relaxed
        flushTop
        emptyLabel={filtered ? 'No assessments match these filters.' : 'No assessments logged for these gaps yet.'}
      />
    </div>
  );
}
