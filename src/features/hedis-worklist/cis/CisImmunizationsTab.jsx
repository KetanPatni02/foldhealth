import { useMemo, useState } from 'react';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { Input } from '../../../components/Input/Input';
import { SearchBar } from '../../../components/SearchBar/SearchBar';
import { Switch } from '../../../components/Switch/Switch';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import { Badge } from '../../../components/Badge/Badge';
import { Link } from '../../../components/Link/Link';
import { DatePickerPopover } from '../../../components/DatePicker/DatePickerPopover';
import { Icon } from '../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../components/Icon/DownChevronIcon';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { InfoBar } from '../../../components/InfoBar/InfoBar';
import { CardSkeleton } from '../../../components/CardSkeleton/CardSkeleton';
import { CIS_ANTIGENS, CIS_ANTIGEN_STATUS, CIS_DOSE_STATUS, CIS_EVALUATION, evaluateCis } from './cisRules';
import { isoToMdy, toIso } from './useCisTracker';
import { CisStatusBadge } from './CisStatus';
import { ANTIGEN_BADGE, DOSE_BADGE, EVALUATION_BADGE, fmtDate } from './cisStatusConfig';
import { VaccineCalendarDialog } from './VaccineCalendarDialog';
import styles from './CisImmunizationsTab.module.css';

// Vaccines grouped by what the care team should do about them (Figma:
// New Care Gap Workflow, node 1444:103523); Action Needed opens by default.
const GROUPS = [
  { key: 'action', label: 'Action Needed', statuses: [CIS_ANTIGEN_STATUS.overdue, CIS_ANTIGEN_STATUS.cannotMeet, CIS_ANTIGEN_STATUS.dueNow] },
  { key: 'soon', label: 'Upcoming', statuses: [CIS_ANTIGEN_STATUS.upcoming] },
  { key: 'later', label: 'Later', statuses: [CIS_ANTIGEN_STATUS.onTrack] },
  { key: 'done', label: 'Met', statuses: [CIS_ANTIGEN_STATUS.met] },
];
const NEEDS_ACTION = GROUPS[0].statuses;

const doseRef = (a, row) => `${a.label} #${row.number}`;

/** The one next step, in the same voice as the Orders tab's Recommended Action. */
function recommendedAction(result) {
  if (result.evaluation === CIS_EVALUATION.compliant) {
    return { done: true, text: 'All 10 vaccines are complete. No doses needed for this measure.' };
  }
  const firstOpen = result.antigens
    .map(a => ({ a, row: a.rows.find(r => r.kind === 'planned') }))
    .filter(x => x.row);
  const now = firstOpen.filter(x => x.row.status === CIS_DOSE_STATUS.overdue || x.row.status === CIS_DOSE_STATUS.dueNow);
  const blocked = result.antigens
    .filter(a => a.status === CIS_ANTIGEN_STATUS.cannotMeet)
    .map(a => ({ a }));
  const parts = [];
  if (now.length) parts.push(`Give now: ${now.map(x => doseRef(x.a, x.row)).join(', ')}.`);
  if (blocked.length) parts.push(`${blocked.map(x => x.a.label).join(', ')} can no longer finish before the 2nd birthday; catch-up doses are still recommended.`);
  if (!now.length && !blocked.length && firstOpen.length) {
    const next = firstOpen.reduce((min, x) => (x.row.nextDue < min ? x.row.nextDue : min), firstOpen[0].row.nextDue);
    const sameDay = firstOpen.filter(x => fmtDate(x.row.nextDue) === fmtDate(next));
    parts.push(`Next visit from ${fmtDate(next)}: ${sameDay.map(x => doseRef(x.a, x.row)).join(', ')}.`);
  }
  return { done: false, text: parts.join(' ') };
}

/**
 * Care Gap drawer: Immunizations tab for CIS-CMB10. Follows the Orders tab:
 * a summary card (DOB, dose-block progress, recommended action) and a
 * Vaccines card grouped by urgency. Doses and notes are recorded in the
 * Vaccine Calendar dialog.
 *
 * @param {object}   props
 * @param {object}   props.member
 * @param {object}   props.gap
 * @param {Array}    props.immunizations   – patient_immunizations rows
 * @param {object}   props.savedNotes      – cis_dose_notes, keyed 'dtap:1'
 * @param {boolean}  props.loading
 * @param {number}   props.measurementYear
 * @param {object}   [props.lastSaved]     – { actor, when }
 * @param {function} props.onSave          – (payload) => Promise<boolean>
 */
