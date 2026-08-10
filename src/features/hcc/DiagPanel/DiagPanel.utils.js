export const isAISuggested = (icd) => ['Suspect', 'Recapture'].includes(icd.type || '');
export const CLOSED_ICD_STATUSES = new Set(['Accepted', 'Dismissed']);
export const ROLE_KEY_BY_USER = { Support: 'support', Coder: 'coder', QA: 'reviewer', Compliance: 'reviewer2' };
