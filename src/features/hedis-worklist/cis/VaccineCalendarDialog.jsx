import { Fragment, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../components/ShadcnDialog/ShadcnDialog';
import { Badge } from '../../../components/Badge/Badge';
import { Button } from '../../../components/Button/Button';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { CloseButton } from '../../../components/CloseButton/CloseButton';
import { Icon } from '../../../components/Icon/Icon';
import { Input } from '../../../components/Input/Input';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import { Tooltip } from '../../../components/Tooltip/Tooltip';
import { ConfirmDialog } from '../../../components/ConfirmDialog/ConfirmDialog';
import { CIS_ANTIGEN_STATUS, CIS_DOSE_STATUS, CIS_CODE } from './cisRules';
import { useCisTracker, toIso } from './useCisTracker';
import { CisStatusBadge, CisSummaryStrip } from './CisStatus';
import { DOSE_BADGE, fmtDate } from './cisStatusConfig';
import styles from './VaccineCalendarDialog.module.css';

// Rows that need action get an accent bar down the dose column.
const ACCENT = {
  [CIS_DOSE_STATUS.dueNow]: styles.accentWarning,
  [CIS_DOSE_STATUS.pending]: styles.accentWarning,
  [CIS_DOSE_STATUS.overdue]: styles.accentError,
  [CIS_DOSE_STATUS.cannotMeet]: styles.accentError,
};
const STATUS_ORDER = Object.values(CIS_DOSE_STATUS);
const URGENCY = [
  CIS_ANTIGEN_STATUS.overdue,
  CIS_ANTIGEN_STATUS.cannotMeet,
  CIS_ANTIGEN_STATUS.dueNow,
  CIS_ANTIGEN_STATUS.upcoming,
  CIS_ANTIGEN_STATUS.onTrack,
  CIS_ANTIGEN_STATUS.met,
];

const ageLabel = (months) => `${Math.floor(months / 12)}Y ${months % 12}M`;
const fmtSaved = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return { date: fmtDate(d), time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) };
};

/**
 * Vaccine Calendar for a CIS-CMB10 gap: every dose of the ten Combination
 * 10 vaccines in one table (recommended age and window, earliest allowed
 * date, date given, status, note). Date given and note are edited inline
 * in every row; a planned dose becomes a recorded one once dated. Nothing
 * is written until Save.
 *
 * @param {object}   props
 * @param {object}   props.member
 * @param {object}   props.gap             – the CIS-CMB10 gap ({ status })
 * @param {Array}    props.immunizations   – patient_immunizations rows
 * @param {object}   props.savedNotes      – { 'dtap:1': { note } }
 * @param {number}   props.measurementYear
 * @param {object}   [props.lastSaved]     – { actor, when }
 * @param {function} props.onSave          – (payload) => Promise<boolean>
 * @param {function} props.onClose
 */
