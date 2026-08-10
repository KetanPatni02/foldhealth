import { ICDS as ICDS_BY_MEMBER } from '../data/icds';

export { ICDS_BY_MEMBER };

export const ACCEPT_EXT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.tif,.tiff';

const ACCEPT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/tiff',
]);

export function isAcceptedFile(file) {
  if (!file) return false;
  if (ACCEPT_MIME.has(file.type)) return true;
  return /\.(pdf|docx?|jpe?g|png|tiff?)$/i.test(file.name || '');
}

export function filterPatientMatches(hccMembers, patientQuery) {
  const q = patientQuery.trim().toLowerCase();
  if (!q) return hccMembers.slice(0, 6);
  return hccMembers
    .filter(m => (m.name || '').toLowerCase().includes(q))
    .slice(0, 8);
}

export function buildAllIcds() {
  const map = new Map();
  Object.values(ICDS_BY_MEMBER).forEach(list => {
    (list || []).forEach(item => {
      if (!map.has(item.code)) map.set(item.code, item);
    });
  });
  return [...map.values()];
}

export function filterIcdMatches(allIcds, icdQuery) {
  const q = icdQuery.trim().toLowerCase();
  if (!q) return [];
  return allIcds
    .filter(i =>
      (i.code || '').toLowerCase().includes(q) ||
      (i.desc || '').toLowerCase().includes(q),
    )
    .slice(0, 6);
}
