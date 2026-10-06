import { describe, it, expect } from 'vitest';
import {
  evaluateCis,
  antigensForImmunization,
  ageInMonths,
  CIS_EVALUATION,
  CIS_ANTIGEN_STATUS,
} from './cisRules';

const TODAY = new Date(2026, 9, 6); // Oct 6, 2026

// MM/DD/YYYY, matching patient_immunizations.date_administered.
const fmt = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
const atMonths = (dob, months, extraDays = 0) => {
  const d = new Date(dob.getFullYear(), dob.getMonth() + months, dob.getDate() + extraDays);
  return fmt(d);
};
const shot = (title, code, date) => ({ id: `${title}-${date}`, title, code, dateAdministered: date });

// Every dose of Combination 10 on the routine schedule.
function fullSeries(dob) {
  return [
    shot('Hep B', '08', fmt(dob)),
    shot('Pediarix', '110', atMonths(dob, 2)),
    shot('Pediarix', '110', atMonths(dob, 4)),
    shot('Pediarix', '110', atMonths(dob, 6)),
    shot('ActHIB', '48', atMonths(dob, 2)),
    shot('ActHIB', '48', atMonths(dob, 4)),
    shot('ActHIB', '48', atMonths(dob, 12)),
    shot('PCV20', '216', atMonths(dob, 2)),
    shot('PCV20', '216', atMonths(dob, 4)),
    shot('PCV20', '216', atMonths(dob, 6)),
    shot('PCV20', '216', atMonths(dob, 12)),
    shot('Rotarix', '119', atMonths(dob, 2)),
    shot('Rotarix', '119', atMonths(dob, 4)),
    shot('Influenza', '140', atMonths(dob, 6)),
    shot('Influenza', '140', atMonths(dob, 7)),
    shot('MMR', '03', atMonths(dob, 12)),
    shot('Varicella', '21', atMonths(dob, 12)),
    shot('Hep A', '83', atMonths(dob, 12)),
    shot('DTaP', '20', atMonths(dob, 15)),
  ];
}
const status = (result, key) => result.antigens.find(a => a.key === key);

describe('antigensForImmunization', () => {
  it('maps combination vaccines to every antigen they cover', () => {
    expect(antigensForImmunization({ title: 'Pediarix', code: '110' }).sort()).toEqual(['dtap', 'hepb', 'ipv']);
    expect(antigensForImmunization({ title: 'ProQuad', code: '94' }).sort()).toEqual(['mmr', 'vzv']);
  });
  it('matches by title when the CVX code is missing', () => {
    expect(antigensForImmunization({ title: 'Hepatitis A (pediatric)' })).toEqual(['hepa']);
    expect(antigensForImmunization({ title: 'Hep B' })).toEqual(['hepb']);
  });
  it('treats leading zeros in CVX codes as equal', () => {
    expect(antigensForImmunization({ title: '', code: '3' })).toEqual(['mmr']);
  });
  it('does not count adolescent Tdap as DTaP', () => {
    expect(antigensForImmunization({ title: 'Tdap', code: '115' })).toEqual([]);
  });
});

describe('ageInMonths', () => {
  it('counts whole months', () => {
    expect(ageInMonths(new Date(2024, 11, 15), TODAY)).toBe(21);
    expect(ageInMonths(new Date(2024, 9, 6), TODAY)).toBe(24);
  });
});

