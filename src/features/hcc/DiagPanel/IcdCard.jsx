import { useMemo, useRef, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { POS_BY_VT, PROVIDER_POOL_BY_VT } from '../reference/visitTypes';
import { DOS_CUSTOM, isDosOnAnyRow, canSaveCard, buildEffectiveDosOptions, resolveDosEntry, populateFieldsFromEntry } from './IcdCard.utils';
import { IcdCardBody } from './IcdCardBody';
import styles from './NewDiagGapPanel.module.css';

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

  const effectiveDosOptions = useMemo(
    () => buildEffectiveDosOptions(card.dosList, dosOptions),
    [card.dosList, dosOptions],
  );

  const handleDosMultiChange = (nextValues) => {
    // Rebuild dosList so we keep the entry shape (mode/memberId) rather
    // than losing it. Preserve the order in which values were added.
    const prevByValue = new Map(card.dosList.map(d => [d.value, d]));
    const nextList = nextValues.map(v => prevByValue.get(v) || resolveDosEntry(v, dosOptions, member?.id));

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
      populateFieldsFromEntry(only, patch, memberDosList);
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
        <IcdCardBody
          card={card}
          memberDocs={memberDocs}
          effectiveDosOptions={effectiveDosOptions}
          providerOptions={providerOptions}
          providerAll={providerAll}
          posOptions={posOptions}
          vtOptions={vtOptions}
          docTypeOptions={docTypeOptions}
          dosIsExisting={dosIsExisting}
          showEvidenceList={showEvidenceList}
          showDropzone={showDropzone}
          saveDisabled={saveDisabled}
          dragOver={dragOver}
          customDateRef={customDateRef}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onSave={onSave}
          handleDosSelect={handleDosSelect}
          handleCustomDate={handleCustomDate}
          handleVtChange={handleVtChange}
          toggleLinkedDoc={toggleLinkedDoc}
          setDragOver={setDragOver}
          onDrop={onDrop}
        />
      )}
    </div>
  );
}
