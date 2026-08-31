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
import { useAppStore } from '../../../../../../../../store/useAppStore';
import styles from '../GoalPreviewDrawer/GoalPreviewDrawer.module.css';

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
  const base = { id: e.id, actor: e.actor || '', at: e.createdAt, createdAt: e.createdAt, action: e.action };
  if (e.action === 'note') return { ...base, verb: 'added a', field: 'Note', comment: e.detail };
  if (e.action === 'created') return { ...base, verb: 'added an', field: 'Intervention' };
  if (e.action === 'deleted') return { ...base, verb: 'removed an', field: 'Intervention' };
  if (e.action === 'status_changed') return { ...base, verb: 'changed the', field: 'Status', from, to, fromTone: STATUS_TONE[from] || 'grey', toTone: STATUS_TONE[to] || 'grey' };
  if (e.action === 'progress_changed') return { ...base, verb: 'changed the', field: 'Adherence', from, to, fromTone: progressTone(from), toTone: progressTone(to) };
  return { ...base, verb: 'updated', field: e.summary || 'Intervention' };
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
export function InterventionPreviewDrawer({ intervention, patientId, program, onClose }) {
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
  const fetchCarePlanAudit = useAppStore(s => s.fetchCarePlanAudit);

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
  const [open, setOpen] = useState({ goals: false, automations: false });
  const [addingAutomation, setAddingAutomation] = useState(false);
  const [automationTitle, setAutomationTitle] = useState('');
  const [note, setNote] = useState('');
  const [notePlain, setNotePlain] = useState('');
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
    setNote('');
    setNotePlain('');
  };

  const programBadges = [program?.code].filter(Boolean);
  const linkedGoal = linkedGoals[0];
  const conditionBadges = (linkedGoal?.conditions?.length
    ? linkedGoal.conditions
    : (slice?.plan?.conditions || []).map(c => (typeof c === 'string' ? c : c.label)).filter(Boolean)
  ).slice(0, 4);

  const metaParts = [
    live.createdAt ? `Start Date : ${fmtDate(live.createdAt)}` : null,
    live.updatedAt ? `Last Updated : ${fmtDate(live.updatedAt)}` : null,
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
              onClick={() => { setTitleDraft(live.title); setEditingTitle(true); }}
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

        <div className={styles.hero}>
          {kindLabel && <Badge tone="grey" label={kindLabel} />}
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

        <section className={`${styles.accSection} ${open.goals ? styles.accSectionOpen : ''}`}>
          <AccordionHead
            title="Goals"
            open={open.goals}
            onToggle={() => toggle('goals')}
            canEdit={false}
          />
          {open.goals && (
            linkedGoals.length === 0 ? (
              <div className={styles.emptyCard}>No goals linked yet.</div>
            ) : (
              <div className={styles.linkedList}>
                {linkedGoals.map(g => (
                  <div key={g.id} className={styles.linkedRow}>
                    <span className={styles.linkedIcon}><Icon name={g.icon || 'solar:flag-linear'} size={16} color="var(--neutral-400)" /></span>
                    <span className={styles.linkedText}>
                      <span className={styles.linkedTitle}>{g.title}</span>
                      {g.subtitle && <span className={styles.linkedMeta}>{g.subtitle}</span>}
                    </span>
                    {g.status && <Badge tone={STATUS_TONE[g.status] || 'grey'} size="S" label={g.status} />}
                  </div>
                ))}
              </div>
            )
          )}
        </section>

        <section className={`${styles.accSection} ${open.automations ? styles.accSectionOpen : ''}`}>
          <AccordionHead
            title="Automations"
            open={open.automations}
            onToggle={() => toggle('automations')}
            canEdit={canEdit && !!live.goalId}
            addTooltip="Add Automations"
            onAdd={() => expandAnd('automations', () => setAddingAutomation(v => !v))}
          />
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
                <div className={styles.emptyCard}>No automations set up.</div>
              ) : (
                <div className={styles.linkedList}>
                  {automations.map(a => (
                    <div key={a.id} className={styles.linkedRow}>
                      <span className={styles.linkedIcon}><Icon name={a.icon || 'solar:bolt-linear'} size={16} color="var(--neutral-400)" /></span>
                      <span className={styles.linkedText}><span className={styles.linkedTitle}>{a.title}</span></span>
                      {canEdit && (
                        <button type="button" className={styles.valueRemove} onClick={() => deleteCarePlanAutomation(patientId, program.id, a.id)} aria-label="Remove automation">
                          <Icon name="solar:trash-bin-minimalistic-linear" size={14} color="var(--neutral-300)" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {canEdit && (
          <Textarea
            title="Add Note"
            placeholder="Add a note"
            value={note}
            onChange={(html, extra) => {
              setNote(typeof html === 'string' ? html : '');
              setNotePlain(typeof extra === 'string' ? extra : (typeof html === 'string' ? html : ''));
            }}
            richText
            attachment
            rows={3}
            bottomButton={{ label: 'Add Note', onClick: submitNote, disabled: !(notePlain || note).replace(/<[^>]+>/g, '').trim() }}
          />
        )}
      </div>

      <div className={styles.activityBlock}>
        <TabStrip
          items={ACTIVITY_TABS}
          activeKey={activityTab}
          onChange={setActivityTab}
          fullWidth={false}
          size="S"
          trailing={(
            <ActionButton
              ref={filterBtnRef}
              icon="custom:filter"
              size="S"
              tooltip="Filter activity"
              active={activityFilter !== 'all'}
              onClick={(e) => setFilterMenu(e.currentTarget.getBoundingClientRect())}
            />
          )}
        />
        <div className={styles.activityList}>
          {activity.length === 0 ? (
            <div className={styles.emptyCard}>No activity yet.</div>
          ) : activity.map((e, i) => (
            <div key={e.id} className={styles.logRow}>
              <div className={styles.logRail}>
                <Avatar type="initial" variant="staff" size="S" initials={initialsOf(e.actor) || '—'} />
                {i < activity.length - 1 && <span className={styles.logLine} />}
              </div>
              <div className={styles.logBody}>
                <span className={styles.logStamp}>{fmtStamp(e.at)}</span>
                <p className={styles.logLineText}>
                  <span className={styles.logActor}>{e.actor || 'Someone'}</span>
                  <span>{e.verb}</span>
                  <span className={styles.logField}>{e.field}</span>
                </p>
                {e.from && e.to && (
                  <div className={styles.logChange}>
                    <Badge tone={e.fromTone || 'grey'} size="S" label={e.from} />
                    <Icon name="solar:arrow-right-linear" size={16} color="var(--neutral-300)" />
                    <Badge tone={e.toTone || 'grey'} size="S" label={e.to} />
                  </div>
                )}
                {e.comment && editingNoteId !== e.id && (
                  <p className={styles.logComment}>{e.comment}</p>
                )}
                {e.action === 'note' && canEdit && editingNoteId === e.id && (
                  <div className={styles.noteEdit}>
                    <Textarea value={noteDraft} onChange={ev => setNoteDraft(ev.target.value)} rows={3} />
                    <div className={styles.noteEditActions}>
                      <Button variant="ghost" size="S" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                      <Button
                        variant="primary"
                        size="S"
                        disabled={!noteDraft.trim()}
                        onClick={async () => {
                          await updateCarePlanNote(patientId, program.id, e.id, noteDraft);
                          setEditingNoteId(null);
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
                {e.action === 'note' && canEdit && editingNoteId !== e.id && (
                  <div className={styles.logNoteActions}>
                    <Button
                      variant="ghost"
                      size="S"
                      onClick={() => { setEditingNoteId(e.id); setNoteDraft(e.comment || ''); }}
                    >
                      Edit
                    </Button>
                    <span className={styles.logDot}>•</span>
                    <Button
                      variant="ghost"
                      size="S"
                      onClick={() => setConfirm({ kind: 'note', id: e.id })}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
