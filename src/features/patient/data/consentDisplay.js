import { CONSENT_CHANNELS, CONSENT_METHODS, CONSENT_PROGRAMS, consentState, requiredConsentScopes } from './consentRules';

// Labels and Badge tones for consent states, shared by the consent popover,
// the Overview Consent card and the Capture Consent drawer.

const STATE = {
  given: { label: 'Consent given', tone: 'success', icon: 'solar:check-circle-linear', color: 'var(--status-success)' },
  declined: { label: 'Declined', tone: 'grey', icon: 'solar:close-circle-linear', color: 'var(--neutral-300)' },
  withdrawn: { label: 'Withdrawn', tone: 'error', icon: 'solar:close-circle-linear', color: 'var(--status-error)' },
  expired: { label: 'Expired', tone: 'warning', icon: 'solar:clock-circle-linear', color: 'var(--status-warning)' },
  missing: { label: 'Not on file', tone: 'warning', icon: 'solar:danger-circle-linear', color: 'var(--status-warning)' },
};

export const consentStateLabel = (state) => STATE[state]?.label || STATE.missing.label;
export const consentStateStyle = (state) => STATE[state] || STATE.missing;

const mdy = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

// A date-only 'YYYY-MM-DD' parsed as local time, not UTC midnight.
const mdyDay = (ymd) => (ymd ? mdy(`${ymd}T00:00:00`) : '');

/** "Verbal · 01/10/2026 · Dana Lee", plus the expiry when it has one. */
export function formatConsentMeta(record) {
  if (!record) return '';
  const method = CONSENT_METHODS.find(m => m.value === record.method)?.label;
  const parts = [method, mdy(record.capturedAt), record.capturedBy];
  if (record.expiresOn) parts.push(`expires ${mdyDay(record.expiresOn)}`);
  return parts.filter(Boolean).join(' · ');
}

const scopeLabel = (scopeType, scope) => (scopeType === 'program'
  ? `${scope} Consent`
  : CONSENT_CHANNELS.find(c => c.scope === scope)?.label || scope);

/**
 * Popover sections: program consents (the ones the patient's open
 * enrollments require first, marked "Required") then channel consents.
 */
export function consentSections(consents, programs, today = new Date()) {
  const required = new Set(requiredConsentScopes(programs));
  const row = (scopeType, scope) => {
    const { state, record } = consentState(consents, scopeType, scope, today);
    const style = consentStateStyle(state);
    const meta = formatConsentMeta(record);
    const status = [style.label, meta].filter(Boolean).join(' · ');
    return {
      id: `${scopeType}:${scope}`,
      scopeType,
      scope,
      state,
      label: scopeLabel(scopeType, scope),
      status: required.has(scope) && state !== 'given' ? `Required · ${status}` : status,
      icon: style.icon,
      color: style.color,
    };
  };
  const programRows = CONSENT_PROGRAMS
    .map(p => row('program', p.scope))
    .sort((a, b) => Number(required.has(b.scope)) - Number(required.has(a.scope)));
  return [
    { id: 'program', title: 'Program Consent', items: programRows },
    { id: 'channel', title: 'Communication Consent', items: CONSENT_CHANNELS.map(c => row('channel', c.scope)) },
  ];
}

/** Every record, newest first, for the audit view. */
export function consentHistory(consents) {
  return [...(consents || [])]
    .sort((a, b) => String(b.capturedAt).localeCompare(String(a.capturedAt)))
    .map(c => ({
      id: c.id,
      label: scopeLabel(c.scopeType, c.scope),
      status: consentStateLabel(c.status),
      meta: [formatConsentMeta(c), c.witness && `witness ${c.witness}`, c.note].filter(Boolean).join(' · '),
    }));
}