export function CisImmunizationsTab({ member, gap, immunizations, savedNotes, loading, measurementYear, lastSaved, onSave }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const result = useMemo(
    () => evaluateCis({ dob: member?.dob, immunizations: immunizations || [], measurementYear }),
    [member?.dob, immunizations, measurementYear],
  );
  // Vaccines that need action are open unless the user closed them; a
  // toggle is remembered per vaccine. (Not seeded at mount: immunizations
  // may still be loading then, when every vaccine looks overdue.)
  const [toggled, setToggled] = useState({});
  const [closedGroups, setClosedGroups] = useState({});
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState([]);
  if (loading) return <CardSkeleton />;

  const isOpen = (a) => toggled[a.key] ?? NEEDS_ACTION.includes(a.status);
  const toggle = (a) => setToggled(t => ({ ...t, [a.key]: !isOpen(a) }));
  const openCalendar = () => setCalendarOpen(true);
  const allOpen = result.antigens.length > 0 && result.antigens.every(isOpen);
  const setAllOpen = (open) => {
    setToggled(Object.fromEntries(result.antigens.map(a => [a.key, open])));
    if (open) setClosedGroups({});
  };
  const query = search.trim().toLowerCase();
  const visible = (a) => (!query || `${a.label} ${a.name}`.toLowerCase().includes(query))
    && (!statusFilter.length || statusFilter.includes(a.status));
  const statusOptions = [...new Set(result.antigens.map(a => a.status))];
  const shownGroups = GROUPS
    .map(group => ({ group, items: result.antigens.filter(a => group.statuses.includes(a.status) && visible(a)) }))
    .filter(g => g.items.length);
  const filterActive = statusFilter.length > 0;

  // Search, filter, expand/collapse all and the calendar, on the first
  // group's title line.
  const listToolbar = (
    <span className={styles.listToolbar}>
      {searchOpen ? (
        <SearchBar
          className={styles.listSearch}
          placeholder="Search vaccines"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onClose={() => { setSearchOpen(false); setSearch(''); }}
        />
      ) : (
        <ActionButton size="S" icon="solar:magnifer-linear" tooltip="Search" onClick={() => setSearchOpen(true)} />
      )}
      <ActionButton
        size="S"
        icon="custom:filter"
        tooltip={filtersOpen ? 'Hide filters' : 'Filter'}
        iconColor={filtersOpen || filterActive ? 'var(--primary-300)' : undefined}
        onClick={() => setFiltersOpen(v => !v)}
      />
      <span className={styles.toolbarDivider} aria-hidden="true" />
      <Link
        role="button"
        tabIndex={0}
        className={styles.calendarLink}
        onClick={openCalendar}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCalendar(); } }}
      >
        <Icon name="solar:calendar-linear" size={14} color="currentColor" />
        Vaccine Calendar
      </Link>
      <span className={styles.toolbarDivider} aria-hidden="true" />
      <Switch checked={allOpen} onChange={setAllOpen} label="Expand all" labelGap={6} />
    </span>
  );
  const listFilters = filtersOpen && (
    <div className={styles.listFilters}>
      <FilterChip size="S" label="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
      {filterActive && (
        <button type="button" className={styles.clearAll} onClick={() => setStatusFilter([])}>
          <Icon name="solar:close-circle-linear" size={14} color="currentColor" />
          Clear All
        </button>
      )}
    </div>
  );

  // Inline edits save straight away, one change per save. The edited
  // vaccine stays open even if the save completes it, so its dose (and
  // note) remain in view.
  const keepOpen = (antigen) => setToggled(t => ({ ...t, [antigen.key]: true }));
  const changeDate = (antigen, row, iso) => {
    keepOpen(antigen);
    const record = CIS_ANTIGENS.find(a => a.key === antigen.key).record;
    if (!row.record) {
      if (!iso) return;
      onSave({ inserts: [{ ...record, dateAdministered: isoToMdy(iso) }], summary: `${antigen.label} dose ${row.number} recorded (${fmtDate(new Date(`${iso}T00:00`))})` });
      return;
    }
    const shared = result.antigens
      .filter(a => a.key !== antigen.key && a.rows.some(r => r.record?.id === row.record.id))
      .map(a => a.label);
    if (!iso) {
      setConfirm({ kind: 'remove', antigen, row, shared });
      return;
    }
    const update = () => onSave({ updates: [{ id: row.record.id, dateAdministered: isoToMdy(iso) }], summary: `${antigen.label} dose ${row.number} date changed to ${fmtDate(new Date(`${iso}T00:00`))}` });
    if (shared.length) setConfirm({ kind: 'shared', antigen, row, shared, run: update });
    else update();
  };
  const saveNote = (antigen, row, text) => onSave({
    notes: [{ antigenKey: antigen.key, doseNumber: row.number, note: text.trim() }],
    summary: `Note ${text.trim() ? 'updated' : 'removed'} on ${antigen.label} dose ${row.number}`,
  });

  const hasDob = !!result.dob;
  // A child outside the measure (aged out, or no DOB) has nothing to track.
  const trackable = hasDob && result.evaluation !== CIS_EVALUATION.notEligible;
  const d = result.doses;
  // The series started with the earliest recorded dose.
  const startedOn = result.antigens
    .flatMap(a => a.rows.filter(r => r.record).map(r => r.record.date))
    .reduce((min, dt) => (!min || dt < min ? dt : min), null);
  const action = trackable ? recommendedAction(result) : null;

  return (
    <div className={styles.tab}>
      {/* 1. Gap summary: dose progress */}
      <section className={styles.summary} aria-label="Care Gap summary">
        {/* Why there is nothing to track (aged out / no DOB). */}
        {!trackable && (
          <div className={styles.notEligible}>
            <CisStatusBadge map={EVALUATION_BADGE} status={result.evaluation} size="M" />
            <p className={styles.reason}>{result.reason}</p>
          </div>
        )}

        {trackable && (
          <div className={styles.doseProgress}>
            {/* Header per the HRCM "Tier History" card: title left,
                label:value facts right, split by hairline dividers. */}
            <div className={styles.doseProgressHead}>
              <span className={styles.doseProgressTitle}>Doses Complete {d.completed}/{d.total}</span>
              <span className={styles.doseFact}>Started: <b>{startedOn ? fmtDate(startedOn) : '—'}</b></span>
              <span className={styles.factDivider} aria-hidden="true" />
              <span className={styles.doseFact}>
                Ends: <b>{fmtDate(result.secondBirthday)}</b>
                {result.daysLeft >= 0 ? ` · ${result.daysLeft} days left` : ' · passed'}
              </span>
              <span className={styles.factDivider} aria-hidden="true" />
              <CisStatusBadge map={EVALUATION_BADGE} status={result.evaluation} />
            </div>
            <DoseBlocks result={result} />
          </div>
        )}
      </section>

      {/* Recommended action sits on its own, between the summary and the list. */}
      {action && (
        <div className={[styles.action, action.done ? styles.actionDone : ''].join(' ')}>
          <Icon name={action.done ? 'solar:check-circle-linear' : 'solar:lightbulb-bolt-linear'} size={18} color="currentColor" />
          <div className={styles.actionText}>
            <span className={styles.actionLabel}>Recommended Action</span>
            <span>{action.text}</span>
          </div>
        </div>
      )}

      {/* 2. Vaccines: flat accordion list (Figma Component 109), grouped by
          urgency. */}
      {trackable && (
        <section className={styles.vaccines} aria-label="Combination 10 vaccines">
          {shownGroups.length === 0 && (
            <>
              <div className={styles.groupLine}><span />{listToolbar}</div>
              {listFilters}
              <p className={styles.empty}>
                <Icon name="solar:info-circle-linear" size={14} color="currentColor" />
                No vaccines match your search or filters.
              </p>
            </>
          )}
          {shownGroups.map(({ group, items }, gi) => {
            return (
              <div key={group.key} className={styles.group} role="group" aria-label={group.label}>
                <div className={styles.groupLine}>
                <button
                  type="button"
                  className={styles.groupHeader}
                  onClick={() => setClosedGroups(g => ({ ...g, [group.key]: !g[group.key] }))}
                  aria-expanded={!closedGroups[group.key]}
                >
                  {group.label} ({items.length})
                  <DownChevronIcon size={16} color="var(--neutral-400)" className={closedGroups[group.key] ? styles.chevronClosed : undefined} />
                </button>
                {gi === 0 && listToolbar}
                </div>
                {gi === 0 && listFilters}
                {!closedGroups[group.key] && (
                <div className={styles.groupBody}>
                <div className={`${styles.vaccineRow} ${styles.colHead}`} aria-hidden="true">
                  <span>Vaccine Name</span>
                  <span>Progress</span>
                  <span>{group.key === 'done' ? 'Completed On' : 'Next Action Due'}</span>
                  <span>Status</span>
                </div>
                {items.map(a => (
                  <VaccineRow
                    key={a.key}
                    antigen={a}
                    open={isOpen(a)}
                    onToggle={() => toggle(a)}
                    notes={savedNotes}
                    onDateChange={changeDate}
                    onNoteSave={saveNote}
                    dob={result.dob}
                  />
                ))}
                </div>
                )}
              </div>
            );
          })}
          {(immunizations || []).length === 0 && (
            <p className={styles.empty}>
              <Icon name="solar:info-circle-linear" size={14} color="currentColor" />
              No immunizations on file yet. Open a vaccine to record its doses.
            </p>
          )}
        </section>
      )}

      {confirm && (
        <ConfirmDialog
          variant="warning"
          title={confirm.kind === 'remove'
            ? `Clear the date for ${confirm.antigen.label} dose ${confirm.row.number}?`
            : `Change a combination vaccine date?`}
          description={confirm.kind === 'remove'
            ? [
              `The dose will show as not given, and its ${fmtDate(confirm.row.record.date)} record is removed from the patient's immunization history.`,
              confirm.shared.length ? `This ${confirm.row.record.title} record also counts for ${confirm.shared.join(', ')}, so their date clears too.` : '',
            ].filter(Boolean).join(' ')
            : `This ${confirm.row.record.title} record also counts for ${confirm.shared.join(', ')}. Their date changes too.`}
          confirmLabel={confirm.kind === 'remove' ? 'Clear date' : 'Change date'}
          onConfirm={() => {
            if (confirm.kind === 'remove') {
              onSave({ deletes: [confirm.row.record.id], summary: `${confirm.antigen.label} dose ${confirm.row.number} date cleared` });
            } else confirm.run();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {calendarOpen && (
        <VaccineCalendarDialog
          member={member}
          gap={gap}
          immunizations={immunizations}
          savedNotes={savedNotes}
          measurementYear={measurementYear}
          lastSaved={lastSaved}
          onSave={onSave}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </div>
  );
}

// The whole Combination 10 series as one block per required dose, laid out
// as a timeline (given date, else the date the dose's window opens). Doses
// not open yet carry a lock. Hover a block for its dose.
const BLOCK_CLASS = {
  [CIS_DOSE_STATUS.completed]: 'blockDone',
  [CIS_DOSE_STATUS.notCounted]: 'blockLate',
  [CIS_DOSE_STATUS.cannotMeet]: 'blockLate',
  [CIS_DOSE_STATUS.overdue]: 'blockLate',
  [CIS_DOSE_STATUS.dueNow]: 'blockDue',
  [CIS_DOSE_STATUS.pending]: 'blockDue',
};
const BLOCK_LEGEND = [
  { label: 'Given', cls: 'blockDone' },
  { label: 'Due now', cls: 'blockDue' },
  { label: 'Overdue / does not count', cls: 'blockLate' },
  { label: 'Upcoming', cls: '' },
];

// Hover card for one block: dose, status, and when it was given or opens.
function BlockDetail({ a, r }) {
  let when;
  if (r.record) when = `Given ${fmtDate(r.record.date)}`;
  else if (r.status === CIS_DOSE_STATUS.overdue) when = `Was due ${fmtDate(r.due)}`;
  else if (isLocked(r)) when = `Opens on ${fmtDate(r.nextDue)} • due by ${fmtDate(r.due)}`;
  else when = `Open now • due by ${fmtDate(r.due)}`;
  return (
    <div className={styles.blockCard}>
      <span className={styles.blockCardTitle}>
        <span className={`${styles.swatch} ${styles[BLOCK_CLASS[r.status]] || ''}`} />
        {a.label} · Dose {r.number}
      </span>
      <span className={styles.blockCardStatus}>{r.status}{r.reason ? ` • ${r.reason}` : ''}</span>
      <span className={styles.blockCardWhen}>{when}</span>
    </div>
  );
}

// A planned dose whose routine window has not opened yet.
const isLocked = (r) => r.kind === 'planned' && r.nextDue && r.nextDue > new Date();
// Timeline position: when it was given, else when its window opens.
const blockDate = (r) => r.record?.date ?? r.nextDue ?? r.start;

function DoseBlocks({ result }) {
  const blocks = result.antigens
    .flatMap(a => a.rows.filter(r => !r.extra).slice(0, a.required).map(r => ({ a, r })))
    .sort((x, y) => blockDate(x.r) - blockDate(y.r));
  return (
    <div className={styles.blocksWrap}>
      <div className={styles.blocks} role="list" aria-label={`${result.doses.completed} of ${result.doses.total} doses complete`}>
        {blocks.map(({ a, r }, i) => (
          <Tooltip
            key={`${a.key}-${r.number}`}
            variant="light"
            placement="top"
            // Anchor the card inward at the ends so it never clips the drawer.
            align={i < blocks.length / 3 ? 'left' : i >= (blocks.length * 2) / 3 ? 'right' : 'center'}
            maxWidth={280}
            label={<BlockDetail a={a} r={r} />}
            className={styles.blockTip}
          >
            <span
              role="listitem"
              tabIndex={0}
              aria-label={`${a.label} dose ${r.number}: ${isLocked(r) ? `opens ${fmtDate(r.nextDue)}` : r.status}`}
              className={`${styles.block} ${styles[BLOCK_CLASS[r.status]] || ''}`}
            >
              {isLocked(r) && <Icon name="solar:lock-keyhole-minimalistic-linear" size={10} color="var(--placeholder-text)" />}
            </span>
          </Tooltip>
        ))}
      </div>
      <div className={styles.legend} aria-hidden="true">
        {BLOCK_LEGEND.map(l => (
          <span key={l.label} className={styles.legendItem}>
            <span className={`${styles.swatch} ${l.cls ? styles[l.cls] : ''}`} />
            {l.label}
          </span>
        ))}
        <span className={styles.legendItem}>
          <Icon name="solar:lock-keyhole-minimalistic-linear" size={10} color="var(--placeholder-text)" />
          Not open yet
        </span>
      </div>
    </div>
  );
}

// One pip per required dose (Figma): green = counted; the next dose is a
// red / yellow ring when overdue / due now, else solid grey; hollow = later.
function DosePips({ antigen }) {
  const counted = Math.min(antigen.valid.length, antigen.required);
  const next = antigen.rows.find(r => r.kind === 'planned');
  const urgent = next && [CIS_DOSE_STATUS.dueNow, CIS_DOSE_STATUS.overdue, CIS_DOSE_STATUS.cannotMeet].includes(next.status);
  return (
    <span className={styles.pips} aria-label={`${counted} of ${antigen.required} doses`}>
      {Array.from({ length: antigen.required }, (_, i) => (
        <span
          key={i}
          className={[
            styles.pip,
            i < counted ? styles.pipDone : '',
            i === counted && next ? (urgent ? (next.status === CIS_DOSE_STATUS.dueNow ? styles.pipDue : styles.pipLate) : styles.pipNext) : '',
          ].join(' ')}
        />
      ))}
    </span>
  );
}

// Hover card on a vaccine's progress: every dose with its date and status.
function DoseList({ antigen }) {
  return (
    <div className={styles.doseList}>
      <span className={styles.doseListTitle}>{antigen.label} · {antigen.name}</span>
      {antigen.rows.map(r => (
        <div key={r.number} className={styles.doseListRow}>
          <span className={styles.doseListDose}>Dose {r.number}</span>
          <span className={styles.doseListDate}>
            {r.record ? fmtDate(r.record.date) : r.kind === 'planned' ? `From ${fmtDate(r.nextDue)}` : 'Not given'}
          </span>
          <CisStatusBadge map={DOSE_BADGE} status={r.status} />
        </div>
      ))}
    </div>
  );
}

// Collapsed: name, dose dots, next step, status. Expanded: one row per
// dose with its recommended age, earliest allowed date, an editable given
// date, status and note (Figma: New Care Gap Workflow, Component 109).
function VaccineRow({ antigen, open, onToggle, notes, onDateChange, onNoteSave, dob }) {
  const counted = Math.min(antigen.valid.length, antigen.required);
  const next = antigen.rows.find(r => r.kind === 'planned');
  let when;
  // Met rows sit under a "Completed On" column: just the date the series
  // was completed (the dose that met the requirement).
  if (antigen.status === CIS_ANTIGEN_STATUS.met) when = fmtDate(antigen.valid[antigen.required - 1]?.date);
  // The Can't Meet badge carries the "too late" message; this column
  // names the next dose, like every other row.
  else if (antigen.status === CIS_ANTIGEN_STATUS.cannotMeet && !next) {
    // Nothing left to give: the missing dose was given but does not count.
    const late = antigen.rows.find(r => r.status === CIS_DOSE_STATUS.notCounted);
    when = `Dose ${late?.number} does not count`;
  } else if (antigen.status === CIS_ANTIGEN_STATUS.cannotMeet) {
    when = next?.status === CIS_DOSE_STATUS.overdue
      ? `Dose ${next.number} overdue`
      : next && new Date() >= next.nextDue ? `Dose ${next.number} due now` : `Dose ${next?.number} from ${fmtDate(next?.nextDue)}`;
  }
  else if (antigen.status === CIS_ANTIGEN_STATUS.overdue) when = `Dose ${next?.number} was due ${fmtDate(next?.due)}`;
  else if (antigen.status === CIS_ANTIGEN_STATUS.dueNow) when = `Dose ${next?.number} due now`;
  else when = `Dose ${next?.number} from ${fmtDate(next?.nextDue)}`;
  const panelId = `cis-doses-${antigen.key}`;
  return (
    <div className={styles.vaccine}>
      <button
        type="button"
        className={styles.vaccineRow}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className={styles.vaccineName}>
          <DownChevronIcon size={16} color="var(--neutral-400)" className={open ? undefined : styles.chevronClosed} />
          <span className={styles.vaccineLabel}>{antigen.label}</span>
        </span>
        <span className={styles.progressCell}>
          <Tooltip variant="light" placement="bottom" align="start" maxWidth={300} label={<DoseList antigen={antigen} />}>
            <span className={styles.progress} aria-label={`${counted} of ${antigen.required} doses`}>
              <span className={styles.progressText}>{counted}/{antigen.required}</span>
              <DosePips antigen={antigen} />
            </span>
          </Tooltip>
        </span>
        <span className={styles.when} title={when}>{when}</span>
        {/* Own cell, so the column padding insets the badge instead of
            padding the badge itself (keeps it under the Status title). */}
        <span className={styles.statusCell}>
          <CisStatusBadge map={ANTIGEN_BADGE} status={antigen.status} size="M" />
        </span>
      </button>
      {open && (
        <div id={panelId} className={styles.doseTable} role="table" aria-label={`${antigen.label} doses`}>
          <div className={`${styles.doseRow} ${styles.doseHead}`} role="row">
            <span role="columnheader">Doses (Recommended Age)</span>
            <span role="columnheader">Earliest Allowed</span>
            <span role="columnheader">Given Date</span>
            <span role="columnheader">Status</span>
            <span role="columnheader" className={styles.noteHead}>Note</span>
          </div>
          {antigen.rows.map(row => (
            <DoseRow
              key={row.number}
              antigen={antigen}
              row={row}
              note={notes?.[`${antigen.key}:${row.number}`]?.note || ''}
              onDateChange={onDateChange}
              onNoteSave={onNoteSave}
              dob={dob}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DoseRow({ antigen, row, note, onDateChange, onNoteSave, dob }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [pickerRect, setPickerRect] = useState(null);
  const [draft, setDraft] = useState(note);
  const range = row.recommendedEnd ? `${fmtDate(row.start)} - ${fmtDate(row.recommendedEnd)}` : fmtDate(row.start);
  const notCounted = row.status === CIS_DOSE_STATUS.notCounted;
  return (
    <div className={notCounted ? styles.doseItemError : undefined}>
      <div className={styles.doseRow} role="row">
        <span role="cell" className={styles.doseCol}>
          <span className={styles.doseName}>
            Dose {row.number} <span className={styles.doseAge}>({row.recommendedShort})</span>
          </span>
          <span className={styles.doseRange}>{range}</span>
        </span>
        <span role="cell" className={styles.doseValue}>{fmtDate(row.earliest)}</span>
        <span role="cell" className={styles.dateCell}>
          {isLocked(row) ? (
            // Window not open yet: the date can't be entered until it opens.
            <Tooltip label={`Opens on ${fmtDate(row.nextDue)}`} variant="light">
              <span
                className={styles.dateLocked}
                aria-disabled="true"
                aria-label={`${antigen.label} dose ${row.number} given date: opens ${fmtDate(row.nextDue)}`}
              >
                <Badge tone="disabled" size="M" icon="solar:lock-keyhole-minimalistic-linear" label="Select Date" />
              </span>
            </Tooltip>
          ) : (
          <button
            type="button"
            className={styles.dateTrigger}
            onClick={(e) => setPickerRect(e.currentTarget.getBoundingClientRect())}
            aria-haspopup="dialog"
            aria-label={`${antigen.label} dose ${row.number} given date: ${row.record ? fmtDate(row.record.date) : 'not given'}`}
          >
            <Badge
              tone="white"
              size="M"
              label={row.record ? fmtDate(row.record.date) : 'Select Date'}
              className={row.record ? undefined : styles.datePlaceholder}
            />
          </button>
          )}
          {pickerRect && (
            <DatePickerPopover
              open
              value={row.record ? toIso(row.record.date) : ''}
              anchorRect={pickerRect}
              min={toIso(dob)}
              max={toIso(new Date())}
              onChange={(iso) => { setPickerRect(null); onDateChange(antigen, row, iso); }}
              onClose={() => setPickerRect(null)}
              footer={row.record ? (
                <div className={styles.pickerFooter}>
                  <Button
                    variant="secondary"
                    size="S"
                    onClick={() => { setPickerRect(null); onDateChange(antigen, row, ''); }}
                  >
                    Clear date
                  </Button>
                </div>
              ) : null}
            />
          )}
        </span>
        <span role="cell">
          <CisStatusBadge map={DOSE_BADGE} status={row.status} size="M" hideIcon />

        </span>
        <span role="cell" className={styles.noteCol}>
          <ActionButton
            icon="solar:chat-round-line-linear"
            size="S"
            tooltip={note ? note : 'Add a note'}
            tooltipLeft
            dot={!!note}
            onClick={() => { setDraft(note); setNoteOpen(o => !o); }}
          />
        </span>
      </div>
      {noteOpen && (
        <div className={styles.noteEditor}>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Note for ${antigen.label} dose ${row.number}`}
            aria-label={`${antigen.label} dose ${row.number} note`}
            autoFocus
          />
          <Button variant="secondary" size="S" onClick={() => setNoteOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            size="S"
            disabled={draft.trim() === note}
            onClick={() => { onNoteSave(antigen, row, draft); setNoteOpen(false); }}
          >
            Save
          </Button>
        </div>
      )}
      {notCounted && row.reason && (
        <div className={styles.doseError}>
          <InfoBar tone="error" variant="inline" icon="solar:danger-triangle-linear" className={styles.doseErrorBar}>
            Does Not Count: {row.reason}.
          </InfoBar>
        </div>
      )}
    </div>
  );
}
