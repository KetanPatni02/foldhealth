import { useMemo, useState } from 'react';
import { ActivityLog } from '../../../components/ActivityLog/ActivityLog';
import { Badge } from '../../../components/Badge/Badge';
import { Select } from '../../../components/Select/Select';
import { Button } from '../../../components/Button/Button';
import {
  MODE_ICON, groupByMonth, sequenceLabels, structuredSummary, recipientLabel, measureYearOf,
} from './outreachModel';
import styles from './PatientOutreach.module.css';

const CATEGORY_TONE = { Successful: 'success', Unsuccessful: 'danger', Note: 'warning' };

/**
 * The patient's outreach history: month groups (collapsible, newest first)
 * for one measure year at a time, current year by default. Every entry
 * shows its structured summary; saved entries are read-only, with a
 * correction Note instead of edit.
 *
 * @param {object[]} props.entries
 * @param {(entry: object) => void} [props.onCorrect] – omitted for view-only roles
 */
export function PatientOutreachHistory({ entries, onCorrect, onOpenRecord }) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const set = new Set(entries.map(measureYearOf).filter(Boolean));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [entries, currentYear]);
  const [year, setYear] = useState(String(currentYear));

  // Sequence counts the patient's whole history, not just the year shown.
  const sequence = useMemo(() => sequenceLabels(entries), [entries]);
  const byId = useMemo(() => Object.fromEntries(entries.map(e => [e.id, e])), [entries]);
  const shown = useMemo(() => entries.filter(e => String(measureYearOf(e)) === year), [entries, year]);

  const logEntries = groupByMonth(shown).flatMap(g => [
    { t: 'group', label: g.label },
    ...g.entries.map(e => ({
      id: e.id,
      t: 'outreach',
      icon: MODE_ICON[e.mode] || 'solar:document-text-linear',
      render: () => <OutreachEntry entry={e} sequence={sequence[e.id]} corrects={byId[e.correctsId]} onCorrect={onCorrect} onOpenRecord={onOpenRecord} />,
    })),
  ]);

  return (
    <div className={styles.history}>
      <div className={styles.historyHeader}>
        <span className={styles.historyTitle}>Outreach History</span>
        <div className={styles.yearSelect}>
          <Select
            size="sm"
            aria-label="Measure year"
            options={years.map(y => ({ value: String(y), label: `Measure Year ${y}` }))}
            value={year}
            onValueChange={setYear}
          />
        </div>
      </div>
      <ActivityLog entries={logEntries} emptyLabel={`No outreach logged in ${year}.`} flushTop />
    </div>
  );
}

// The AI call summary and patient actions, each mentioned record linked or
// marked "Not matched to a record". Pending while it is written; a failed
// summary leaves the entry with its structured summary only.
function AiSummary({ entry, onOpenRecord }) {
  const [open, setOpen] = useState(false);
  if (entry.aiStatus === 'pending') {
    return <div className={styles.aiState}>Generating summary…</div>;
  }
  if (entry.aiStatus === 'unavailable') {
    return <div className={styles.aiState}>Summary unavailable</div>;
  }
  if (entry.aiStatus !== 'ready') return null;
  const actions = entry.aiPatientActions || [];
  return (
    <div className={styles.ai}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        {open ? 'Hide AI Summary' : 'AI Summary'}
      </Button>
      {open && (
        <div className={styles.aiBody}>
          <div className={styles.fieldLabel}>Call Summary</div>
          <p className={styles.aiText}>{entry.aiCallSummary || 'No summary.'}</p>
          <div className={styles.fieldLabel}>Patient Actions</div>
          {actions.length === 0 ? (
            <p className={styles.aiText}>No patient-specific actions discussed.</p>
          ) : (
            <ul className={styles.aiActions}>
              {actions.map((a, i) => (
                <li key={i}>
                  <span className={styles.aiText}>{a.text}</span>
                  {a.refs.length > 0 && (
                    <span className={styles.aiRefs}>
                      {a.refs.map(r => (r.matched && onOpenRecord ? (
                        <button
                          key={`${r.type}-${r.id}`}
                          type="button"
                          className={styles.aiRefLink}
                          onClick={() => onOpenRecord(r)}
                          title={`Open ${r.type} ${r.id}`}
                        >
                          <Badge size="sm" tone="primary" label={`${r.type === 'DOS' ? 'DOS ' : ''}${r.id}`} />
                        </button>
                      ) : (
                        <Badge
                          key={`${r.type}-${r.id}`}
                          size="sm"
                          tone={r.matched ? 'primary' : 'neutral'}
                          label={r.matched ? `${r.type === 'DOS' ? 'DOS ' : ''}${r.id}` : `${r.id}: Not matched to a record`}
                        />
                      )))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function entryTitle(entry) {
  if (entry.category === 'Note') return entry.correctsId ? 'Correction Note' : 'Note';
  if (entry.mode === 'Call') return `${entry.direction === 'incoming' ? 'Incoming' : 'Outgoing'} Call`;
  return entry.mode;
}

function OutreachEntry({ entry, sequence, corrects, onCorrect, onOpenRecord }) {
  const [open, setOpen] = useState(false);
  const at = new Date(entry.loggedAt);
  const text = [
    entry.notes && { label: 'Notes', value: entry.notes },
    entry.transcript && { label: 'Call Transcript', value: entry.transcript },
    entry.emailBody && { label: `Email: ${entry.emailSubject || ''}`, value: entry.emailBody },
  ].filter(Boolean);

  return (
    <div className={styles.entry}>
      <div className={styles.entryMeta}>
        {at.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
        {' • '}
        {at.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        {' • '}
        {entry.loggedByRole ? `${entry.loggedBy} (${entry.loggedByRole})` : entry.loggedBy}
        {sequence && <>{' • '}<span className={styles.sequence}>{sequence}</span></>}
        {entry.program && <>{' • '}{entry.program}</>}
      </div>
      <div className={styles.entryHead}>
        <span className={styles.entryTitle}>
          {entryTitle(entry)}
        </span>
        <Badge size="sm" tone="neutral" label={recipientLabel(entry.recipientType)} />
        <Badge size="sm" tone={CATEGORY_TONE[entry.category]} label={entry.category === 'Note' ? 'Note' : `${entry.category}: ${entry.outcome}`} />
        {entry.pcpOutreachId && <Badge size="sm" tone="info" label="From PCP outreach" />}
      </div>
      {corrects && (
        <div className={styles.correctionOf}>
          Correction to the {new Date(corrects.loggedAt).toLocaleDateString('en-US')} outreach
        </div>
      )}
      <dl className={styles.summary}>
        {structuredSummary(entry).map(r => (
          <div key={r.label} className={styles.summaryRow}>
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
      <AiSummary entry={entry} onOpenRecord={onOpenRecord} />
      <div className={styles.entryActions}>
        {text.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)}>
            {open ? 'Hide Notes' : 'View Notes'}
          </Button>
        )}
        {onCorrect && (
          <Button variant="ghost" size="sm" onClick={() => onCorrect(entry)}>Add Correction Note</Button>
        )}
      </div>
      {open && (
        <div className={styles.entryText}>
          {text.map(t => (
            <div key={t.label}>
              <div className={styles.fieldLabel}>{t.label}</div>
              <p>{t.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
