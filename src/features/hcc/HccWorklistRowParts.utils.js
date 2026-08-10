import { VT_SHORT } from './HccWorklistRowParts.constants';

export const vtShortLabel = (v) => VT_SHORT[v] || v || 'HCC';

// Derive role-offset date "MM/DD/YYYY" from a base date "MM/DD/YYYY".
// Matches the prototype's addDaysToDate helper (line 3490).
export function addDaysToDate(dateStr, days) {
  if (!dateStr) return '';
  const [mm, dd, yyyy] = dateStr.split('/').map((s) => parseInt(s, 10));
  if (!mm || !dd || !yyyy) return '';
  const d = new Date(yyyy, mm - 1, dd);
  d.setDate(d.getDate() + (days || 0));
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
}

const HCC_PROFILE_POOLS = {
  ipa: ['ACP', 'IPA-1', 'IPA-2', 'IPA-3'],
  hp:  ['Lab', 'Scan', 'X-Ray'],
  dec: ['3', '4', '5', '6', '7', '8', '9', '10'],
  coh: ['HCC', 'PCP'],
  ad:  ['1', '2', '3', '4', '5'],
  fr:  ['1', '2', '3', '4', '5'],
};

function seedHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function synthesizeHccProfile(patient) {
  const seed = seedHash(String(patient.memberId || patient.id || patient.name || ''));
  return {
    ipa: HCC_PROFILE_POOLS.ipa[seed % HCC_PROFILE_POOLS.ipa.length],
    hp:  HCC_PROFILE_POOLS.hp[(seed >> 3) % HCC_PROFILE_POOLS.hp.length],
    dec: HCC_PROFILE_POOLS.dec[(seed >> 6) % HCC_PROFILE_POOLS.dec.length],
    coh: HCC_PROFILE_POOLS.coh[(seed >> 9) % HCC_PROFILE_POOLS.coh.length],
    ad:  HCC_PROFILE_POOLS.ad[(seed >> 12) % HCC_PROFILE_POOLS.ad.length],
    fr:  HCC_PROFILE_POOLS.fr[(seed >> 15) % HCC_PROFILE_POOLS.fr.length],
  };
}
