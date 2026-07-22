import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Button } from '../../../components/Button/Button';
import { Select } from '../../../components/Select/Select';
import { DatePicker } from '../../../components/DatePicker/DatePicker';
import { Checkbox } from '../../../components/ui/checkbox';
import { DemoPhiStrip } from '../../../components/DemoPhiStrip/DemoPhiStrip';
import { POS_BY_VT, PROVIDER_POOL_BY_VT } from '../reference/visitTypes';
import styles from './NewDiagGapPanel.module.css';

// Sentinel option value for the DOS Select → opens the calendar picker.
export const DOS_CUSTOM = '__custom__';

// Today in yyyy-mm-dd for the date-input `max` attribute — blocks future
// dates in the calendar UI.
export const todayIso = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

// Per-card state factory — every new ICD pick gets its own copy.
// A card holds an array of DOS entries (multi-select). Each entry keeps
// enough context so Save can route it to the right store action:
//   mode 'existing' — DOS is in the current row's dos_list
//   mode 'sibling'  — DOS is in a sibling Created-date row; memberId
//                     identifies which row so Save can route the ICD there
//   mode 'custom'   — brand-new DOS not on any row for this patient;
//                     Save spawns a fresh worklist row for it
export const makeCard = (icd) => ({
  pick: icd,
  dosList: [],                 // [{ value, dosDate, memberId, mode }]
  provider: '',
  pos: '',
  visitType: '',
  docType: '',
  file: null,
  linkedDocIds: new Set(),
  showUpload: false,
  collapsed: false,
});

// True when EVERY selected DOS resolves to an existing dos_list row
// (current row or a sibling Created-date row) — drives the DocType +
// Evidence-list mode. When at least one custom DOS is in the mix, the
// card falls back to the Visit-Type + dropzone flow so the new row has
// enough metadata to render.
export function isDosOnAnyRow(card) {
  if (!card.dosList?.length) return false;
  return card.dosList.every(d => d.mode === 'existing' || d.mode === 'sibling');
}

// Validity check for the per-card Save affordance in the RHS inline flow.
// Provider/POS are always required (form-level values apply to every
// selected DOS). DocType + evidence apply when all selected DOSs are on
// existing rows; Visit Type applies when at least one custom DOS is in
// the mix (spawn-new-row flow needs it).
export function canSaveCard(card) {
  if (!card.pick || !card.dosList?.length || !card.provider || !card.pos) return false;
  if (isDosOnAnyRow(card)) {
    return !!card.docType && (card.linkedDocIds.size > 0 || !!card.file);
  }
  return !!card.visitType;
}

/**
 * IcdCard — the pick-an-ICD editor card rendered inline on the RHS of the
 * DiagPanel. Each picked ICD (from the toolbar's + ICD flow) becomes its
 * own card at the top of the associated-ICDs list with a per-card Save.
 *
 * DOS field auto-populates Provider/POS/VT for existing dos_list dates
 * (either this row's or a sibling Created-date row's); picking a brand-new
 * custom date leaves them empty and triggers a new-row spawn on save.
 */
