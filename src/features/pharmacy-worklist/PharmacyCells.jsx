import { Badge } from '../../components/Badge/Badge';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { GAP_STATUS_TONE, MEASURE_NAMES, MEASURE_STATUS_TONE, RECON_TONE, daysFromToday, pdcTone } from './pharmacyWorklist.utils';
import styles from './PharmacyWorklistRow.module.css';

const TONE_CLASS = { error: styles.toneError, warning: styles.toneWarning, success: styles.toneSuccess };

export function Dash() {
  return <span className={styles.mutedDash}>—</span>;
}

export function DateWithDays({ date, tone }) {
  if (!date) return <Dash />;
  const days = daysFromToday(date);
  const rel = days == null ? '' : days < 0 ? `${-days}d overdue` : days === 0 ? 'Today' : `${days}d left`;
  return (
    <span className={styles.stack}>
      <span className={`${styles.dateText} ${TONE_CLASS[tone] || ''}`}>{date}</span>
      <span className={`${styles.subText} ${TONE_CLASS[tone] || ''}`}>{rel}</span>
    </span>
  );
}

// One chip per open measure, colored by that measure's own gap status
// (closure is per measure, so MAD can be Safe while MAC is At risk).
export function MeasureChips({ codes, statuses }) {
  if (!codes?.length) return <Dash />;
  return (
    <span className={styles.chips}>
      {codes.map(c => {
        const st = statuses?.[c];
        return (
          <Tooltip key={c} label={st ? `${MEASURE_NAMES[c]} · ${st.gap} — ${st.label}: ${st.detail}` : MEASURE_NAMES[c]} placement="bottom">
            <Badge size="S" tone={st ? GAP_STATUS_TONE[st.gap] : 'primary'} dot={!!st} label={c} />
          </Tooltip>
        );
      })}
    </span>
  );
}

export function PdcValue({ pdc }) {
  if (pdc == null) return <span className={styles.subText}>Not sent</span>;
  return <span className={`${styles.pdc} ${TONE_CLASS[pdcTone(pdc)] || ''}`}>{pdc}%</span>;
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
    <span className={styles.subStatus}>
      <span className={`${styles.subDot} ${styles[`subDot_${MEASURE_STATUS_TONE[label] || 'grey'}`]}`} />
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
