import { describe, it, expect } from 'vitest';
import {
  evaluateCis,
  antigensForImmunization,
  ageInMonths,
  CIS_EVALUATION,
  CIS_ANTIGEN_STATUS,
  CIS_DOSE_STATUS,
  cisDueIndicator,
  doseDateError,
  markError,
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
    expect(status(r, 'rv').status).not.toBe(CIS_ANTIGEN_STATUS.seriesComplete);
  });

  it('does not count doses given before 42 days of age', () => {
    const dob = new Date(2024, 10, 20);
    const imms = fullSeries(dob).filter(s => s.title !== 'ActHIB');
    imms.push(shot('ActHIB', '48', atMonths(dob, 0, 30)), shot('ActHIB', '48', atMonths(dob, 4)), shot('ActHIB', '48', atMonths(dob, 12)));
    const hib = status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'hib');
    expect(hib.valid).toHaveLength(2);
    expect(hib.ignored[0].reason).toMatch(/^Given before 42 days of age \(\d\d\/\d\d\/\d{4}\)$/);
  });

  it('only counts MMR, VZV and Hep A between the 1st and 2nd birthday', () => {
    const dob = new Date(2024, 10, 20);
    const imms = fullSeries(dob).filter(s => s.title !== 'MMR');
    imms.push(shot('MMR', '03', atMonths(dob, 11)));
    const mmr = status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'mmr');
    expect(mmr.valid).toHaveLength(0);
    expect(mmr.ignored[0].reason).toBe('Given before the 1st birthday (11/20/2025)');
  });

  it('counts two doses on the same day once', () => {
    const dob = new Date(2024, 10, 20);
    const imms = [shot('Influenza', '140', atMonths(dob, 6)), shot('Fluzone', '150', atMonths(dob, 6))];
    expect(status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'flu').valid).toHaveLength(1);
  });

  it("keeps missing doses Overdue, not Can't be met, while the 2nd birthday is ahead", () => {
    const dob = new Date(2024, 10, 5); // 2nd birthday Nov 5, 2026
    const imms = fullSeries(dob).filter(s => s.title !== 'PCV20');
    imms.push(shot('PCV20', '216', atMonths(dob, 2)));
    const r = evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY });
    // No minimum interval between doses is assumed, so the 3 doses still fit.
    expect(status(r, 'pcv').status).toBe(CIS_ANTIGEN_STATUS.overdue);
    expect(r.evaluation).toBe(CIS_EVALUATION.atRisk);
  });

  it('stays Overdue (not Not met) once the 2nd birthday has passed', () => {
    const dob = new Date(2024, 8, 1); // 2nd birthday Sep 1, 2026
    const imms = fullSeries(dob).filter(s => s.title !== 'PCV20');
    const r = evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY });
    expect(status(r, 'pcv').status).toBe(CIS_ANTIGEN_STATUS.overdue);
    expect(status(r, 'pcv').rows.every(row => row.status === CIS_DOSE_STATUS.overdue)).toBe(true);
    expect(r.evaluation).toBe(CIS_EVALUATION.cannotMeet);
  });

  it('is At risk when a dose is overdue but still fits', () => {
    const dob = new Date(2024, 11, 15); // 2nd birthday Dec 15, 2026: 70 days left
    // DTaP dose 4's window (15-18 months) ended Jun 15, 2026.
    const imms = fullSeries(dob).filter(s => s.title !== 'DTaP');
    const r = evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY });
    expect(status(r, 'dtap').status).toBe(CIS_ANTIGEN_STATUS.overdue);
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
    // DTaP #3's window (6 months) opens in 4 days.
    expect(status(r, 'dtap').status).toBe(CIS_ANTIGEN_STATUS.upcoming);
    expect(status(r, 'rv').status).toBe(CIS_ANTIGEN_STATUS.seriesComplete);
  });

  it('is Not eligible when the child turned 2 before the measurement year', () => {
    const r = evaluateCis({ dob: '06/27/1968', immunizations: [], today: TODAY, measurementYear: 2026 });
    expect(r.evaluation).toBe(CIS_EVALUATION.notEligible);
  });

  it('is Not eligible without a date of birth', () => {
    expect(evaluateCis({ dob: '', immunizations: [], today: TODAY }).evaluation).toBe(CIS_EVALUATION.notEligible);
  });
});

