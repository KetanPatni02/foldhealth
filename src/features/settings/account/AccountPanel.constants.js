export const HCC_ROLES = ['Support', 'Coder', 'QA', 'Compliance'];

export const ROLE_COLORS = {
  'Support':                       'toc-attempted',
  'Coder':                         'ai-care',
  'QA':                            'ai-med',
  'Compliance':                    'compliance-warn',
  'Physician/Doctor':              'ai-care', 'Nurse': 'toc-engaged', 'Medical Assistant': 'status-scheduled',
  'Admin/Practice Manager':        'outreach-post-visit', 'Billing Specialist': 'compliance-warn',
  'Front Desk Staff/Receptionist': 'ai-neutral', 'Lab Technician': 'status-queued',
  'Pharmacist':                    'ai-med', 'Health Information Manager (HIM)': 'ai-care',
  'Radiologist':                   'toc-engaged', 'Patient': 'ai-neutral',
};

export function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '');
}
