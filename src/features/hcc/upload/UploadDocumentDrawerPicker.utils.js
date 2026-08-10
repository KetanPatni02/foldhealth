export const ACCEPT_EXT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.tiff,.tif';
export const ACCEPT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/tiff',
]);

export const EXTRACT_BUCKETS = [
  { key: 'review', label: 'Needs Review', icon: 'solar:danger-circle-linear', tone: 'review' },
  { key: 'unreadable', label: 'Unreadable', icon: 'solar:danger-triangle-linear', tone: 'unreadable' },
  { key: 'added', label: 'Added to Worklist', icon: 'solar:check-circle-linear', tone: 'added' },
];

export function isAcceptedFile(file) {
  if (!file) return false;
  if (ACCEPT_MIME.has(file.type)) return true;
  return /\.(pdf|docx?|jpe?g|png|tiff?)$/i.test(file.name || '');
}

export { shortDate } from './UploadDocumentDrawer.helpers';
