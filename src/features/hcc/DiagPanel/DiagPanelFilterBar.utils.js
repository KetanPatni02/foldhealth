import { dosSourceLetter } from '../dosSource';

const parseDate = (mmddyyyy) => {
  if (!mmddyyyy || typeof mmddyyyy !== 'string') return null;
  const [m, d, y] = mmddyyyy.split('/');
  if (!m || !d || !y) return null;
  return { y, m, d, key: `${y}-${m}-${d}` };
};

export function icdMatchesFilters(icd, filters, memberOrCreatedDate) {
  const noneActive = !Object.values(filters || {}).some(v => v && v.length);
  if (noneActive) return true;

  const member = memberOrCreatedDate && typeof memberOrCreatedDate === 'object' ? memberOrCreatedDate : null;
  const memberCreatedDate = member ? member.date : memberOrCreatedDate;

  const parsed = parseDate(icd.last);
  if (filters.year?.length && !(parsed && filters.year.includes(parsed.y))) return false;
  if (filters.lastRec?.length && !(icd.last && filters.lastRec.includes(icd.last))) return false;

  if (filters.hcc?.length) {
    const hccShort = (icd.hcc || '').split(' - ')[0].trim();
    if (!filters.hcc.includes(hccShort)) return false;
  }

  if (filters.status?.length && !filters.status.includes(icd.status)) return false;
  if (filters.by?.length && !filters.by.includes(icd.by)) return false;

  if (filters.vt?.length) {
    const dosVt = icd.dos && Array.isArray(member?.dos_list)
      ? member.dos_list.find(d => d?.date === icd.dos)?.vt
      : null;
    const rowVt = dosVt || member?.visitType || member?.vt || icd.visitType;
    if (!rowVt || !filters.vt.includes(rowVt)) return false;
  }

  if (filters.claims?.length) {
    const hasDoc = member?.ch != null;
    const dosEntry = icd.dos && Array.isArray(member?.dos_list)
      ? member.dos_list.find(d => d?.date === icd.dos)
      : null;
    const source = icd.dos ? dosSourceLetter(dosEntry || icd.dos, hasDoc) : null;
    const bucket = source === 'C' ? 'Available' : 'Not Available';
    if (!filters.claims.includes(bucket)) return false;
  }

  if (filters.created?.length && !filters.created.includes(memberCreatedDate)) return false;

  return true;
}

export const activeFilterCount = (filters) =>
  Object.values(filters || {}).filter(v => v && v.length).length;

export const EMPTY_FILTERS = {
  year: [], hcc: [], status: [], by: [], created: [], lastRec: [], vt: [], claims: [],
};
