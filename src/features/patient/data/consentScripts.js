import { DEFAULT_ITEMS } from '../../forms/builder/memberConsent';

// What the care team reads or shows the patient before capturing consent.
// CCM, APCM and BHI share their wording with the Forms "Member Consent"
// component so a form and a capture say the same thing.
const agreement = (id) => DEFAULT_ITEMS.find(i => i.id === id)?.agreement || '';

const RIGHTS = 'You can stop at any time, and cost sharing may apply.';

export const CONSENT_SCRIPTS = {
  'program:CCM': `${agreement('ccm')} Only one practitioner can bill for CCM in a calendar month. ${RIGHTS}`,
  'program:APCM': agreement('apcm'),
  'program:RPM': `Remote Patient Monitoring (RPM) uses a connected device to send your readings, such as blood pressure or glucose, to your care team between visits. Only one practitioner can bill for RPM in a calendar month. ${RIGHTS}`,
  'program:BHI': `${agreement('bhi')} ${RIGHTS}`,
  'channel:call': 'May we call you at this number about your care, appointments and test results?',
  'channel:sms': 'May we send text messages to this number about your care and appointments? Message and data rates may apply. Reply STOP at any time to stop.',
  'channel:email': 'May we email you about your care and appointments? Emails may include your name and appointment details.',
  'channel:tcpa': 'By signing, you agree that we may contact you at this number using automated or prerecorded calls and text messages about your care. Consent is not a condition of receiving care, and you can revoke it at any time.',
};

export const consentScript = (scopeType, scope) => CONSENT_SCRIPTS[`${scopeType}:${scope}`] || '';
