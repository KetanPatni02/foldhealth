import { Badge } from '../../components/Badge/Badge';
import { Tooltip } from '../../components/Tooltip/Tooltip';
import { HoverCard } from '../../components/HoverCard/HoverCard';
import { DATA_SOURCE_HINT, GAP_STATUS_TONE, MEASURE_NAMES, RECON_TONE, URGENT_SUB_STATUSES, daysFromToday, medLabel, pdcTone } from './pharmacyWorklist.utils';
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

// Where a number comes from (Plan, Calculated, Projected), on hover.
export function SourceTag({ source }) {
  if (!source) return null;
  return (
    <Tooltip label={DATA_SOURCE_HINT[source]} placement="bottom">
      <span className={`${styles.sourceTag} ${source === 'Projected' ? styles.sourceProjected : ''}`}>{source}</span>
    </Tooltip>
  );
}

// Date alone; red when the caller says it needs action. `source` adds the
// Plan / Calculated / Projected tag below; `hint` explains the date.
export function DateOnly({ date, alert = false, source, hint }) {
  if (!date) return <Dash />;
  const text = <span className={`${styles.dateText} ${alert ? styles.toneError : ''}`}>{date}</span>;
  return (
    <span className={styles.stack}>
      {hint ? <Tooltip label={hint} placement="bottom">{text}</Tooltip> : text}
      <SourceTag source={source} />
    </span>
  );
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

// Count of the member's open non-pharmacy care gaps. The hover card lists
// them; each one opens its Care Gap Details when the member has a HEDIS row.
export function OpenCareGaps({ gaps, onOpen }) {
  if (!gaps.length) return <Dash />;
  return (
    <HoverCard
      ariaLabel="Open care gaps"
      trigger={<span className={styles.countLink}>{gaps.length} gap{gaps.length === 1 ? '' : 's'}</span>}
    >
      {(close) => (
        <span className={styles.gapLinks}>
          {gaps.map(g => (g.hedisMemberId ? (
            <button
              key={g.code}
              type="button"
              className={styles.gapLink}
              onClick={() => { close(); onOpen?.(g.hedisMemberId, g.code); }}
            >
              <b>{g.code}</b>
              <span className={styles.gapLinkName}>{g.name || g.code}</span>
              <span className={styles.gapLinkStatus}>{g.status}</span>
            </button>
          ) : (
            <span key={g.code} className={styles.gapLinkStatic}>
              <b>{g.code}</b>
              <span className={styles.gapLinkName}>{g.name || g.code}</span>
              <span className={styles.gapLinkStatus}>{g.status}</span>
            </span>
          )))}
        </span>
      )}
    </HoverCard>
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

// Separator between parts of one line (year • PDC, source • Below 80%).
function Sep() {
  return <span className={styles.sep} aria-hidden="true">•</span>;
}

// What a projected PDC rests on: the latest fill confirmed in Fold.
function projectedHint(medications) {
  const fill = (medications || [])
    .filter(d => d.status !== 'Discontinued' && d.recentFill)
    .map(d => ({ date: d.recentFill, how: d.recentFillSource?.outcome }))
    .sort((x, y) => new Date(y.date) - new Date(x.date))[0];
  if (!fill) return 'Projected from a fill confirmed in Fold, pending a matching claim';
  return `Projected from the fill confirmed on ${fill.date}${fill.how ? ` (${fill.how})` : ''}, pending a matching claim`;
}

// PDC of the gap: the number alone. Projected (a fill confirmed in Fold, no
// claim yet) is underlined with its evidence on hover and never red; a
// confirmed PDC below 80% on an open gap is red and underlined, so the
// threshold is said on hover and not only in color.
export function PdcValue({ pdc, open, source, medications }) {
  if (pdc == null) return <span className={styles.subText}>Not sent</span>;
  if (source === 'Projected') {
    return (
      <Tooltip label={projectedHint(medications)} placement="bottom">
        <span className={`${styles.pdc} ${styles.pdcProjected}`}>{pdc}%</span>
      </Tooltip>
    );
  }
  if (open && pdcTone(pdc) === 'error') {
    return (
      <Tooltip label="Below the 80% PDC target" placement="bottom">
        <span className={`${styles.pdc} ${styles.pdcBelow}`}>{pdc}%</span>
      </Tooltip>
    );
  }
  return <span className={styles.pdc}>{pdc}%</span>;
}

// Claim match for the gap's confirmed fills. "Claim not matched" is a rework
// flag: it opens that drug's claim history next to outreach logging.
export function ClaimReconCell({ recon, showCode, followUpTask, onRework }) {
  const flagged = recon.status === 'Claim not matched';
  return (
    <span className={styles.stack}>
      <Badge size="S" tone={RECON_TONE[recon.status]} label={showCode ? `${recon.status} · ${recon.code}` : recon.status} />
      {flagged ? (
        <Tooltip label={recon.detail} placement="bottom">
          <button type="button" className={styles.reworkLink} onClick={onRework}>
            {followUpTask ? 'Rework task created · open claims' : 'Rework: open claims'}
          </button>
        </Tooltip>
      ) : (
        <Tooltip label={recon.detail} placement="bottom">
          <span className={`${styles.subText} ${styles.reconDetail}`}>{recon.detail}</span>
        </Tooltip>
      )}
    </span>
  );
}

// Prior-year PDC per year when the plan sends it; Yes / No (non-compliant)
// otherwise.
export function PriorYearPdc({ years, nonCompliant }) {
  if (!years?.length) return <span className={styles.cellText}>{nonCompliant ? 'Non-compliant' : 'Compliant'}</span>;
  return (
    <span className={styles.stack}>
      {years.map(y => (
        <span key={y.year} className={styles.cellText}>
          <span className={styles.subText}>{y.year}</span>
          <Sep />
          <span className={pdcTone(y.pdc) === 'error' ? styles.toneError : ''}>{y.pdc}%</span>
        </span>
      ))}
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