describe('dose rows', () => {
  const dob = new Date(2026, 3, 10); // Apr 10, 2026
  const infant = () => fullSeries(dob).filter(s => new Date(s.dateAdministered) <= TODAY);

  it('lists given doses, then planned ones, with window and earliest date', () => {
    const dtap = status(evaluateCis({ dob: fmt(dob), immunizations: infant(), today: TODAY }), 'dtap');
    expect(dtap.rows.map(r => r.kind)).toEqual(['given', 'given', 'planned', 'planned']);
    expect(dtap.rows.map(r => r.number)).toEqual([1, 2, 3, 4]);
    const third = dtap.rows[2];
    expect(third.recommended).toBe('6 months');
    // Window: 6 months up to the day before 15 months (dose 4).
    expect(fmt(third.start)).toBe('10/10/2026');
    expect(fmt(third.due)).toBe('07/09/2027');
    // HEDIS earliest allowed: 42 days after birth, the same for every dose.
    expect(fmt(third.earliest)).toBe('05/22/2026');
    expect(third.status).toBe(CIS_DOSE_STATUS.upcoming);
    expect(dtap.rows[3].recommended).toBe('15–18 months');
  });

  it('leaves a record before Earliest Allowed off the calendar, listed with its reason', () => {
    const imms = [shot('ActHIB', '48', atMonths(dob, 0, 30))];
    const hib = status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'hib');
    expect(hib.ignored[0].reason).toMatch(/^Given before 42 days of age/);
    // Dose 1 stays open.
    expect(hib.rows).toHaveLength(3);
    expect(hib.rows.every(r => r.kind === 'planned')).toBe(true);
  });

  it('a dose marked given without a date fills the next slot', () => {
    const imms = [...infant(), { id: 'draft-1', title: 'DTaP', code: '107', dateAdministered: '', pendingFor: 'dtap' }];
    const dtap = status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'dtap');
    expect(dtap.rows.map(r => r.kind)).toEqual(['given', 'given', 'pending', 'planned']);
    expect(dtap.rows[2].status).toBe(CIS_DOSE_STATUS.pending);
  });

  it('summarises doses across all ten vaccines', () => {
    const r = evaluateCis({ dob: fmt(dob), immunizations: infant(), today: TODAY });
    expect(r.doses.total).toBe(24); // 4+3+1+3+3+1+4+1+2+2 with Rotarix
    expect(r.doses.completed).toBe(13); // DTaP 2, IPV 2, HiB 2, Hep B 3, PCV 2, RV 2
    const statusSum = r.doses.dueNow + r.doses.overdue + r.doses.upcoming + r.doses.onTrack + r.doses.agedOut + r.doses.contraindicated;
    expect(r.doses.completed + statusSum).toBe(r.doses.total);
  });
});

describe('late and ignored records', () => {
  it('a dose dated after the 2nd birthday counts as administered (Completed late) and names the deadline', () => {
    const dob = new Date(2024, 2, 31); // 2nd birthday 03/31/2026
    const imms = [
      ...fullSeries(dob).filter(s => !(s.title === 'Influenza' && s.dateAdministered === atMonths(dob, 7))),
      shot('Influenza', '140', '04/25/2026'),
    ];
    const flu = status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'flu');
    expect(flu.rows.map(r => r.kind)).toEqual(['given', 'given']);
    expect(flu.rows[1]).toMatchObject({ counts: true, status: CIS_DOSE_STATUS.completedLate, reason: 'Given after the 2nd birthday (03/31/2026)' });
    expect(flu.status).toBe(CIS_ANTIGEN_STATUS.seriesComplete);
  });

  it('same-day duplicates are left off the calendar; the next dose stays open', () => {
    const dob = new Date(2024, 10, 5);
    const imms = [
      shot('PCV20', '216', atMonths(dob, 2)), shot('PCV20', '216', atMonths(dob, 4)),
      shot('PCV20', '216', '10/06/2026'), shot('PCV', '152', '10/06/2026'), shot('PCV', '152', '10/06/2026'),
    ];
    const pcv = status(evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY }), 'pcv');
    // Dose 3 (10/06/2026) is past its 6-month window, so it counts late.
    expect(pcv.rows.map(r => r.status)).toEqual([
      CIS_DOSE_STATUS.completed, CIS_DOSE_STATUS.completed, CIS_DOSE_STATUS.completedLate, CIS_DOSE_STATUS.overdue,
    ]);
    expect(pcv.ignored.map(i => i.reason)).toEqual(['Same date as another dose (10/06/2026)', 'Same date as another dose (10/06/2026)']);
    expect(pcv.status).toBe(CIS_ANTIGEN_STATUS.overdue);
  });
});

