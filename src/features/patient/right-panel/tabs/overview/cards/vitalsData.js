import { OVERVIEW_SEED } from '../../../../data/overviewData';

/**
 * The patient_overview row's vitals with the sample goals, diastolic history
 * and source icons filled in from OVERVIEW_SEED until the row carries its own.
 */
export function overviewVitals(overview, memberId) {
  const seeded = Object.fromEntries((OVERVIEW_SEED[memberId]?.vitals || []).map(v => [v.key, v]));
  return (overview?.vitals || []).map((v) => {
    const sample = seeded[v.key];
    return {
      ...v,
      goalFrom: v.goalFrom || sample?.goalFrom,
      goalTo: v.goalTo || sample?.goalTo,
      diastolicSeries: v.diastolicSeries || sample?.diastolicSeries,
      sourceIcon: v.sourceIcon || sample?.sourceIcon,
    };
  });
}
