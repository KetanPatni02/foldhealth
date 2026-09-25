// Local fallback for the practice's referral sender lines until
// supabase/caregap_referrals_migration.sql has run. Mirrors that file's seed
// rows (same ids) so switching to the DB changes nothing on screen.
// ("Refer to" recipients are the system users in profiles, not a mock.)

export const REFERRAL_SENDER_LINES_MOCK = [
  { id: 'rs-efax-1', channel: 'efax', label: 'Primary Office', value: '(619) 555-1234', isDefault: true },
  { id: 'rs-efax-2', channel: 'efax', label: 'Care Management', value: '(619) 555-1288', isDefault: false },
  { id: 'rs-email-1', channel: 'email', label: 'Referrals Desk', value: 'referrals@fold.example', isDefault: true },
  { id: 'rs-email-2', channel: 'email', label: 'Care Management', value: 'caremgmt@fold.example', isDefault: false },
  { id: 'rs-sms-1', channel: 'sms', label: 'Primary Office', value: '(619) 555-1200', isDefault: true },
];