describe('completed late', () => {
  it('a dose after its recommended window but before the 2nd birthday counts, flagged late', () => {
    const dob = new Date(2025, 0, 10); // 4-month DTaP window ends 07/09/2025
    const imms = [shot('DTaP', '20', atMonths(dob, 2)), shot('DTaP', '20', '08/01/2025')];
    const r = evaluateCis({ dob: fmt(dob), immunizations: imms, today: TODAY });
    const dtap = status(r, 'dtap');
    expect(dtap.rows[0].status).toBe(CIS_DOSE_STATUS.completed);
    expect(dtap.rows[1]).toMatchObject({
      counts: true,
      status: CIS_DOSE_STATUS.completedLate,
      reason: 'Given after the recommended window (ended 07/09/2025)',
    });
    expect(dtap.valid).toHaveLength(2);
  });

  it('a dose inside its window stays Completed', () => {
    const dob = new Date(2025, 0, 10);
    const dtap = status(evaluateCis({ dob: fmt(dob), immunizations: [shot('DTaP', '20', atMonths(dob, 2, 20))], today: TODAY }), 'dtap');
    expect(dtap.rows[0]).toMatchObject({ status: CIS_DOSE_STATUS.completed });
    expect(dtap.rows[0].reason).toBeUndefined();
  });
});

// The CIS-10 Vaccine Calendar sheet's worked example: DOB 08/05/2025.
describe('vaccine calendar sheet dates', () => {
  const r = evaluateCis({ dob: '08/05/2025', immunizations: [], today: new Date(2025, 7, 20) });
  const row = (key, n) => status(r, key).rows[n - 1];
  const dates = (x) => [fmt(x.start), fmt(x.due), fmt(x.earliest)];

  it('matches the window start, window end and earliest allowed columns', () => {
    expect(dates(row('hepb', 1))).toEqual(['08/05/2025', '09/04/2025', '08/05/2025']);
    expect(dates(row('hepb', 3))).toEqual(['02/05/2026', '02/05/2027', '08/05/2025']);
    expect(dates(row('dtap', 1))).toEqual(['10/05/2025', '12/04/2025', '09/16/2025']);
    expect(dates(row('dtap', 3))).toEqual(['02/05/2026', '11/04/2026', '09/16/2025']);
    expect(dates(row('hib', 2))).toEqual(['12/05/2025', '08/04/2026', '09/16/2025']);
    expect(dates(row('rv', 3))).toEqual(['02/05/2026', '04/05/2026', '09/16/2025']);
    expect(dates(row('mmr', 1))).toEqual(['08/05/2026', '11/05/2026', '08/05/2026']);
    expect(dates(row('hepa', 1))).toEqual(['08/05/2026', '07/05/2027', '08/05/2026']);
    expect(dates(row('flu', 1))).toEqual(['02/01/2026', '03/04/2026', '02/01/2026']);
    // Dose 1 not given yet: dose 2 opens 4 weeks after dose 1's window start.
    expect(dates(row('flu', 2))).toEqual(['03/01/2026', '08/05/2027', '03/01/2026']);
  });

  it('opens flu dose 2 four weeks after dose 1 was given', () => {
    const given = evaluateCis({ dob: '08/05/2025', immunizations: [shot('Influenza', '140', '02/10/2026')], today: new Date(2026, 1, 20) });
    const flu2 = status(given, 'flu').rows[1];
    expect(fmt(flu2.start)).toBe('03/10/2026');
    expect(fmt(flu2.earliest)).toBe('03/10/2026');
    // Earliest Allowed is still ahead, so it is On track (locked), not Upcoming.
    expect(flu2.status).toBe(CIS_DOSE_STATUS.onTrack);
  });

  it('bases status on the window start, not the earliest allowed date', () => {
    // 09/20/2025: past DTaP's earliest allowed (09/16) but before its window (10/05).
    const early = evaluateCis({ dob: '08/05/2025', immunizations: [], today: new Date(2025, 8, 20) });
    expect(status(early, 'dtap').rows[0].status).toBe(CIS_DOSE_STATUS.upcoming);
    const open = evaluateCis({ dob: '08/05/2025', immunizations: [], today: new Date(2025, 9, 5) });
    expect(status(open, 'dtap').rows[0].status).toBe(CIS_DOSE_STATUS.dueNow);
    const late = evaluateCis({ dob: '08/05/2025', immunizations: [], today: new Date(2025, 11, 5) });
    expect(status(late, 'dtap').rows[0].status).toBe(CIS_DOSE_STATUS.overdue);
  });
});

