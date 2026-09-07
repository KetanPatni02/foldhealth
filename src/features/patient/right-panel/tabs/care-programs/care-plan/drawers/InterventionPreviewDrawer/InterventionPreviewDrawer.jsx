import { useState, useEffect, useMemo, useRef } from 'react';
import { Drawer } from '../../../../../../../../components/Drawer/Drawer';
import { Icon } from '../../../../../../../../components/Icon/Icon';
import { Badge } from '../../../../../../../../components/Badge/Badge';
import { Button } from '../../../../../../../../components/Button/Button';
import { Select } from '../../../../../../../../components/Select/Select';
import { Input } from '../../../../../../../../components/Input/Input';
import { Textarea } from '../../../../../../../../components/Textarea/Textarea';
import { Avatar } from '../../../../../../../../components/Avatar/Avatar';
import { ActionButton } from '../../../../../../../../components/ActionButton/ActionButton';
import { Slider } from '../../../../../../../../components/ShadcnSlider/ShadcnSlider';
import { PriorityIcon } from '../../../../../../../../components/PriorityIcon/PriorityIcon';
import { TabStrip } from '../../../../../../../../components/TabStrip/TabStrip';
import { MenuPopover } from '../../../../../../../../components/MenuPopover/MenuPopover';
import { ConfirmDialog } from '../../../../../../../../components/ConfirmDialog/ConfirmDialog';
import { ActivityLog } from '../../../../../../../../components/ActivityLog/ActivityLog';
import { DownChevronIcon } from '../../../../../../../../components/Icon/DownChevronIcon';
import { LinkGoalToBarrierDrawer } from '../BarrierDetailDrawer/LinkGoalToBarrierDrawer';
import { useAppStore } from '../../../../../../../../store/useAppStore';
import styles from '../GoalPreviewDrawer/GoalPreviewDrawer.module.css';
import barrierStyles from '../BarrierDetailDrawer/BarrierDetailDrawer.module.css';

const GBI_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Met', 'Not Met'];
const ACTIVITY_TABS = [
  { key: 'all', label: 'All' },
  { key: 'since', label: 'Since Last Visit' },
];
const ACTIVITY_FILTERS = [
  { key: 'all', label: 'All activity' },
  { key: 'note', label: 'Notes' },
  { key: 'status_changed', label: 'Status' },
  { key: 'progress_changed', label: 'Adherence' },
  { key: 'updated', label: 'Updates' },
];
const STATUS_TONE = {
  'Not Started': 'grey',
  'In Progress': 'warning',
  'On Hold': 'grey',
  Met: 'success',
  'Not Met': 'error',
};

function adherenceNum(value) {
  const n = Number(value);
  return Number.isFinite(n) && value !== '-' ? n : 0;
}

function progressBand(pct) {
  const n = Number(pct) || 0;
  if (n <= 0) return 'Poor';
  if (n < 40) return 'Low';
  if (n < 80) return 'Moderate';
  if (n < 100) return 'High';
  return 'Complete';
}

