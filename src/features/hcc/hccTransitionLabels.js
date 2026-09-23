import { ROLE_KEY_BY_USER } from './DiagPanel/DiagPanel.utils';

/** Human-readable labels for HCC DOS lifecycle transitions (activity log). */
export const HCC_TRANSITION_LABEL = {
  markSupportInProgress: 'Support In Progress',
  completeSupport: 'Support Completed',
  markInsufficient: 'Marked Insufficient',
  rejectDos: 'DOS Rejected',
  completeCoder: 'Coding Completed',
  requestRecords: 'Records Requested',
  requestRecordsFrom: 'Records Requested',
  recordsReceived: 'Records Received',
  recordsReceivedFor: 'Records Received',
  completeReviewer: 'QA Completed',
  completeReviewer2: 'Compliance Completed',
  returnDos: 'DOS Returned',
  reassignRole: 'Role Reassigned',
};


/** Role key → the name used everywhere in the UI. */
export const HCC_ROLE_LABEL = { support: 'Support', coder: 'Coder', reviewer: 'QA', reviewer2: 'Compliance' };

// Which role's status the user is directly changing for each transition.
// Any other role whose status moves in the same transition was cascaded by
// the workflow engine.
const ROLE_BY_KIND = {
  markSupportInProgress: 'support',
  completeSupport: 'support',
  markInsufficient: 'support',
  markCoderInProgress: 'coder',
  completeCoder: 'coder',
  requestRecords: 'coder',
  recordsReceived: 'coder',
  markReviewerInProgress: 'reviewer',
  completeReviewer: 'reviewer',
  markReviewer2InProgress: 'reviewer2',
  completeReviewer2: 'reviewer2',
};

export function hccTransitionRole(kind, payload = {}, userRole) {
  if (ROLE_BY_KIND[kind]) return ROLE_BY_KIND[kind];
  if (kind === 'requestRecordsFrom' || kind === 'recordsReceivedFor') return payload.requesterRole || null;
  if (kind === 'returnDos') return payload.fromRole || null;
  if (kind === 'reassignRole') return payload.role || null;
  return ROLE_KEY_BY_USER[userRole] || null;
}

/** "Coder status changed to In Progress" */
export function hccRoleStatusHeadline(role, status) {
  const label = status === 'Reject' ? 'Rejected' : status;
  return `${HCC_ROLE_LABEL[role] || role} status changed to ${label}`;
}
