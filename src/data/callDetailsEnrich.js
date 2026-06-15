/* ── Compliance & quality enrichment for call records ──
   Split out from callDetails.js so this small function can be statically
   imported without dragging in the large _rawCallDetails array. */

const COMPLIANCE_DATA = {
  completed: {
    aiDisclosed: true,
    recordingConsent: 'obtained',
    identityVerified: true,
    emergencyDetected: false,
    tcpaCompliant: 'pass',
  },
  ongoing: {
    aiDisclosed: true,
    recordingConsent: 'obtained',
    identityVerified: false,
    emergencyDetected: false,
    tcpaCompliant: 'pass',
  },
  voicemail: {
    aiDisclosed: false,
    recordingConsent: 'na',
    identityVerified: false,
    emergencyDetected: false,
    tcpaCompliant: 'pass',
  },
};

const PATIENT_COMPLIANCE_OVERRIDES = {
  p4: { tcpaCompliant: 'warn', recordingConsent: 'na' },
  p10: { identityVerified: false },
  p14: { emergencyDetected: true },
};

const QUALITY_DATA = {
  cd2:  { qualityScore: { overall: 92, intentAccuracy: 95, outcomeAppropriateness: 90, escalationTimeliness: 88, complianceDisclosure: 96 }, sentimentScore: { overall: 78, label: 'positive' } },
  cd4:  { qualityScore: { overall: 78, intentAccuracy: 80, outcomeAppropriateness: 68, escalationTimeliness: 72, complianceDisclosure: 76 }, sentimentScore: { overall: 55, label: 'neutral' } },
  cd6:  { qualityScore: { overall: 85, intentAccuracy: 88, outcomeAppropriateness: 82, escalationTimeliness: 84, complianceDisclosure: 86 }, sentimentScore: { overall: 72, label: 'positive' } },
  cd12: { qualityScore: { overall: 70, intentAccuracy: 75, outcomeAppropriateness: 64, escalationTimeliness: 70, complianceDisclosure: 72 }, sentimentScore: { overall: 42, label: 'negative' } },
  cd16: { qualityScore: { overall: 78, intentAccuracy: 82, outcomeAppropriateness: 76, escalationTimeliness: 74, complianceDisclosure: 80 }, sentimentScore: { overall: 60, label: 'neutral' } },
  cd18: { qualityScore: { overall: 82, intentAccuracy: 85, outcomeAppropriateness: 80, escalationTimeliness: 78, complianceDisclosure: 84 }, sentimentScore: { overall: 65, label: 'positive' } },
  cd21: { qualityScore: { overall: 96, intentAccuracy: 98, outcomeAppropriateness: 95, escalationTimeliness: 92, complianceDisclosure: 98 }, sentimentScore: { overall: 88, label: 'positive' } },
  cdi1: { qualityScore: { overall: 88, intentAccuracy: 90, outcomeAppropriateness: 86, escalationTimeliness: 85, complianceDisclosure: 90 }, sentimentScore: { overall: 75, label: 'positive' } },
  cdi2: { qualityScore: { overall: 65, intentAccuracy: 68, outcomeAppropriateness: 62, escalationTimeliness: 60, complianceDisclosure: 66 }, sentimentScore: { overall: 45, label: 'neutral' } },
  cdi3: { qualityScore: { overall: 94, intentAccuracy: 96, outcomeAppropriateness: 92, escalationTimeliness: 90, complianceDisclosure: 95 }, sentimentScore: { overall: 82, label: 'positive' } },
};

const ESCALATION_DATA = {
  cd7:  { trigger: 'max-turns', detail: 'Patient unreachable after 3 attempts', confidence: null, sentiment: null },
  cd12: { trigger: 'sentiment', detail: 'Patient expressed frustration about inhaler refill', confidence: 62, sentiment: -0.35 },
};

const SECURITY_DATA = {
  completed: { piiScrubbed: true, stateCompliance: 'TX', dataRetentionDays: 90, promptInjectionDetected: false },
  ongoing: { piiScrubbed: false, stateCompliance: 'TX', dataRetentionDays: 90, promptInjectionDetected: false },
  voicemail: { piiScrubbed: true, stateCompliance: 'TX', dataRetentionDays: 90, promptInjectionDetected: false },
};

const SUBAGENT_DATA = {
  cd2:  { subAgentsInvoked: ['Identity Verifier', 'Med Reconciler', 'Appointment Scheduler'], detectedIntents: ['confirm-identity', 'review-medications', 'schedule-followup'] },
  cd21: { subAgentsInvoked: ['Identity Verifier', 'Med Reconciler', 'Appointment Scheduler', 'Cardiac Rehab Referrer'], detectedIntents: ['confirm-identity', 'medication-adherence', 'schedule-followup', 'rehab-referral'] },
  cd4:  { subAgentsInvoked: ['Identity Verifier', 'Language Detector'], detectedIntents: ['confirm-identity', 'language-preference', 'medication-question'] },
};

export function enrichCallRecord(record) {
  const base = COMPLIANCE_DATA[record.callType] || COMPLIANCE_DATA.ongoing;
  const patientOverride = PATIENT_COMPLIANCE_OVERRIDES[record.patientId] || {};
  const quality = QUALITY_DATA[record.id] || null;
  const escalation = ESCALATION_DATA[record.id] || null;
  const security = SECURITY_DATA[record.callType] || SECURITY_DATA.ongoing;
  const subagent = SUBAGENT_DATA[record.id] || null;

  return {
    ...record,
    direction: record.direction || (record.callType === 'voicemail' ? 'missed' : record.callType === 'declined' ? 'declined' : 'outgoing'),
    compliance: { ...base, ...patientOverride },
    qualityScore: quality?.qualityScore || null,
    sentimentScore: quality?.sentimentScore || null,
    escalation,
    security,
    subAgentsInvoked: subagent?.subAgentsInvoked || null,
    detectedIntents: subagent?.detectedIntents || null,
  };
}
