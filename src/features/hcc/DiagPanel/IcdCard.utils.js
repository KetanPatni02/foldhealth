import { useAppStore } from '../../../store/useAppStore';
import { POS_BY_VT } from '../reference/visitTypes';

export const DOS_CUSTOM = '__custom__';

export const todayIso = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const makeCard = (icd) => ({
  pick: icd,
  dosList: [],
  provider: '',
  pos: '',
  visitType: '',
  docType: '',
  file: null,
  linkedDocIds: new Set(),
  showUpload: false,
  collapsed: false,
});

export function isDosOnAnyRow(card) {
  if (!card.dosList?.length) return false;
  return card.dosList.every(d => d.mode === 'existing' || d.mode === 'sibling');
}

export function canSaveCard(card) {
  if (!card.pick || !card.dosList?.length || !card.provider || !card.pos) return false;
  if (isDosOnAnyRow(card)) {
    return !!card.docType && (card.linkedDocIds.size > 0 || !!card.file);
  }
  return !!card.visitType;
}

export function buildEffectiveDosOptions(dosList, dosOptions) {
  const customEntries = [];
  for (const d of dosList) {
    if (d.mode === 'custom') customEntries.push({ value: d.value, label: d.value });
  }
  const rest = dosOptions.filter(o => o.value !== DOS_CUSTOM);
  const customAction = dosOptions.find(o => o.value === DOS_CUSTOM);
  return [
    ...customEntries,
    ...rest,
    customAction ? { ...customAction, singleAction: true } : null,
  ].filter(Boolean);
}

export function resolveDosEntry(val, dosOptions, memberId) {
  const opt = dosOptions.find(o => o.value === val && o.type !== 'header');
  if (!opt) return { value: val, dosDate: val, memberId: null, mode: 'custom' };
  const dosDate = opt.dosDate || opt.value;
  return {
    value: val,
    dosDate,
    memberId: opt.memberId || null,
    mode: opt.memberId === memberId ? 'existing' : opt.memberId ? 'sibling' : 'custom',
  };
}

export function populateFieldsFromEntry(entry, patch, memberDosList) {
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
}