export function VaccineCalendarDialog({ member, gap, immunizations, savedNotes, measurementYear, lastSaved, onSave, onClose }) {
  const tracker = useCisTracker({ immunizations, savedNotes, measurementYear, dob: member?.dob });
  const { result } = tracker;
  const [statusFilter, setStatusFilter] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const statusOptions = useMemo(() => {
    const present = new Set(result.antigens.flatMap(a => a.rows.map(r => r.status)));
    return STATUS_ORDER.filter(s => present.has(s));
  }, [result]);
  // Same order as the Immunizations tab: vaccines needing action first,
  // complete ones last. Fixed when the dialog opens so rows don't jump
  // under the cursor while a date is being entered.
  const [order] = useState(() => [...result.antigens]
    .sort((x, y) => URGENCY.indexOf(x.status) - URGENCY.indexOf(y.status))
    .map(a => a.key));
  const groups = order
    .map(key => result.antigens.find(a => a.key === key))
    .map(a => ({ antigen: a, rows: statusFilter.length ? a.rows.filter(r => statusFilter.includes(r.status)) : a.rows }))
    .filter(g => g.rows.length > 0);
  const totalDoses = result.antigens.reduce((n, a) => n + a.rows.length, 0);
  const shownDoses = groups.reduce((n, g) => n + g.rows.length, 0);

  const requestClose = () => (tracker.dirty ? setConfirmDiscard(true) : onClose());
  const save = async () => {
    setSaving(true);
    const ok = await onSave(tracker.buildSave());
    setSaving(false);
    if (ok) tracker.discard();
  };
  const clearDate = (antigen, row) => {
    const target = tracker.removalFor(antigen.key, row);
    if (!target) return;
    if (target.existing) setConfirmRemove({ ...target, antigen });
    else tracker.removeDose(target);
  };

  const saved = lastSaved ? fmtSaved(lastSaved.when) : null;
  const gender = member?.gender === 'F' ? 'Female' : member?.gender === 'M' ? 'Male' : member?.gender;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}>
      <DialogContent
        hideClose
        className={styles.content}
        overlayClassName="z-[7999]"
        style={{ zIndex: 8000 }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => { if (tracker.dirty) { e.preventDefault(); setConfirmDiscard(true); } }}
      >
        <header className={styles.header}>
          <div className={styles.titleCol}>
            <div className={styles.titleRow}>
              <DialogTitle className={styles.title}>Vaccine Calendar</DialogTitle>
              <Badge tone="grey" size="M" label={gap?.status || 'Open'} />
            </div>
            <DialogDescription className={styles.subtitle}>
              {[member?.name, gender, result.dob ? ageLabel(result.ageMonths) : null, result.dob ? `DOB ${fmtDate(result.dob)}` : null, CIS_CODE]
                .filter(Boolean).join(' · ')}
            </DialogDescription>
          </div>
          <span className={styles.lastSaved}>
            <Icon name="solar:history-linear" size={16} color="var(--neutral-300)" />
            {saved
              ? <>Last saved by <strong>{lastSaved.actor}</strong> on <strong>{saved.date}</strong> at <strong>{saved.time}</strong></>
              : 'Not saved yet'}
          </span>
          <span className={styles.headerDivider} />
          <CloseButton onClick={requestClose} />
        </header>

        <div className={styles.body}>
          <CisSummaryStrip result={result} />

          <div className={styles.toolbar}>
            <span className={styles.toolbarCount}>
              {statusFilter.length ? `${shownDoses} of ${totalDoses} doses` : `${totalDoses} doses across ${result.antigens.length} vaccines`}
            </span>
            <FilterChip size="S" label="Status" options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.colVaccine}>Vaccine</th>
                  <th className={styles.colDose}>Dose</th>
                  <th className={styles.colRecommended}>Recommended Age</th>
                  <th className={styles.colEarliest}>
                    <span className={styles.thHint}>
                      Earliest Allowed
                      <Tooltip label="Earliest date this dose can be given and still be valid (minimum age and spacing).">
                        <Icon name="solar:info-circle-linear" size={12} color="var(--neutral-300)" />
                      </Tooltip>
                    </span>
                  </th>
                  <th className={styles.colDate}>Date Given</th>
                  <th className={styles.colStatus}>Status</th>
                  <th className={styles.colNotes}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(({ antigen, rows }) => (
                  <Fragment key={antigen.key}>
                    {rows.map((row, i) => {
                      const key = `${antigen.key}:${row.number}`;
                      const note = tracker.noteFor(antigen.key, row.number);
                      return (
                        <tr key={key} className={i === 0 ? styles.groupStart : undefined}>
                          {i === 0 && (
                            <td rowSpan={rows.length} className={styles.vaccineCell}>
                              <span className={styles.vaccineName}>
                                {antigen.status !== CIS_ANTIGEN_STATUS.met && <span className={styles.dot} aria-label="Incomplete" />}
                                {antigen.label}
                              </span>
                              <span className={styles.vaccineMeta}>
                                {antigen.measureCode} · {Math.min(antigen.valid.length, antigen.required)} of {antigen.requiredLabel}
                              </span>
                            </td>
                          )}
                          <td className={`${styles.doseCell} ${ACCENT[row.status] || ''}`}>
                            Dose {row.number}
                            {row.extra && <span className={styles.subtle}>Extra</span>}
                          </td>
                          <td>
                            <span className={styles.primary}>{row.recommended}</span>
                            <span className={styles.subtle}>
                              {fmtDate(row.start)}{row.recommendedEnd ? ` – ${fmtDate(row.recommendedEnd)}` : ''}
                            </span>
                          </td>
                          <td><span className={styles.primary}>{fmtDate(row.earliest)}</span></td>
                          <td>
                            <span className={styles.editDate}>
                              <Input
                                type="date"
                                variant="quiet"
                                value={row.record ? toIso(row.record.date) : ''}
                                onChange={(e) => tracker.setDoseDate(antigen.key, row, e.target.value)}
                                min={toIso(result.dob)}
                                max={toIso(new Date())}
                                placeholder="Add date"
                                aria-label={`${antigen.label} dose ${row.number} date given`}
                              />
                              {row.record && (
                                <span className={styles.removeBtn}>
                                  <ActionButton icon="solar:trash-bin-minimalistic-linear" size="S" tooltip="Remove this dose" onClick={() => clearDate(antigen, row)} />
                                </span>
                              )}
                            </span>
                            {row.record && <RecordHint antigenKey={antigen.key} row={row} result={result} />}
                          </td>
                          <td>
                            <CisStatusBadge map={DOSE_BADGE} status={row.status} />
                            {row.reason && <span className={styles.reasonText}>{row.reason}</span>}
                          </td>
                          <td className={styles.noteCell}>
                            <Input
                              variant="quiet"
                              value={note}
                              onChange={(e) => tracker.setNote(antigen.key, row.number, e.target.value)}
                              placeholder="Add a note"
                              aria-label={`${antigen.label} dose ${row.number} note`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {groups.length === 0 && <p className={styles.empty}>No doses match this status.</p>}
          </div>
        </div>

        <footer className={styles.footer}>
          {tracker.dirty && <span className={styles.unsaved}>Unsaved changes</span>}
          <Button variant="secondary" onClick={requestClose}>Cancel</Button>
          <Button variant="primary" disabled={!tracker.dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button>
        </footer>

        {confirmRemove && (
          <ConfirmDialog
            variant="warning"
            title={`Remove ${confirmRemove.antigen.label} dose ${confirmRemove.row.number}?`}
            description={[
              `The dose given ${fmtDate(confirmRemove.row.record.date)} will be removed from the patient's immunization history when you save.`,
              confirmRemove.shared.length ? `This ${confirmRemove.row.record.title} record also counts for ${confirmRemove.shared.join(', ')}, so it is removed there too.` : '',
            ].filter(Boolean).join(' ')}
            confirmLabel="Remove"
            onConfirm={() => { tracker.removeDose(confirmRemove); setConfirmRemove(null); }}
            onCancel={() => setConfirmRemove(null)}
          />
        )}
        {confirmDiscard && (
          <ConfirmDialog
            variant="warning"
            title="Discard unsaved changes?"
            description="Dates and notes you changed in the Vaccine Calendar will be lost."
            confirmLabel="Discard"
            onConfirm={() => { setConfirmDiscard(false); tracker.discard(); onClose(); }}
            onCancel={() => setConfirmDiscard(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Combination shots name the other vaccines the same record counts for.
function RecordHint({ antigenKey, row, result }) {
  const covers = result.antigens
    .filter(a => a.key !== antigenKey && a.rows.some(r => r.record?.id === row.record.id))
    .map(a => a.label);
  if (!covers.length) return null;
  const brand = String(row.record.title || '').replace(/\s*\(.*\)\s*$/, '');
  return (
    <Tooltip label={`${row.record.title} is a combination vaccine. This record also counts for ${covers.join(', ')}.`}>
      <span className={styles.combo}>{brand} · also {covers.join(', ')}</span>
    </Tooltip>
  );
}