describe('upcoming vs on track', () => {
  it('is On track before Earliest Allowed, Upcoming once it passes with the window 30 days out', () => {
    // DTaP 1: earliest 09/16/2025, window opens 10/05/2025.
    const locked = evaluateCis({ dob: '08/05/2025', immunizations: [], today: new Date(2025, 8, 10) });
    expect(status(locked, 'dtap').rows[0].status).toBe(CIS_DOSE_STATUS.onTrack);
    const soon = evaluateCis({ dob: '08/05/2025', immunizations: [], today: new Date(2025, 8, 20) });
    expect(status(soon, 'dtap').rows[0].status).toBe(CIS_DOSE_STATUS.upcoming);
    // Dose 4 (15 months) is far off: On track, not Upcoming, even past Earliest Allowed.
    expect(status(soon, 'dtap').rows[3].status).toBe(CIS_DOSE_STATUS.onTrack);
  });
});

describe('aged out', () => {
  it('an open Rotavirus dose is Aged out once the child turns 8 months', () => {
    const r = evaluateCis({ dob: '01/01/2026', immunizations: [], today: new Date(2026, 8, 1) });
    const rv = status(r, 'rv');
    expect(rv.rows.every(row => row.status === CIS_DOSE_STATUS.agedOut)).toBe(true);
    expect(rv.status).toBe(CIS_ANTIGEN_STATUS.agedOut);
    expect(r.evaluation).toBe(CIS_EVALUATION.cannotMeet);
  });
});

describe('immune and contraindicated', () => {
  const dob = '08/05/2025';
  const today = new Date(2026, 9, 6);

  it('Immune closes the open doses, counts toward Doses Complete and the vaccine', () => {
    const r = evaluateCis({ dob, immunizations: [], today, marks: { hepb: { kind: 'immune', date: '09/01/2026', details: 'Positive anti-HBs' } } });
    const hepb = status(r, 'hepb');
    expect(hepb.status).toBe(CIS_ANTIGEN_STATUS.immune);
    expect(hepb.rows.every(row => row.status === CIS_DOSE_STATUS.immune)).toBe(true);
    expect(hepb.counts).toBe(true);
    expect(r.doses.completed).toBe(3);
  });

  it('Immune after the 2nd birthday does not count and leaves the doses open', () => {
    const r = evaluateCis({ dob: '08/05/2024', immunizations: [], today, marks: { hepa: { kind: 'immune', date: '09/01/2026', details: 'History of illness' } } });
    const hepa = status(r, 'hepa');
    expect(hepa.immuneNote).toBe("Doesn't count: after 2nd birthday");
    expect(hepa.status).not.toBe(CIS_ANTIGEN_STATUS.immune);
  });

  it('MMR Immune needs all three diseases', () => {
    const r = evaluateCis({ dob, immunizations: [], today, marks: { mmr: { kind: 'immune', date: '09/01/2026', details: 'Titers', diseases: ['Measles', 'Mumps'] } } });
    expect(status(r, 'mmr').status).not.toBe(CIS_ANTIGEN_STATUS.immune);
    expect(status(r, 'mmr').immuneNote).toMatch(/measles, mumps and rubella/);
  });

  it('Contraindicated applies to the marked dose only, and blocks completion', () => {
    const r = evaluateCis({ dob, immunizations: [shot('DTaP', '20', '10/10/2025')], today, marks: { 'dtap:2': { kind: 'contraindicated', date: '10/01/2026', details: 'Anaphylaxis' } } });
    const dtap = status(r, 'dtap');
    expect(dtap.rows.map(row => row.status)).toEqual([
      CIS_DOSE_STATUS.completed, CIS_DOSE_STATUS.contraindicated, CIS_DOSE_STATUS.dueNow, CIS_DOSE_STATUS.upcoming,
    ]);
    expect(dtap.contraindications.map(m => m.doseNumber)).toEqual([2]);
    expect(dtap.status).toBe(CIS_ANTIGEN_STATUS.contraindicated);
    expect(dtap.counts).toBe(false);
    expect(r.evaluation).toBe(CIS_EVALUATION.cannotMeet);
  });

  it('a later dose marked Contraindicated keeps the vaccine urgent while earlier doses are open', () => {
    const r = evaluateCis({ dob, immunizations: [], today, marks: { 'hepb:3': { kind: 'contraindicated', date: '10/01/2026', details: 'Anaphylaxis' } } });
    const hepb = status(r, 'hepb');
    expect(hepb.rows.map(row => row.status)).toEqual([CIS_DOSE_STATUS.overdue, CIS_DOSE_STATUS.overdue, CIS_DOSE_STATUS.contraindicated]);
    expect(hepb.status).toBe(CIS_ANTIGEN_STATUS.contraindicated);
    expect(hepb.urgency).toBe(CIS_ANTIGEN_STATUS.overdue);
  });

  it('undoing a mark returns the doses to their normal status', () => {
    const r = evaluateCis({ dob, immunizations: [], today, marks: {} });
    expect(status(r, 'dtap').rows[0].status).toBe(CIS_DOSE_STATUS.overdue);
  });
});

