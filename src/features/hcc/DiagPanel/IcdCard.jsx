import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Button } from '../../../components/Button/Button';
import { Select } from '../../../components/Select/Select';
import { DatePicker } from '../../../components/DatePicker/DatePicker';
import { Checkbox } from '../../../components/ui/checkbox';
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
// dosMode:
//   'existing' — DOS is in the current row's dos_list
//   'sibling'  — DOS is in another same-patient row's dos_list; dosMemberId
//                identifies which row so Save can route the ICD there
//   'custom'   — brand-new DOS not on any row for this patient; Save spawns
//                a fresh worklist row
export const makeCard = (icd) => ({
  pick: icd,
  dos: '',
  dosValue: '',
  dosMemberId: null,
  dosMode: 'existing',
  provider: '',
  pos: '',
  visitType: '',
  docType: '',
  file: null,
  linkedDocIds: new Set(),
  showUpload: false,
  collapsed: false,
});

export function isDosOnCurrentRow(card, memberDosList) {
  return card.dosMode === 'existing' && !!card.dos
    && memberDosList.some(d => d.date === card.dos);
}
// True whenever the picked DOS resolves to an existing dos_list row (this
// patient's current row OR one of its sibling Created-date rows) — used to
// decide whether to show the Document-Type + Evidence-list mode.
export function isDosOnAnyRow(card, memberDosList) {
  return (card.dosMode === 'existing' || card.dosMode === 'sibling') && !!card.dos
    && (memberDosList.some(d => d.date === card.dos) || card.dosMode === 'sibling');
}

// Validity check for the per-card Save affordance in the RHS inline flow.
export function canSaveCard(card, memberDosList) {
  return !!card.pick && !!card.dos && !!card.provider && !!card.pos && (
    isDosOnAnyRow(card, memberDosList)
      ? !!card.docType && (card.linkedDocIds.size > 0 || !!card.file)
      : !!card.visitType
  );
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

  const dosIsExisting = isDosOnAnyRow(card, memberDosList);

  const effectiveDosOptions = useMemo(() => {
    if (card.dosMode === 'custom' && card.dos) {
      const customEntry = { value: card.dos, label: card.dos };
      const rest = dosOptions.filter(o => o.value !== DOS_CUSTOM);
      const changeAction = dosOptions.find(o => o.value === DOS_CUSTOM);
      return [customEntry, ...rest, changeAction].filter(Boolean);
    }
    return dosOptions;
  }, [card.dosMode, card.dos, dosOptions]);

  const handleDosSelect = (nextValue) => {
    if (nextValue === DOS_CUSTOM) {
      customDateRef.current?.showPicker?.();
      customDateRef.current?.click?.();
      return;
    }
    const opt = dosOptions.find(o => o.value === nextValue && o.type !== 'header');
    if (!opt) return;
    const dosDate = opt.dosDate || opt.value;
    if (opt.memberId === member?.id) {
      const match = memberDosList.find(d => d.date === dosDate);
      if (!match) return;
      const vt = match.pos ? Object.entries(POS_BY_VT).find(([, p]) => p.code === match.pos)?.[0] : '';
      onUpdate({
        dos: dosDate, dosValue: nextValue, dosMemberId: member?.id,
        dosMode: 'existing',
        provider: match.provider || '', pos: match.pos || '', visitType: vt || '',
        docType: '', linkedDocIds: new Set(), showUpload: false,
      });
    } else if (opt.memberId) {
      const s = useAppStore.getState();
      const sib = s.hccMembers.find(m => m.id === opt.memberId);
      const sibDos = sib?.dos_list?.find(d => d.date === dosDate);
      const vt = sibDos?.pos ? Object.entries(POS_BY_VT).find(([, p]) => p.code === sibDos.pos)?.[0] : '';
      onUpdate({
        dos: dosDate, dosValue: nextValue, dosMemberId: opt.memberId,
        dosMode: 'sibling',
        provider: sibDos?.provider || '', pos: sibDos?.pos || '', visitType: vt || '',
        docType: '', linkedDocIds: new Set(), showUpload: false,
      });
    }
  };

  const handleCustomDate = (iso) => {
    if (!iso) return;
    const [y, m, d] = iso.split('-');
    const formatted = `${m}/${d}/${y}`;
    onUpdate({
      dos: formatted, dosValue: formatted, dosMemberId: null,
      dosMode: 'custom',
      provider: '', pos: '', visitType: '', docType: '',
      linkedDocIds: new Set(), showUpload: false,
    });
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
  const saveDisabled = !!onSave && !canSaveCard(card, memberDosList);

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
                options={effectiveDosOptions}
                value={card.dosValue || card.dos || ''}
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
