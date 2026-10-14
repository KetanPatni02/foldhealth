import { Badge } from '../../components/Badge/Badge';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { GAP_STATUS_TONE, MEASURE_NAMES, RECON_TONE, URGENT_SUB_STATUSES, daysFromToday, pdcTone } from './pharmacyWorklist.utils';
import styles from './PharmacyWorklistRow.module.css';

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

// One neutral chip per measure; each measure's own status (closure is per
// measure) is in the tooltip and in the Program view.
export function MeasureChips({ codes, statuses }) {
  if (!codes?.length) return <Dash />;
  return (
    <span className={styles.chips}>
      {codes.map(c => {
        const st = statuses?.[c];
        return (
          <Tooltip key={c} label={st ? `${MEASURE_NAMES[c]}: ${st.gap}, ${st.label}. ${st.detail}` : MEASURE_NAMES[c]} placement="bottom">
            <Badge size="S" tone="white" label={c} />
          </Tooltip>
        );
      })}
    </span>
  );
}

// PDC of the row's focus measure, named so it is never ambiguous. Below the
// 80% threshold on an open gap is said in words, not only in color.
export function PdcValue({ pdc, code, open }) {
  if (pdc == null) return <span className={styles.subText}>Not sent</span>;
  const below = open && pdcTone(pdc) === 'error';
  return (
    <span className={styles.stack}>
      <span className={styles.pdc}>{pdc}%</span>
      {(code || below) && (
        <span className={styles.subText}>
          {code}{code && below ? ' · ' : ''}{below && <span className={styles.toneError}>Below 80%</span>}
        </span>
      )}
    </span>
  );
}

export function ClaimReconCell({ recon, showCode }) {
  return (
    <span className={styles.stack}>
      <Badge size="S" tone={RECON_TONE[recon.status]} label={showCode ? `${recon.status} · ${recon.code}` : recon.status} />
      <span className={styles.subText}>{recon.detail}</span>
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