describe('date rules', () => {
  const r = evaluateCis({ dob: '08/05/2025', immunizations: [shot('DTaP', '20', '10/10/2025')], today: new Date(2026, 9, 6) });
  const dtap = status(r, 'dtap');
  const today = new Date(2026, 9, 6);

  it('blocks a date before Earliest Allowed with the spec message', () => {
    expect(doseDateError(dtap, dtap.rows[1], new Date(2025, 8, 1), today)).toBe(
      "This dose won't count toward HEDIS if given before 09/16/2025. Add it in the note and schedule a repeat on or after 09/16/2025.",
    );
  });
  it('blocks a date another dose of the vaccine already has', () => {
    expect(doseDateError(dtap, dtap.rows[1], new Date(2025, 9, 10), today)).toBe('Dose 1 already has this date');
  });
  it('blocks future dates and allows a valid one', () => {
    expect(doseDateError(dtap, dtap.rows[1], new Date(2026, 9, 7), today)).toMatch(/future/);
    expect(doseDateError(dtap, dtap.rows[1], new Date(2025, 11, 10), today)).toBeNull();
  });
  it('Immune and Contraindicated need a past date and free text; MMR needs all three diseases', () => {
    expect(markError({ kind: 'immune', antigenKey: 'hepb', date: '', details: 'x' }, today)).toBe('Enter a date.');
    expect(markError({ kind: 'immune', antigenKey: 'hepb', date: '10/07/2026', details: 'x' }, today)).toMatch(/future/);
    expect(markError({ kind: 'contraindicated', antigenKey: 'dtap', date: '10/01/2026', details: ' ' }, today)).toBe('Enter the contraindication.');
    expect(markError({ kind: 'immune', antigenKey: 'mmr', date: '10/01/2026', details: 'Titers', diseases: ['Measles'] }, today)).toMatch(/measles, mumps and rubella/);
    expect(markError({ kind: 'immune', antigenKey: 'mmr', date: '10/01/2026', details: 'Titers', diseases: ['Measles', 'Mumps', 'Rubella'] }, today)).toBeNull();
  });
});

describe('cisDueIndicator', () => {
  it('only Due now and Overdue drive the worklist due signal', () => {
    const upcomingOnly = evaluateCis({ dob: '08/05/2025', immunizations: [], today: new Date(2025, 8, 20) });
    // Hep B dose 1 is Due now from birth, so drop it to leave only Upcoming / On track.
    const rows = upcomingOnly.antigens.map(a => ({ ...a, rows: a.rows.filter(r => r.status !== CIS_DOSE_STATUS.dueNow && r.status !== CIS_DOSE_STATUS.overdue) }));
    expect(cisDueIndicator({ antigens: rows }, new Date(2025, 8, 20))).toBeNull();
  });
});
