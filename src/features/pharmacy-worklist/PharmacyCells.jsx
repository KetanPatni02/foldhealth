import { Badge } from '../../components/Badge/Badge';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { GAP_STATUS_TONE, MEASURE_NAMES, RECON_TONE, URGENT_SUB_STATUSES, daysFromToday, medLabel, pdcTone } from './pharmacyWorklist.utils';
import styles from './PharmacyWorklistRow.module.css';

// The measure code (MAD / MAH / MAC) as a neutral chip with its full name on
// hover. One look for the code everywhere in the worklist and program.
export function MeasureCode({ code }) {
  return (
    <Tooltip label={MEASURE_NAMES[code] || code} placement="bottom">
      <span><Badge size="S" variant="compliance-na" label={code} /></span>
    </Tooltip>
  );
}

export function Dash() {
  return <span className={styles.mutedDash}>—</span>;
}

// The date itself stays neutral; only the countdown turns red, and only
// when the caller says it needs action.
export function DateWithDays({ date, alert = false }) {
  if (!date) return <Dash />;
  const days = daysFromToday(date);
  const rel = days == null ? '' : days < 0 ? `${-days}d overdue` : days === 0 ? 'Today' : `${days}d left`;
  return (
    <span className={styles.stack}>
      <span className={styles.dateText}>{date}</span>
      <span className={`${styles.subText} ${alert ? styles.toneError : ''}`}>{rel}</span>
    </span>
  );
}

// Date alone; red when the caller says it needs action.
export function DateOnly({ date, alert = false }) {
  if (!date) return <Dash />;
  return <span className={`${styles.dateText} ${alert ? styles.toneError : ''}`}>{date}</span>;
}

// A count with the full list in a hover card. `label` adds a noun ("3
// gaps"); without it the column header names what's counted.
function CountWithList({ count, label, children }) {
  if (!count) return <Dash />;
  return (
    <Tooltip label={<span className={styles.hoverList}>{children}</span>} placement="bottom" variant="light" maxWidth={320}>
      <span className={styles.countLink}>{count}{label ? ` ${label}${count === 1 ? '' : 's'}` : ''}</span>
    </Tooltip>
  );
}

// One gap's drug count; hover lists its drugs.
export function DrugsCount({ meds }) {
  return (
    <CountWithList count={meds.length}>
      {meds.map(d => (
        <span key={d.id} className={styles.hoverItem}>
          {medLabel(d)}{d.status === 'Discontinued' ? ' (discontinued)' : ''}
        </span>
      ))}
    </CountWithList>
  );
}

// Count of the member's non-pharmacy care gaps; hover lists them.
export function OtherGapsCount({ gaps }) {
  return (
    <CountWithList count={gaps.length} label="gap">
      {gaps.map(g => (
        <span key={g.code} className={styles.hoverItem}>
          <b>{g.code}</b>{g.name ? ` ${g.name}` : ''} · {g.status}
        </span>
      ))}
    </CountWithList>
  );
}

const PROGRESS_TONE = { Complete: 'success', 'Partially complete': 'primary', 'In progress': 'primary', 'Not started': 'white' };

export function ProgressCell({ progress }) {
  return (
    <span className={styles.stack}>
      <Badge size="S" tone={PROGRESS_TONE[progress.label]} label={progress.label} />
      <span className={styles.subText}>{progress.closed} of {progress.total} gap{progress.total === 1 ? '' : 's'} closed</span>
    </span>
  );
}

// PDC of the row's focus measure, named so it is never ambiguous. Below the
// 80% threshold on an open gap is said in words, not only in color.
// `projectedFrom`: the plan PDC, when `pdc` is projected with a recent fill.
export function PdcValue({ pdc, code, open, projectedFrom }) {
  if (pdc == null) return <span className={styles.subText}>Not sent</span>;
  const below = open && pdcTone(pdc) === 'error';
  const projected = projectedFrom !== undefined;
  const label = (
    <span className={styles.stack}>
      <span className={styles.pdc}>{pdc}%</span>
      {(code || below || projected) && (
        <span className={styles.subText}>
          {[code, projected ? 'Projected' : null].filter(Boolean).join(' · ')}
          {(code || projected) && below ? ' · ' : ''}{below && <span className={styles.toneError}>Below 80%</span>}
        </span>
      )}
    </span>
  );
  return projected
    ? <Tooltip label={`Projected for the year with the recent fill · plan PDC ${projectedFrom == null ? 'not sent' : `${projectedFrom}%`}`} placement="bottom">{label}</Tooltip>
    : label;
}

export function ClaimReconCell({ recon, showCode, followUpTask }) {
  return (
    <span className={styles.stack}>
      <Badge size="S" tone={RECON_TONE[recon.status]} label={showCode ? `${recon.status} · ${recon.code}` : recon.status} />
      {recon.status === 'Claim overdue' ? (
        <Tooltip label={recon.detail} placement="bottom">
          <span className={`${styles.subText} ${styles.toneError}`}>
            {followUpTask ? 'Pharmacy follow-up task created' : 'Follow up with pharmacy'}
          </span>
        </Tooltip>
      ) : (
        <span className={styles.subText}>{recon.detail}</span>
      )}
    </span>
  );
}

// Sub-status line shown under a gap status (second line, like other programs).
export function SubStatus({ label, suffix }) {
  if (!label) return null;
  return (
    <span className={`${styles.subStatus} ${URGENT_SUB_STATUSES.has(label) ? styles.toneError : ''}`}>
      {label}{suffix ? <span className={styles.subSuffix}> · {suffix}</span> : null}
    </span>
  );
}

// Gap status badge with its sub-status on the line below.
export function GapStatus({ status, size = 'S' }) {
  if (!status) return <Dash />;
  return (
    <span className={styles.stack}>
      <Badge size={size} tone={GAP_STATUS_TONE[status.gap]} label={status.gap} />
      <SubStatus label={status.label} />
    </span>
  );
}
