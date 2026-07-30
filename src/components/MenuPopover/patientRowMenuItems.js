// Standard patient-row action menu for worklists (TOC, CCM, …), rendered
// through MenuPopover. Every worklist shares the same Communication / Care
// Actions / Automation vocabulary; each appends its own Admin Actions via
// `admin`. onSelect in the caller receives the item's label as the key.
export function buildPatientRowMenuItems(admin = []) {
  return [
    { section: 'Communication' },
    { key: 'Send SMS', icon: 'solar:chat-round-line-linear', label: 'Send SMS' },
    { key: 'Send Email', icon: 'solar:letter-linear', label: 'Send Email' },
    { key: 'Start Meeting', icon: 'solar:videocamera-record-linear', label: 'Start Meeting' },
    { key: 'Chat', icon: 'solar:chat-dots-linear', label: 'Chat' },
    { divider: true },
    { section: 'Care Actions' },
    { key: 'Send Assessment', icon: 'solar:clipboard-check-linear', label: 'Send Assessment' },
    { key: 'Initiate Protocol', icon: 'solar:clipboard-check-linear', label: 'Initiate Protocol' },
    { key: 'Send Education', icon: 'solar:clipboard-check-linear', label: 'Send Education' },
    { key: 'Warm Referral', icon: 'solar:clipboard-check-linear', label: 'Warm Referral' },
    { key: 'Add to Program', icon: 'solar:clipboard-check-linear', label: 'Add to Program' },
    { key: 'Upload File', icon: 'solar:upload-linear', label: 'Upload File' },
    { key: 'Add Task', icon: 'solar:checklist-minimalistic-linear', label: 'Add Task' },
    { divider: true },
    { section: 'Automation' },
    { key: 'Run Automation', icon: 'solar:bolt-linear', label: 'Run Automation' },
    { divider: true },
    { section: 'Admin Actions' },
    ...admin,
  ];
}