describe('evaluateCis', () => {
  it('is Compliant when every antigen is met', () => {
    const dob = new Date(2024, 10, 20);
    const r = evaluateCis({ dob: fmt(dob), immunizations: fullSeries(dob), today: TODAY });
    expect(r.evaluation).toBe(CIS_EVALUATION.compliant);
    expect(r.metCount).toBe(10);
  });

  it('needs 3 rotavirus doses unless every dose is Rotarix', () => {
    const dob = new Date(2024, 10, 20);
    const imms = fullSeries(dob).map(s => (s.title === 'Rotarix' ? { ...s, title: 'RotaTeq', code: '116' } : s));
    const r = evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY });
    expect(status(r, 'rv').required).toBe(3);
    expect(status(r, 'rv').status).not.toBe(CIS_ANTIGEN_STATUS.met);
  });

  it('does not count doses given before 42 days of age', () => {
    const dob = new Date(2024, 10, 20);
    const imms = fullSeries(dob).filter(s => s.title !== 'ActHIB');
    imms.push(shot('ActHIB', '48', atMonths(dob, 0, 30)), shot('ActHIB', '48', atMonths(dob, 4)), shot('ActHIB', '48', atMonths(dob, 12)));
    const hib = status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'hib');
    expect(hib.valid).toHaveLength(2);
    expect(hib.invalid[0].reason).toBe('Given before 42 days of age');
  });

  it('only counts MMR, VZV and Hep A between the 1st and 2nd birthday', () => {
    const dob = new Date(2024, 10, 20);
    const imms = fullSeries(dob).filter(s => s.title !== 'MMR');
    imms.push(shot('MMR', '03', atMonths(dob, 11)));
    const mmr = status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'mmr');
    expect(mmr.valid).toHaveLength(0);
    expect(mmr.invalid[0].reason).toBe('Given before the 1st birthday');
  });

  it('counts two doses on the same day once', () => {
    const dob = new Date(2024, 10, 20);
    const imms = [shot('Influenza', '140', atMonths(dob, 6)), shot('Fluzone', '150', atMonths(dob, 6))];
    expect(status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'flu').valid).toHaveLength(1);
  });

  it("is Can't be met when the remaining PCV doses cannot fit before the 2nd birthday", () => {
    const dob = new Date(2024, 10, 5); // 2nd birthday Nov 5, 2026
    const imms = fullSeries(dob).filter(s => s.title !== 'PCV20');
    imms.push(shot('PCV20', '216', atMonths(dob, 2)));
    const r = evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY });
    expect(status(r, 'pcv').status).toBe(CIS_ANTIGEN_STATUS.cannotMeet);
    expect(r.evaluation).toBe(CIS_EVALUATION.cannotMeet);
  });

  it('is At risk when a dose is overdue but still fits', () => {
    const dob = new Date(2024, 11, 15); // 2nd birthday Dec 15, 2026: 70 days left
    const imms = fullSeries(dob).filter(s => !(s.title === 'Influenza' && s.dateAdministered === atMonths(dob, 7)));
    const r = evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY });
    expect(status(r, 'flu').status).toBe(CIS_ANTIGEN_STATUS.overdue);
    expect(r.evaluation).toBe(CIS_EVALUATION.atRisk);
  });

  it('is At risk inside the last 60 days even when nothing is overdue', () => {
    const dob = new Date(2024, 10, 25); // 50 days left
    const imms = fullSeries(dob).filter(s => s.title !== 'Hep A');
    const r = evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY });
    expect(status(r, 'hepa').status).toBe(CIS_ANTIGEN_STATUS.dueNow);
    expect(r.evaluation).toBe(CIS_EVALUATION.atRisk);
  });

  it('is On track for an infant keeping to schedule', () => {
    const dob = new Date(2026, 3, 10); // 5 months old, 2- and 4-month visits done
    const imms = fullSeries(dob).filter(s => {
      const d = new Date(s.dateAdministered);
      return d <= TODAY;
    });
    const r = evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY });
    expect(r.evaluation).toBe(CIS_EVALUATION.onTrack);
    expect(r.reportingYear).toBe(2028);
    expect(status(r, 'dtap').status).toBe(CIS_ANTIGEN_STATUS.onTrack);
    expect(status(r, 'rv').status).toBe(CIS_ANTIGEN_STATUS.met);
  });

  it('is Not eligible when the child turned 2 before the measurement year', () => {
    const r = evaluateCis({ dob: '06/27/1968', immunizations: [], today: TODAY, measurementYear: 2026 });
    expect(r.evaluation).toBe(CIS_EVALUATION.notEligible);
  });

  it('is Not eligible without a date of birth', () => {
    expect(evaluateCis({ dob: '', immunizations: [], today: TODAY }).evaluation).toBe(CIS_EVALUATION.notEligible);
  });
});
