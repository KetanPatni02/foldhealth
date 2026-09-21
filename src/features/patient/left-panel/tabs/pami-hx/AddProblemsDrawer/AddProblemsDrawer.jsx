import { useMemo, useState } from 'react';
import { Drawer } from '../../../../../../components/Drawer/Drawer';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Select } from '../../../../../../components/Select/Select';
import { Input } from '../../../../../../components/Input/Input';
import { Textarea } from '../../../../../../components/Textarea/Textarea';
import { Button } from '../../../../../../components/Button/Button';
import { Link } from '../../../../../../components/Link/Link';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { CloseIcon } from '../../../../../../components/Icon/CloseIcon';
import { AddIconMinimalist } from '../../../../../../components/Icon/AddIconMinimalist';
import { DownChevronIcon } from '../../../../../../components/Icon/DownChevronIcon';
import { ChronicConditionSelect } from '../../../../../settings/care-plan-library/shared/ChronicConditionSelect/ChronicConditionSelect';
import { CardSkeleton } from '../../../../../../components/CardSkeleton/CardSkeleton';
import { useAppStore } from '../../../../../../store/useAppStore';
import styles from './AddProblemsDrawer.module.css';

// Resolved and Historical both close a problem out; the rest keep it live, so
// the drawer's two sections split on that rather than on "not Active".
const CLOSED_STATUSES = new Set(['Resolved', 'Historical']);
const STATUS_OPTIONS = ['Active', 'Controlled', 'Resolved', 'Historical']
  .map(v => ({ value: v, label: v }));
const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe'].map(v => ({ value: v, label: v }));
const TYPE_OPTIONS = ['Chronic', 'Acute'].map(v => ({ value: v, label: v }));

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * The picked condition, before it joins the list: onset, status, severity and
 * type, plus an optional note. Saving writes the problem; discarding drops it
 * and returns the picker.
 */
function ProblemDraft({ title, onSave, onCancel }) {
  const [since, setSince] = useState(todayIso());
  const [status, setStatus] = useState('Active');
  const [severity, setSeverity] = useState('Mild');
  const [type, setType] = useState('Chronic');
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave({ title, since, status, severity, type, note: note.trim() });
    setSaving(false);
  };

  return (
    <div className={styles.draft}>
      <span className={styles.draftTitle}>{title}</span>
      <div className={styles.draftFields}>
        <Input label="Since" type="date" value={since} onChange={e => setSince(e.target.value)} />
        <Select label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        <Select label="Severity" options={SEVERITY_OPTIONS} value={severity} onChange={setSeverity} />
        <Select label="Type" options={TYPE_OPTIONS} value={type} onChange={setType} />
      </div>
      {!noteOpen && (
        <Link className={styles.draftAddNote} onClick={() => setNoteOpen(true)}>
          <AddIconMinimalist size={14} color="var(--primary-300)" />
          Add Note
        </Link>
      )}
      {noteOpen && (
        <div className={styles.draftNote}>
          <div className={styles.draftNoteHead}>
            <span className={styles.draftNoteLabel}>Note</span>
            <ActionButton size="S" tooltip="Discard note" aria-label="Discard note" onClick={() => { setNote(''); setNoteOpen(false); }}>
              <CloseIcon size={14} color="var(--neutral-300)" />
            </ActionButton>
          </div>
          <Textarea rows={3} placeholder="Add note" value={note} onChange={e => setNote(e.target.value)} />
        </div>
      )}
      <div className={styles.draftActions}>
        <Button variant="primary" size="M" disabled={saving} onClick={save}>Save</Button>
        <span className={styles.draftDivider} aria-hidden="true" />
        <Link variant="secondary" onClick={onCancel}>Cancel</Link>
      </div>
    </div>
  );
}

function ProblemRow({ problem, onStatusChange }) {
  const meta = [problem.onsetLabel, problem.type].filter(Boolean);
  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowTitle}>{problem.title}</span>
        <span className={styles.rowMeta}>
          {meta.map((part, i) => (
            <span key={part}>
              {i > 0 && <span className={styles.dot} aria-hidden="true">•</span>}
              {part}
            </span>
          ))}
          {problem.severity && (
            <>
              {meta.length > 0 && <span className={styles.dot} aria-hidden="true">•</span>}
              <Badge tone="grey" size="S" label={problem.severity} />
            </>
          )}
        </span>
      </div>
      <Select
        options={STATUS_OPTIONS}
        value={problem.status || 'Active'}
        onChange={v => onStatusChange(problem, v)}
        className={styles.statusSelect}
      />
    </div>
  );
}

