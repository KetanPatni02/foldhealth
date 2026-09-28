import { AttachmentCard } from './AttachmentCard';

export default {
  title: 'Components/AttachmentCard',
  component: AttachmentCard,
};

export const Pdf = {
  args: { name: 'employer-impact-report-2026-07-to-2026-09.pdf', size: 9.2 * 1024 * 1024, onPreview: () => {}, onDownload: () => {}, onRemove: () => {} },
};
export const Image = { args: { name: 'logo_white.png', size: 15.8 * 1024, onDownload: () => {} } };
export const FromDocuments = { args: { name: 'Care plan summary.docx', meta: 'From Documents', onRemove: () => {} } };
