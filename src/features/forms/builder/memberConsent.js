const DEFAULT_ITEMS = [
  {
    id: 'ccm',
    name: 'CCM',
    category: 'program',
    included: true,
    mandatory: true,
    agreement: 'CHRONIC CARE MANAGEMENT (CCM) is offered to all eligible patients who have been diagnosed with two (2) or more chronic conditions that are expected to last at least twelve (12) months and that place patient at significant risk of further decline.',
  },
  {
    id: 'apcm',
    name: 'APCM',
    category: 'program',
    included: true,
    mandatory: true,
    agreement: 'ADVANCED PRIMARY CARE MANAGEMENT (APCM) is offered to all patients. By voluntarily selecting the service you fully understand only one healthcare provider can furnish and be compensated during the calendar month. You also understand cost sharing may apply, and you have the right to stop APCM services at any time.',
  },
  {
    id: 'bhi',
    name: 'BHI',
    category: 'program',
    included: true,
    mandatory: false,
    agreement: 'BEHAVIORAL HEALTH INTEGRATION (BHI) is offered to all eligible patients who have services provided for behavioral health disorders, who are participating in psychiatric collaborative care programs, or are receiving behavioral health integration services.',
  },
  {
    id: 'podiatry',
    name: 'Podiatry',
    category: 'service',
    included: true,
    mandatory: false,
    agreement: 'Podiatry services provide routine and medically necessary foot care from a qualified provider.',
  },
  {
    id: 'mental-health',
    name: 'Mental Health / Psychiatry',
    category: 'service',
    included: true,
    mandatory: false,
    agreement: 'Mental Health and Psychiatry services support emotional, behavioral, or cognitive needs, including medication management.',
  },
  {
    id: 'wound-care',
    name: 'Wound Care',
    category: 'service',
    included: true,
    mandatory: false,
    agreement: 'Wound Care services provide ongoing assessment and treatment for wounds requiring specialized clinical attention.',
  },
];

export const CONSENT_CATEGORY_OPTIONS = [
  { value: 'program', label: 'Care Program' },
  { value: 'service', label: 'Service Line' },
];

export function consentQuestion(item) {
  return {
    type: 'choice',
    control: 'consent',
    text: item.name,
    description: item.agreement,
    required: !!item.mandatory,
    consentKey: item.id,
    consentCategory: item.category,
    options: [
      { value: 'consented', label: `I give my consent for ${item.name}` },
      { value: 'declined', label: `I decline to give my consent for ${item.name}` },
    ],
  };
}

export function makeMemberConsent() {
  const consentItems = [];
  const items = [];
  for (const defaultItem of DEFAULT_ITEMS) {
    const item = { ...defaultItem };
    consentItems.push(item);
    if (item.included) items.push(consentQuestion(item));
  }
  return {
    type: 'group',
    text: 'Member Consent',
    description: 'Review each selected program or service and record the member’s decision.',
    healthKey: 'memberConsent',
    required: true,
    reusable: false,
    shareWithPatient: true,
    consentItems,
    items,
  };
}

export function syncConsentQuestions(existingQuestions, consentItems, assignIds) {
  const existing = new Map(
    (existingQuestions || []).map((question) => [question.consentKey, question]),
  );

  const questions = [];
  for (const item of consentItems || []) {
    if (!item.included) continue;
    const current = existing.get(item.id);
    const next = { ...consentQuestion(item), linkId: current?.linkId };
    questions.push(next.linkId ? next : assignIds(next));
  }
  return questions;
}

export function createCustomConsentItem(name, category, id = `custom-${Date.now()}`) {
  const trimmed = name.trim();
  return {
    id,
    name: trimmed,
    category,
    included: true,
    mandatory: false,
    agreement: `${trimmed} consent authorizes the care team to provide this service. The member may withdraw consent at any time.`,
    custom: true,
  };
}