function Section({ title, count, open, onToggle, children }) {
  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHead} onClick={onToggle} aria-expanded={open}>
        <span className={styles.sectionTitle}>{title}</span>
        {count > 0 && <span className={styles.sectionCount}>{count}</span>}
        <DownChevronIcon size={14} className={open ? undefined : styles.chevronClosed} />
      </button>
      {open && children}
    </div>
  );
}

/**
 * Add Problems — the PAMI/Hx Problems section's `+` opens this.
 * Figma P360 8207:293083.
 *
 * Search adds a problem to the patient's list; the two sections below are the
 * list itself, split by status, so adding and reviewing happen in one place.
 */
export function AddProblemsDrawer({ patientId, onClose }) {
  const storeProblems = useAppStore(s => (patientId ? s.patientProblems[patientId] : null));
  const problems = useMemo(() => storeProblems || [], [storeProblems]);
  const loadedFor = useAppStore(s => (patientId ? s.patientProblemsLoadedFor[patientId] : false));
  const addPatientProblem = useAppStore(s => s.addPatientProblem);
  const updatePatientProblemStatus = useAppStore(s => s.updatePatientProblemStatus);
  const showToast = useAppStore(s => s.showToast);
  const [resolvedOpen, setResolvedOpen] = useState(false);
  const [activeOpen, setActiveOpen] = useState(true);

  const active = useMemo(() => problems.filter(p => !CLOSED_STATUSES.has(p.status || 'Active')), [problems]);
  const resolved = useMemo(() => problems.filter(p => CLOSED_STATUSES.has(p.status)), [problems]);
  const loading = !!patientId && !loadedFor;

  // Picking a condition opens the draft card; the list below waits until the
  // draft is saved or discarded.
  const [draftTitle, setDraftTitle] = useState(null);
  const handleCondition = (title) => {
    if (!title) return;
    const existing = new Set(problems.map(p => (p.title || '').trim().toLowerCase()));
    if (existing.has(title.trim().toLowerCase())) {
      showToast?.('This problem is already on the list');
      return;
    }
    setDraftTitle(title);
  };

  const saveDraft = async (values) => {
    const ok = await addPatientProblem(patientId, {
      title: values.title,
      type: values.type,
      severity: values.severity,
      status: values.status,
      note: values.note,
      onsetLabel: values.since
        ? new Date(values.since).toLocaleDateString('en-US')
        : undefined,
    });
    if (ok) setDraftTitle(null);
  };

  const handleStatusChange = (problem, status) => {
    if (status === (problem.status || 'Active')) return;
    updatePatientProblemStatus(patientId, problem.id, status);
  };

  return (
    <Drawer title="Add Problems" onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.addBlock}>
          <span className={styles.addLabel}>Add New Problems</span>
          <ChronicConditionSelect
            label=""
            multiple={false}
            value={draftTitle || ''}
            onChange={handleCondition}
          />
        </div>

        {draftTitle && (
          <ProblemDraft
            title={draftTitle}
            onSave={saveDraft}
            onCancel={() => setDraftTitle(null)}
          />
        )}

        {loading ? (
          <CardSkeleton rows={3} />
        ) : (
          <div className={draftTitle ? styles.listDimmed : undefined}>
            <Section
              title="Active Problems"
              count={active.length}
              open={activeOpen}
              onToggle={() => setActiveOpen(v => !v)}
            >
              {active.length === 0
                ? <p className={styles.empty}>No active problems yet.</p>
                : active.map(p => (
                  <ProblemRow key={p.id} problem={p} onStatusChange={handleStatusChange} />
                ))}
            </Section>

            {resolved.length > 0 && (
              <Section
                title="Resolved Problems"
                count={resolved.length}
                open={resolvedOpen}
                onToggle={() => setResolvedOpen(v => !v)}
              >
                {resolved.map(p => (
                  <ProblemRow key={p.id} problem={p} onStatusChange={handleStatusChange} />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
