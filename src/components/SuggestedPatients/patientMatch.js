import { ageFromDobMdy } from '../../lib/patientDisplay';

export const initialsOf = n => String(n || '?').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

// "F • 72y 4m": gender initial, then age in years and months (from the DOB;
// whole years when there's no DOB). Each is its own detail.
export const sexAgeOf = (p) => {
  const age = ageFromDobMdy(p.dob) || (p.age != null && p.age !== '' ? `${p.age}y` : '');
  const parts = [p.gender && String(p.gender)[0].toUpperCase(), age].filter(Boolean);
  return parts.join(' • ');
};
