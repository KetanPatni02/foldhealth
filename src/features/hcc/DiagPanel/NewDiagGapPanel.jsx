import { useCallback, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { CloseIcon } from '../../../components/Icon/CloseIcon';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { Button } from '../../../components/Button/Button';
import { Select } from '../../../components/Select/Select';
import { Checkbox } from '../../../components/ui/checkbox';
import { IcdSearch } from '../../../components/IcdSearch/IcdSearch';
import { POS_BY_VT, PROVIDER_POOL_BY_VT, VISIT_TYPES } from '../reference/visitTypes';
import { getChartDocs, DOC_TYPES } from '../data/chartDocs';
import styles from './NewDiagGapPanel.module.css';

// Sentinel value in the DOS dropdown that triggers a native date picker.
const DOS_CUSTOM = '__custom__';

// Per-card state factory — every new ICD pick gets its own copy.
const makeCard = (icd) => ({
  pick: icd,
  dos: '',
  dosMode: 'existing',   // 'existing' | 'custom'
  provider: '',
  pos: '',
  visitType: '',
  docType: '',
  file: null,
  linkedDocIds: new Set(),
  showUpload: false,     // in existing-DOS mode, render the dropzone below the linked list
  collapsed: false,
});

/**
 * NewDiagGapPanel — left-workspace variant for adding one or more Diagnosis
 * Gaps to the current member. The search input stays visible so multiple ICDs
 * can be stacked (newest on top), each with its own expand/collapse header.
 *
 * Per-card DOS modes (Figma 5011:175401 / 5011:177706):
 *  • Existing DOS  — auto-populates Provider/POS/VT; 4th field becomes
 *    Document Type; Evidence Documentation list shows already-linked docs
 *    with an inline "Upload New Evidence" dropzone toggle.
 *  • Custom Date    — opens the native date picker; nothing auto-populates;
 *    4th field stays Visit Type; upload dropzone is the only file source.
 */
export function NewDiagGapPanel({ onClose, member, excludeCodes = [] }) {
  const addHccGap = useAppStore(s => s.addHccGap);
  const showToast = useAppStore(s => s.showToast);
  const addedCharts = useAppStore(s => s.hccAddedCharts?.[member?.id]);

  const [cards, setCards] = useState([]);

  const memberDosList = useMemo(
    () => (member?.dos_list || []).filter(d => d?.date),
    [member?.dos_list],
  );

  const memberDocs = useMemo(
    () => (member ? getChartDocs(member, addedCharts || []) : []),
    [member, addedCharts],
  );

  const dosOptions = useMemo(() => [
    ...memberDosList.map(d => ({ value: d.date, label: d.date })),
    { value: DOS_CUSTOM, label: '+ Custom Date' },
  ], [memberDosList]);

  const providerAll = useMemo(
    () => [...new Set(Object.values(PROVIDER_POOL_BY_VT).flat())].map(n => ({ value: n, label: n })),
    [],
  );

  const posOptions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const p of Object.values(POS_BY_VT)) {
      if (seen.has(p.code)) continue;
      seen.add(p.code);
      out.push({ value: p.code, label: `${p.code} — ${p.desc}` });
    }
    return out;
  }, []);

  const vtOptions = VISIT_TYPES.map(vt => ({ value: vt, label: vt }));
  const docTypeOptions = DOC_TYPES.map(t => ({ value: t, label: t }));

  const excludeForSearch = useMemo(
    () => [...excludeCodes, ...cards.map(c => c.pick?.code).filter(Boolean)],
    [excludeCodes, cards],
  );

  const updateCard = useCallback((idx, patch) => {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c));
  }, []);

  const removeCard = useCallback((idx) => {
    setCards(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const canSaveCard = (c) => !!c.pick && !!c.dos && !!c.provider && !!c.pos && (
    isDosExisting(c, memberDosList)
      ? !!c.docType && (c.linkedDocIds.size > 0 || !!c.file)
      : !!c.visitType
  );

  const canSave = cards.length > 0 && cards.every(canSaveCard);

  const handleSave = () => {
    if (!canSave) return;
    for (const c of cards) {
      const existing = isDosExisting(c, memberDosList);
      addHccGap({
        code: c.pick.code,
        desc: c.pick.title,
        hcc: c.pick.hcc || '',
        dos: c.dos,
        provider: c.provider,
        pos: c.pos,
        ...(existing
          ? { docType: c.docType, linkedDocIds: [...c.linkedDocIds] }
          : { visitType: c.visitType }),
      });
    }
    showToast(`Added ${cards.length} ICD${cards.length === 1 ? '' : 's'} — Manually Added`);
    onClose?.();
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>New Diagnosis Gap</span>
        <div className={styles.headerRight}>
          <Button
            variant="primary"
            size="S"
            disabled={!canSave}
            onClick={handleSave}
          >
            Save
          </Button>
          <span className={styles.headerDivider} />
          <ActionButton size="L" tooltip="Close" onClick={onClose}>
            <CloseIcon size={20} color="var(--neutral-300)" />
          </ActionButton>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.fieldLabel}>Search and Add ICD Codes</div>
        <IcdSearch
          placeholder="Search Diagnosis"
          excludeCodes={excludeForSearch}
          onSelect={(icd) => setCards(prev => [makeCard(icd), ...prev])}
        />

        {cards.map((card, idx) => (
          <IcdCard
            key={`${card.pick.code}-${idx}`}
            card={card}
            member={member}
            memberDosList={memberDosList}
            memberDocs={memberDocs}
            dosOptions={dosOptions}
            posOptions={posOptions}
            vtOptions={vtOptions}
            docTypeOptions={docTypeOptions}
            providerAll={providerAll}
            onUpdate={(patch) => updateCard(idx, patch)}
            onRemove={() => removeCard(idx)}
          />
        ))}
      </div>
    </div>
  );
}

function isDosExisting(card, memberDosList) {
  return card.dosMode === 'existing' && !!card.dos
    && memberDosList.some(d => d.date === card.dos);
}

function IcdCard({
  card, member, memberDosList, memberDocs,
  dosOptions, posOptions, vtOptions, docTypeOptions, providerAll,
  onUpdate, onRemove,
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

  const dosIsExisting = isDosExisting(card, memberDosList);

  const handleDosSelect = (nextDos) => {
    if (nextDos === DOS_CUSTOM) {
      // Fire the native picker synchronously so it opens as part of the
      // user-gesture click (some browsers require this).
      customDateRef.current?.showPicker?.();
      customDateRef.current?.click?.();
      return;
    }
    // Existing DOS chosen → auto-populate the other three fields from that
    // DOS's record. Reverse-lookup POS → Visit Type so the VT dropdown reads
    // the right label.
    const match = memberDosList.find(d => d.date === nextDos);
    const vt = match?.pos ? Object.entries(POS_BY_VT).find(([, p]) => p.code === match.pos)?.[0] : '';
    onUpdate({
      dos: nextDos,
      dosMode: 'existing',
      provider: match?.provider || '',
      pos: match?.pos || '',
      visitType: vt || '',
      docType: '',
      linkedDocIds: new Set(),
      showUpload: false,
    });
  };

  const handleCustomDate = (e) => {
    const raw = e.target.value; // yyyy-mm-dd
    if (!raw) return;
    const [y, m, d] = raw.split('-');
    const formatted = `${m}/${d}/${y}`;
    onUpdate({
      dos: formatted,
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
        <ActionButton
          size="S"
          icon="solar:trash-bin-2-linear"
          tooltip="Remove"
          onClick={onRemove}
        />
      </div>

      {!card.collapsed && (
        <>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.fieldTitle}>
                DOS <span className={styles.required}>•</span>
              </label>
              <Select
                options={dosOptions}
                value={card.dos && !dosIsExisting ? '' : card.dos}
                onChange={handleDosSelect}
                placeholder={card.dos && card.dosMode === 'custom' ? card.dos : 'Select Date of Service'}
              />
              <input
                ref={customDateRef}
                type="date"
                className={styles.hiddenDate}
                onChange={handleCustomDate}
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
                      onClick={() => {/* preview action wired later */}}
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
        </>
      )}
    </div>
  );
}