export function IcdCard({
  card, member, memberDosList, memberDocs,
  dosOptions, posOptions, vtOptions, docTypeOptions, providerAll,
  onUpdate, onRemove, onSave,
}) {
  const [dragOver, setDragOver] = useState(false);
  // Hidden native date input drives the "+ Custom Date" affordance so the OS
  // calendar opens directly when the user picks it, instead of surfacing a
  // secondary field they have to click into.
  const customDateRef = useRef(null);

  const priorOccurrences = useMemo(() => {
    if (!card.pick?.code || !member?.dos_list) return 0;
    return (member.dos_list || []).filter(d => d?.icd === card.pick.code).length
      || Math.min(member.dos_list.length, 2);
  }, [card.pick?.code, member?.dos_list]);

  const providerOptions = useMemo(() => {
    const pool = card.visitType ? PROVIDER_POOL_BY_VT[card.visitType] : Object.values(PROVIDER_POOL_BY_VT).flat();
    return [...new Set(pool)].map(n => ({ value: n, label: n }));
  }, [card.visitType]);

  const dosIsExisting = isDosOnAnyRow(card);

  // Bake any custom-picked dates into the options list so they render as
  // selected in the Select (which only shows options it knows about).
  // The `+ Custom Date` action stays at the end and is marked as a
  // singleAction so clicks trigger its own handler rather than toggling.
  const effectiveDosOptions = useMemo(() => {
    const customEntries = card.dosList
      .filter(d => d.mode === 'custom')
      .map(d => ({ value: d.value, label: d.value }));
    const rest = dosOptions.filter(o => o.value !== DOS_CUSTOM);
    const customAction = dosOptions.find(o => o.value === DOS_CUSTOM);
    return [
      ...customEntries,
      ...rest,
      customAction ? { ...customAction, singleAction: true } : null,
    ].filter(Boolean);
  }, [card.dosList, dosOptions]);

  // Look up a DOS option by value and return the { dosDate, memberId,
  // mode } shape used inside card.dosList. Falls back to a `custom` entry
  // if the value isn't in the options list (which happens for previously-
  // picked custom dates).
  const resolveDosEntry = (val) => {
    const opt = dosOptions.find(o => o.value === val && o.type !== 'header');
    if (!opt) return { value: val, dosDate: val, memberId: null, mode: 'custom' };
    const dosDate = opt.dosDate || opt.value;
    return {
      value: val,
      dosDate,
      memberId: opt.memberId || null,
      mode: opt.memberId === member?.id ? 'existing' : opt.memberId ? 'sibling' : 'custom',
    };
  };

  // Auto-populate the form fields from the DOS entry that owns each row's
  // metadata. Called on the first DOS pick; subsequent picks don't
  // overwrite so user edits stick.
  const populateFieldsFromEntry = (entry, patch) => {
    if (entry.mode === 'existing') {
      const match = memberDosList.find(d => d.date === entry.dosDate);
      if (match) {
        const vt = match.pos ? Object.entries(POS_BY_VT).find(([, p]) => p.code === match.pos)?.[0] : '';
        patch.provider = match.provider || '';
        patch.pos = match.pos || '';
        patch.visitType = vt || '';
      }
    } else if (entry.mode === 'sibling') {
      const s = useAppStore.getState();
      const sib = s.hccMembers.find(m => m.id === entry.memberId);
      const sibDos = sib?.dos_list?.find(d => d.date === entry.dosDate);
      if (sibDos) {
        const vt = sibDos.pos ? Object.entries(POS_BY_VT).find(([, p]) => p.code === sibDos.pos)?.[0] : '';
        patch.provider = sibDos.provider || '';
        patch.pos = sibDos.pos || '';
        patch.visitType = vt || '';
      }
    }
    return patch;
  };

  const handleDosMultiChange = (nextValues) => {
    // Rebuild dosList so we keep the entry shape (mode/memberId) rather
    // than losing it. Preserve the order in which values were added.
    const prevByValue = new Map(card.dosList.map(d => [d.value, d]));
    const nextList = nextValues.map(v => prevByValue.get(v) || resolveDosEntry(v));

    const patch = { dosList: nextList };
    // Auto-populate on the first DOS pick, leaving form values untouched
    // after the user has already selected multiple.
    if (nextList.length === 1 && card.dosList.length === 0) {
      const only = nextList[0];
      patch.provider = '';
      patch.pos = '';
      patch.visitType = '';
      patch.docType = '';
      patch.linkedDocIds = new Set();
      patch.showUpload = false;
      populateFieldsFromEntry(only, patch);
    }
    onUpdate(patch);
  };

  const handleDosSelect = (nextValueOrList) => {
    // singleAction items (Custom Date) still come through as a scalar in
    // multi mode. Route to the picker.
    if (nextValueOrList === DOS_CUSTOM) {
      customDateRef.current?.showPicker?.();
      customDateRef.current?.click?.();
      return;
    }
    handleDosMultiChange(Array.isArray(nextValueOrList) ? nextValueOrList : [nextValueOrList]);
  };

  const handleCustomDate = (iso) => {
    if (!iso) return;
    const [y, m, d] = iso.split('-');
    const formatted = `${m}/${d}/${y}`;
    // Append this custom date to the existing dosList (don't clobber). If
    // it's already in the list (user re-picked the same date), no-op.
    if (card.dosList.some(x => x.value === formatted)) return;
    const nextList = [...card.dosList, { value: formatted, dosDate: formatted, memberId: null, mode: 'custom' }];
    const patch = { dosList: nextList };
    if (card.dosList.length === 0) {
      // First DOS is a custom → clear autoderived defaults so the user
      // fills provider/POS/VT explicitly.
      patch.provider = '';
      patch.pos = '';
      patch.visitType = '';
      patch.docType = '';
      patch.linkedDocIds = new Set();
      patch.showUpload = false;
    }
    onUpdate(patch);
  };

  const handleVtChange = (vt) => {
    const p = POS_BY_VT[vt];
    const pool = PROVIDER_POOL_BY_VT[vt] || [];
    onUpdate({
      visitType: vt,
      pos: p?.code || card.pos,
      provider: card.provider || pool[0] || '',
    });
  };

  const toggleLinkedDoc = (id) => {
    onUpdate(c => {
      const next = new Set(c.linkedDocIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { linkedDocIds: next };
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onUpdate({ file: f });
  };

  const showDropzone = !dosIsExisting || card.showUpload;
  const showEvidenceList = dosIsExisting;
  const saveDisabled = !!onSave && !canSaveCard(card);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <button
          type="button"
          className={styles.chevronBtn}
          onClick={() => onUpdate({ collapsed: !card.collapsed })}
          aria-label={card.collapsed ? 'Expand' : 'Collapse'}
        >
          <Icon
            name={card.collapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-down-linear'}
            size={16}
            color="var(--neutral-400)"
          />
        </button>
        <div className={styles.cardHeaderMain}>
          <div className={styles.icdTitle}>
            <span className={styles.icdCode}>{card.pick.code}</span>
            <span className={styles.icdDesc}> - {card.pick.title}</span>
          </div>
          <div className={styles.icdMeta}>
            {card.pick.hcc && (
              <span className={styles.hccLabel}>
                {(card.pick.hcc || '').replace(/ - .*$/, '')} (v28)
              </span>
            )}
            {card.pick.hcc && <span className={styles.metaDivider} />}
            <span className={styles.occursBadge}>
              <Icon name="custom:history" size={10} color="var(--neutral-300)" />
              <span>Occurs {priorOccurrences}x</span>
              <Icon name="solar:alt-arrow-right-linear" size={10} color="var(--neutral-300)" />
            </span>
          </div>
        </div>
        {!onSave && (
          <ActionButton
            size="S"
            icon="solar:trash-bin-2-linear"
            tooltip="Remove"
            onClick={onRemove}
          />
        )}
      </div>

      {!card.collapsed && (
        <>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.fieldTitle}>
                DOS <span className={styles.required}>•</span>
              </label>
              <Select
                multiple
                options={effectiveDosOptions}
                value={card.dosList.map(d => d.value)}
                onChange={handleDosSelect}
                placeholder="Select Date of Service"
              />
              <DatePicker
                ref={customDateRef}
                hidden
                max={todayIso()}
                onSelect={handleCustomDate}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldTitle}>
                Rendering Provider <span className={styles.required}>•</span>
              </label>
              <Select
                options={providerOptions.length ? providerOptions : providerAll}
                value={card.provider}
                onChange={(v) => onUpdate({ provider: v })}
                placeholder="Select Rendering Provider"
                searchable
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldTitle}>
                POS <span className={styles.required}>•</span>
              </label>
              <Select
                options={posOptions}
                value={card.pos}
                onChange={(v) => onUpdate({ pos: v })}
                placeholder="Select Place of Service"
              />
            </div>
            <div className={styles.field}>
              {dosIsExisting ? (
                <>
                  <label className={styles.fieldTitle}>
                    Document Type <span className={styles.required}>•</span>
                  </label>
                  <Select
                    options={docTypeOptions}
                    value={card.docType}
                    onChange={(v) => onUpdate({ docType: v })}
                    placeholder="Select Document Type"
                  />
                </>
              ) : (
                <>
                  <label className={styles.fieldTitle}>
                    Visit Type <span className={styles.required}>•</span>
                  </label>
                  <Select
                    options={vtOptions}
                    value={card.visitType}
                    onChange={handleVtChange}
                    placeholder="Select Visit Type"
                  />
                </>
              )}
            </div>
          </div>

          {showEvidenceList && (
            <div className={styles.evidenceWrap}>
              <label className={styles.fieldTitle}>
                Evidence Documentation <span className={styles.required}>•</span>
              </label>
              <div className={styles.evidenceCard}>
                <div className={styles.evidenceHeader}>Select From already Linked</div>
                {memberDocs.length === 0 ? (
                  <div className={styles.evidenceEmpty}>No documents linked to this DOS yet.</div>
                ) : memberDocs.map((d) => (
                  <div key={d.id} className={styles.evidenceRow}>
                    <Checkbox
                      checked={card.linkedDocIds.has(d.id)}
                      onCheckedChange={() => toggleLinkedDoc(d.id)}
                    />
                    <span className={styles.evidenceName}>
                      {d.caption || d.n}
                      {d.t && <span className={styles.evidenceType}> ({d.t})</span>}
                    </span>
                    <ActionButton
                      size="S"
                      icon="solar:eye-linear"
                      tooltip="Preview"
                      onClick={() => {}}
                    />
                  </div>
                ))}
                {!card.showUpload && (
                  <button
                    type="button"
                    className={styles.uploadNewLink}
                    onClick={() => onUpdate({ showUpload: true })}
                  >
                    <Icon name="solar:add-circle-linear" size={14} color="var(--primary-300)" />
                    <span>Upload New Evidence</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {showDropzone && (
            <div className={styles.uploadWrap}>
              <DemoPhiStrip />
              <label
                className={[styles.dropzone, dragOver ? styles.dropzoneActive : ''].filter(Boolean).join(' ')}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <Icon name="solar:upload-linear" size={24} color="var(--neutral-300)" />
                <div className={styles.dropzoneText}>
                  {card.file ? (
                    <span className={styles.fileName}>{card.file.name}</span>
                  ) : (
                    <>
                      <span>Drag and drop file here or </span>
                      <span className={styles.chooseFile}>Choose file</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className={styles.fileInput}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => onUpdate({ file: e.target.files?.[0] || null })}
                />
              </label>
              <div className={styles.dropzoneMeta}>
                <span>Supported formats: PDF, DOC, JPG, or PNG</span>
                <span>Max size: 100 MB</span>
              </div>
            </div>
          )}

          {/* Footer actions — only rendered in the inline RHS flow (when the
              parent passes `onSave`). The batch/panel flow relies on its own
              header-level Save instead. */}
          {onSave && (
            <div className={styles.cardFooter}>
              <Button
                variant="primary"
                size="S"
                disabled={saveDisabled}
                onClick={onSave}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                size="S"
                onClick={onRemove}
              >
                Cancel
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