function progressTone(label) {
  if (/Poor|Low/.test(label)) return 'error';
  if (/Moderate/.test(label)) return 'warning';
  if (/High|Complete/.test(label)) return 'success';
  return 'grey';
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function fmtStamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date} ${time}`;
}

function formatKind(kind) {
  if (!kind) return '';
  return kind.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const initialsOf = (name) => (name || '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

function splitArrow(detail) {
  if (!detail || !detail.includes('→')) return [null, null];
  const [from, to] = detail.split('→').map(s => s.trim());
  return [from || null, to || null];
}

function mapAuditEntry(e) {
  const [from, to] = splitArrow(e.detail);
  const created = e.createdAt ? new Date(e.createdAt) : null;
  const date = created ? created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const time = created ? created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
  const base = {
    id: e.id,
    actor: e.actor || '',
    at: e.createdAt,
    createdAt: e.createdAt,
    action: e.action,
    date,
    time,
    by: e.actor || null,
  };
  if (e.action === 'note') {
    return {
      ...base,
      t: 'comment',
      title: 'Added a Note',
      commentBody: `Note: ${e.detail || ''}`,
      comment: e.detail,
      verb: 'added a',
      field: 'Note',
    };
  }
  if (e.action === 'note_deleted') {
    return {
      ...base,
      t: 'comment',
      title: 'Deleted a Note',
      commentBody: e.detail ? `Note: ${e.detail}` : '',
      comment: e.detail,
      verb: 'deleted a',
      field: 'Note',
    };
  }
  if (e.action === 'created') {
    return { ...base, t: 'default', title: 'added an Intervention', verb: 'added an', field: 'Intervention' };
  }
  if (e.action === 'deleted') {
    return { ...base, t: 'default', title: 'removed an Intervention', verb: 'removed an', field: 'Intervention' };
  }
  if (e.action === 'status_changed') {
    return { ...base, t: 'status_change', title: 'Status', from, to, verb: 'changed the', field: 'Status', fromTone: STATUS_TONE[from] || 'grey', toTone: STATUS_TONE[to] || 'grey' };
  }
  if (e.action === 'progress_changed') {
    return { ...base, t: 'status_change', title: 'Adherence', from, to, verb: 'changed the', field: 'Adherence', fromTone: progressTone(from), toTone: progressTone(to) };
  }
  return { ...base, t: 'default', title: e.summary || 'updated', verb: 'updated', field: e.summary || 'Intervention' };
}

function AccordionHead({ title, open, onToggle, onAdd, addTooltip, canEdit }) {
  return (
    <div className={styles.accHead}>
      <button type="button" className={styles.accToggle} onClick={onToggle} aria-expanded={open}>
        <span className={`${styles.accChevron} ${open ? styles.accChevronOpen : ''}`}>
          <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
        </span>
        <span className={styles.accTitle}>{title}</span>
      </button>
      {canEdit && onAdd && (
        <ActionButton icon="solar:add-linear" size="S" tooltip={addTooltip} onClick={onAdd} />
      )}
    </div>
  );
}

/**
 * Intervention details — Paper 35-0. Mirrors Goal Details layout with
 * adherence, linked goals, automations, notes, and activity feed.
 */
export function InterventionPreviewDrawer({ intervention, patientId, program, onClose, onEdit, onOpenGoal }) {
  const key = patientId && program ? `${patientId}::${program.id}` : null;
  const slice = useAppStore(s => (key ? s.patientCarePlans[key] : null));
  const audit = useAppStore(s => (key ? s.patientCarePlanAudit[key] : null)) || [];
  const lastVisit = useAppStore(s => {
    const p = (s.patients || []).find(x => x.id === patientId)
      || (s.allPatients || []).find(x => x.id === patientId);
    return p?.lastVisit || p?.last_visit || null;
  });
  const savePatientCarePlanIntervention = useAppStore(s => s.savePatientCarePlanIntervention);
  const deletePatientCarePlanIntervention = useAppStore(s => s.deletePatientCarePlanIntervention);
  const saveCarePlanAutomation = useAppStore(s => s.saveCarePlanAutomation);
  const deleteCarePlanAutomation = useAppStore(s => s.deleteCarePlanAutomation);
  const addCarePlanNote = useAppStore(s => s.addCarePlanNote);
  const updateCarePlanNote = useAppStore(s => s.updateCarePlanNote);
  const deleteCarePlanNote = useAppStore(s => s.deleteCarePlanNote);
  const logCarePlanAudit = useAppStore(s => s.logCarePlanAudit);
  const fetchCarePlanAudit = useAppStore(s => s.fetchCarePlanAudit);
  const currentUserName = useAppStore(s => s.currentUserProfile?.name);

  const live = (slice?.interventions || []).find(i => i.id === intervention?.id) || intervention;
  const linkedGoals = useMemo(
    () => (slice?.goals || []).filter(g => g.id === live?.goalId),
    [slice, live],
  );
  const automations = useMemo(
    () => (slice?.automations || []).filter(a => !live?.goalId || a.goalId === live.goalId),
    [slice, live],
  );

  const [pct, setPct] = useState(adherenceNum(live?.adherence));
  const [open, setOpen] = useState({ goals: true, automations: true });
  const [linkGoalOpen, setLinkGoalOpen] = useState(false);
  const [addingAutomation, setAddingAutomation] = useState(false);
  const [automationTitle, setAutomationTitle] = useState('');
  const [note, setNote] = useState('');
  const [notePlain, setNotePlain] = useState('');
  const [noteEditing, setNoteEditing] = useState(false);
  const [activityTab, setActivityTab] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [filterMenu, setFilterMenu] = useState(null);
  const [moreMenu, setMoreMenu] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [confirm, setConfirm] = useState(null);
  const moreBtnRef = useRef(null);
  const filterBtnRef = useRef(null);

  useEffect(() => { setPct(adherenceNum(live?.adherence)); }, [live?.id, live?.adherence]);
  useEffect(() => { if (patientId && program) fetchCarePlanAudit(patientId, program.id); }, [patientId, program, fetchCarePlanAudit]);

  // Latest saved note on this intervention — seeds the note editor and
  // drives the "Update Note" vs "Add Note" label. A subsequent
  // `note_deleted` entry on the same intervention hides the note card
  // (but the delete + original add still appear in the Activity Log).
  const latestInterventionNote = useMemo(() => {
    const forThis = audit.filter(a => String(a.entityId) === String(live?.id));
    const notes = forThis
      .filter(a => a.action === 'note' && (a.entityType === 'intervention' || a.entityType === 'note'))
      .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
    const latestNote = notes[0];
    if (!latestNote) return null;
    const latestClear = forThis
      .filter(a => a.action === 'note_deleted')
      .sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))[0];
    if (latestClear && new Date(latestClear.createdAt) >= new Date(latestNote.createdAt)) return null;
    return latestNote;
  }, [audit, live?.id]);

  // Seed the note textarea from the latest saved note whenever it changes
  // (drawer opens on a new intervention OR a new note was just saved). Exit
  // edit mode after a fresh save so the read-only display re-appears.
  useEffect(() => {
    const seed = latestInterventionNote?.detail || '';
    setNote(seed);
    setNotePlain(seed);
    setNoteEditing(false);
  }, [latestInterventionNote?.id]);

  const activity = useMemo(() => {
    const rows = audit
      .filter(a => String(a.entityId) === String(live?.id))
      .map(mapAuditEntry);
    const sinceCutoff = (() => {
      if (lastVisit) {
        const t = new Date(lastVisit).getTime();
        if (!Number.isNaN(t)) return t;
      }
      return Date.now() - 30 * 86400000;
    })();
    return rows.filter(e => {
      if (activityTab === 'since' && e.createdAt && new Date(e.createdAt).getTime() < sinceCutoff) return false;
      if (activityFilter !== 'all' && e.action !== activityFilter) return false;
      return true;
    });
  }, [audit, live, activityTab, activityFilter, lastVisit]);

  if (!live) return null;

  const canEdit = !!(patientId && program);
  const kindLabel = formatKind(live.kind);
  const youSuffix = (name) => (name && currentUserName && name === currentUserName ? ` by ${name} (You)` : name ? ` by ${name}` : '');
  const toggle = (k) => setOpen(s => ({ ...s, [k]: !s[k] }));
  const expandAnd = (k, fn) => { setOpen(s => ({ ...s, [k]: true })); fn(); };

  const commitAdherence = (v) => {
    const next = v[0];
    if (next === adherenceNum(live.adherence)) return;
    savePatientCarePlanIntervention(patientId, program, { ...live, adherence: String(next) }, live.id);
  };

  const changeStatus = (status) => {
    if (!canEdit || status === live.status) return;
    savePatientCarePlanIntervention(patientId, program, { ...live, status }, live.id);
  };

  const commitTitle = () => {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!next || next === live.title) return;
    savePatientCarePlanIntervention(patientId, program, { ...live, title: next }, live.id);
  };

  const submitAutomation = async () => {
    if (!automationTitle.trim() || !live.goalId) return;
    await saveCarePlanAutomation(patientId, program, live.goalId, { title: automationTitle.trim() });
    setAutomationTitle('');
    setAddingAutomation(false);
  };

  const submitNote = async () => {
    const body = (notePlain || note).replace(/<[^>]+>/g, '').trim();
    if (!body) return;
    await addCarePlanNote(patientId, program, body, { entityType: 'intervention', entityId: live.id, summary: `Note on ${live.title}` });
    setNoteEditing(false);
  };

  const programBadges = [program?.code].filter(Boolean);
  const linkedGoal = linkedGoals[0];
  const conditionBadges = (linkedGoal?.conditions?.length
    ? linkedGoal.conditions
    : (slice?.plan?.conditions || []).map(c => (typeof c === 'string' ? c : c.label)).filter(Boolean)
  ).slice(0, 4);

  const metaParts = [
    live.createdAt ? `Start Date : ${fmtDate(live.createdAt)}` : null,
    live.updatedAt ? `Last Updated : ${fmtDate(live.updatedAt)}${youSuffix(live.updatedBy)}` : null,
  ].filter(Boolean);

  return (
    <Drawer title="Intervention" onClose={onClose} bodyClassName={styles.drawerPad}>
      <div className={styles.body}>
        <div className={styles.statusBar}>
          <Select
            options={GBI_STATUSES.map(s => ({ value: s, label: s }))}
            value={live.status}
            onChange={changeStatus}
            disabled={!canEdit}
            portal
            className={styles.statusSelect}
            style={{ width: 'fit-content' }}
          />
          <div className={styles.statusActions}>
            <ActionButton
              icon="solar:pen-linear"
              size="L"
              tooltip="Edit Intervention"
              disabled={!canEdit}
              onClick={() => {
                // Prefer the full edit drawer when the caller wires one
                // (opens the kind-specific InterventionDrawer with every
                // field). Fall back to inline title-edit otherwise.
                if (onEdit) onEdit(live);
                else { setTitleDraft(live.title); setEditingTitle(true); }
              }}
            />
            <span className={styles.headerDivider} />
            <ActionButton
              ref={moreBtnRef}
              icon="solar:menu-dots-linear"
              size="L"
              tooltip="More"
              disabled={!canEdit}
              onClick={(e) => setMoreMenu(e.currentTarget.getBoundingClientRect())}
            />
          </div>
        </div>

        <div className={`${styles.hero} ${styles.heroWithKind}`}>
          {kindLabel && <span className={styles.subtitle}>{kindLabel}</span>}
          <div className={styles.titleRow}>
            <PriorityIcon priority={live.priority} size={16} />
            {editingTitle ? (
              <Input
                autoFocus
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                aria-label="Intervention title"
              />
            ) : (
              <span className={styles.title}>{live.title}</span>
            )}
          </div>
          {metaParts.length > 0 && <span className={styles.meta}>{metaParts.join(' • ')}</span>}
          {(programBadges.length > 0 || conditionBadges.length > 0) && (
            <div className={styles.badges}>
              {programBadges.map(b => <Badge key={b} tone="grey" label={b} />)}
              {programBadges.length > 0 && conditionBadges.length > 0 && <span className={styles.badgeDivider} />}
              {conditionBadges.map(b => <Badge key={b} tone="grey" label={b} />)}
            </div>
          )}
          {live.duration && (
            <div className={styles.badges}>
              <Badge tone="grey" label={live.duration} icon="solar:clock-circle-linear" />
            </div>
          )}
        </div>

        <section className={styles.section}>
          <span className={styles.progressLabel}>Adherence</span>
          <div className={styles.progressCard}>
            <div className={styles.progressWrap}>
              <div className={styles.progressBubble} style={{ left: `${pct}%` }}>
                {pct}% • {progressBand(pct)}
              </div>
              <Slider
                className={styles.progressSlider}
                value={[pct]}
                min={0}
                max={100}
                step={1}
                disabled={!canEdit}
                onValueChange={v => setPct(v[0])}
                onValueCommit={commitAdherence}
                aria-label="Intervention adherence"
              />
            </div>
          </div>
        </section>

        <section className={barrierStyles.section}>
          <div className={barrierStyles.sectionHead}>
            <button
              type="button"
              className={barrierStyles.sectionToggle}
              onClick={() => toggle('goals')}
              aria-expanded={open.goals}
            >
              <span className={barrierStyles.sectionTitle}>Linked Goals</span>
              <DownChevronIcon
                size={12}
                color="var(--neutral-400)"
                className={`${barrierStyles.sectionChevron} ${open.goals ? barrierStyles.sectionChevronOpen : ''}`}
              />
            </button>
            {canEdit && (
              <ActionButton
                icon="solar:add-linear"
                size="S"
                tooltip="Link goal"
                onClick={() => setLinkGoalOpen(true)}
              />
            )}
          </div>
          {open.goals && (
            linkedGoals.length === 0 ? (
              <div className={barrierStyles.empty}>Not linked to any goals in this plan version yet.</div>
            ) : (
              <ul className={barrierStyles.linkList}>
                {linkedGoals.map(g => (
                  <li key={g.id} className={barrierStyles.linkRow}>
                    <span className={barrierStyles.linkIcon}>
                      <Icon name={g.icon || 'solar:flag-linear'} size={16} color="var(--neutral-400)" />
                    </span>
                    <div className={barrierStyles.linkStack}>
                      <span className={barrierStyles.linkTitle}>{g.title}</span>
                      {g.subtitle && <span className={barrierStyles.linkSubtitle}>{g.subtitle}</span>}
                    </div>
                    <div className={barrierStyles.linkActions}>
                      <ActionButton
                        icon="solar:arrow-right-up-linear"
                        size="S"
                        tooltip="Open goal"
                        onClick={() => onOpenGoal?.(g)}
                      />
                      {canEdit && (
                        <>
                          <span className={barrierStyles.linkActionsDivider} aria-hidden />
                          <ActionButton
                            icon="solar:link-broken-minimalistic-linear"
                            size="S"
                            tooltip="Unlink"
                            onClick={() => savePatientCarePlanIntervention(patientId, program, { ...live, goalId: null }, live.id)}
                          />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </section>

        <section className={barrierStyles.section}>
          <div className={barrierStyles.sectionHead}>
            <button
              type="button"
              className={barrierStyles.sectionToggle}
              onClick={() => toggle('automations')}
              aria-expanded={open.automations}
            >
              <span className={barrierStyles.sectionTitle}>Automations</span>
              <DownChevronIcon
                size={12}
                color="var(--neutral-400)"
                className={`${barrierStyles.sectionChevron} ${open.automations ? barrierStyles.sectionChevronOpen : ''}`}
              />
            </button>
            {canEdit && !!live.goalId && (
              <ActionButton
                icon="solar:add-linear"
                size="S"
                tooltip="Add automation"
                onClick={() => expandAnd('automations', () => setAddingAutomation(v => !v))}
              />
            )}
          </div>
          {open.automations && (
            <>
              {addingAutomation && (
                <div className={styles.addRow}>
                  <Input
                    placeholder="Automation (e.g. Notify care team on missed task)"
                    value={automationTitle}
                    onChange={e => setAutomationTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitAutomation(); }}
                    aria-label="Automation title"
                  />
                  <Button variant="primary" size="S" onClick={submitAutomation} disabled={!automationTitle.trim()}>Save</Button>
                </div>
              )}
              {automations.length === 0 ? (
                <div className={barrierStyles.empty}>No automations set up yet.</div>
              ) : (
                <ul className={barrierStyles.linkList}>
                  {automations.map(a => (
                    <li key={a.id} className={barrierStyles.linkRow}>
                      <span className={barrierStyles.linkIcon}>
                        <Icon name={a.icon || 'solar:bolt-linear'} size={16} color="var(--neutral-400)" />
                      </span>
                      <div className={barrierStyles.linkStack}>
                        <span className={barrierStyles.linkTitle}>{a.title}</span>
                      </div>
                      {canEdit && (
                        <div className={barrierStyles.linkActions}>
                          <ActionButton
                            icon="solar:link-broken-minimalistic-linear"
                            size="S"
                            tooltip="Remove automation"
                            onClick={() => deleteCarePlanAutomation(patientId, program.id, a.id)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {canEdit && (
          <div className={barrierStyles.noteEditor}>
            {latestInterventionNote && !noteEditing ? (
              <section className={barrierStyles.section}>
                <div className={barrierStyles.sectionHead}>
                  <span className={barrierStyles.sectionTitle}>Note</span>
                </div>
                <div className={styles.careNoteCardWrap}>
                  <button
                    type="button"
                    className={styles.careNoteCard}
                    onClick={() => setNoteEditing(true)}
                    aria-label="Edit note"
                  >
                    <p className={styles.careNoteBody}>{latestInterventionNote.detail}</p>
                    <div className={styles.careNoteMeta}>
                      <span className={styles.careNoteAuthor}>{latestInterventionNote.actor || 'You'}</span>
                      <span className={styles.careNoteDot} aria-hidden="true">•</span>
                      <span className={styles.careNoteTimestamp}>{fmtStamp(latestInterventionNote.createdAt)}</span>
                    </div>
                  </button>
                  <span className={styles.careNoteDelete}>
                    <ActionButton
                      icon="solar:trash-bin-trash-linear"
                      size="S"
                      tooltip="Delete note"
                      onClick={() => {
                        // Log a new "Deleted a Note" audit entry — the
                        // original "Added a Note" row stays in place so
                        // both events remain visible in the Activity Log.
                        logCarePlanAudit?.(patientId, program, {
                          entityType: 'intervention',
                          entityId: live.id,
                          action: 'note_deleted',
                          summary: `Note on ${live.title || 'intervention'} deleted`,
                          detail: latestInterventionNote.detail || '',
                        });
                        // Drop the seeded text so the editor reopens empty.
                        setNote('');
                        setNotePlain('');
                        setNoteEditing(true);
                      }}
                    />
                  </span>
                </div>
              </section>
            ) : (
              <>
                <Textarea
                  title={latestInterventionNote ? 'Update Note' : 'Add Note'}
                  placeholder="Add a note"
                  value={note}
                  onChange={(value) => {
                    const v = typeof value === 'string' ? value : '';
                    setNote(v);
                    setNotePlain(v);
                  }}
                  rows={3}
                />
                {(() => {
                  const baseline = (latestInterventionNote?.detail || '').trim();
                  const current = note.trim();
                  const canSave = current.length > 0 && current !== baseline;
                  const canDiscard = current !== baseline || noteEditing;
                  return (
                    <div className={barrierStyles.noteActions}>
                      <Button
                        variant="secondary"
                        size="M"
                        disabled={!canDiscard}
                        onClick={() => {
                          setNote(baseline);
                          setNotePlain(baseline);
                          if (latestInterventionNote) setNoteEditing(false);
                        }}
                      >
                        Discard
                      </Button>
                      <Button
                        variant="primary"
                        size="M"
                        disabled={!canSave}
                        onClick={submitNote}
                      >
                        {latestInterventionNote ? 'Update Note' : 'Add Note'}
                      </Button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>

      <section className={barrierStyles.section} style={{ marginTop: 'var(--space-4)' }}>
        <div className={barrierStyles.sectionHead}>
          <span className={barrierStyles.sectionTitle}>Activity Log</span>
        </div>
        <ActivityLog
          entries={activity}
          emptyLabel="No activity for this intervention yet."
        />
      </section>

      {moreMenu && (
        <MenuPopover
          anchorRect={moreMenu}
          width={160}
          ariaLabel="Intervention actions"
          items={[
            { key: 'rename', icon: 'solar:pen-linear', label: 'Rename', disabled: !canEdit },
            { key: 'delete', icon: 'solar:trash-bin-trash-linear', label: 'Remove', danger: true, disabled: !canEdit },
          ]}
          onSelect={(k) => {
            setMoreMenu(null);
            if (k === 'rename') { setTitleDraft(live.title); setEditingTitle(true); }
            if (k === 'delete') setConfirm({ kind: 'intervention' });
          }}
          onClose={() => setMoreMenu(null)}
        />
      )}

      {filterMenu && (
        <MenuPopover
          anchorRect={filterMenu}
          width={180}
          ariaLabel="Filter activity"
          items={ACTIVITY_FILTERS.map(f => ({ key: f.key, label: f.label }))}
          onSelect={(k) => { setActivityFilter(k); setFilterMenu(null); }}
          onClose={() => setFilterMenu(null)}
        />
      )}

      {linkGoalOpen && (
        <LinkGoalToBarrierDrawer
          title="Link Goal to Intervention"
          goals={(slice?.goals || []).filter(g => g.id !== live.goalId)}
          onClose={() => setLinkGoalOpen(false)}
          onLink={async (ids) => {
            const first = ids?.[0];
            if (!first) return;
            await savePatientCarePlanIntervention(patientId, program, { ...live, goalId: first }, live.id);
            setLinkGoalOpen(false);
          }}
        />
      )}

      {confirm?.kind === 'intervention' && (
        <ConfirmDialog
          variant="error"
          title={`Remove "${live.title}"?`}
          description="This removes it from the patient's care plan. This action cannot be undone."
          confirmLabel="Remove"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await deletePatientCarePlanIntervention(patientId, program.id, live.id);
            setConfirm(null);
            onClose?.();
          }}
        />
      )}

      {confirm?.kind === 'note' && (
        <ConfirmDialog
          variant="error"
          title="Delete this note?"
          description="The note will be removed from this intervention's activity."
          confirmLabel="Delete"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            await deleteCarePlanNote(patientId, program.id, confirm.id);
            setConfirm(null);
          }}
        />
      )}
    </Drawer>
  );
}
