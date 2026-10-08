import { parseLocalDate } from '../../../lib/localDate';

/** "ipv:2", the key cis_dose_appointments.doses and cis_dose_notes use. */
export const doseKey = (antigenKey, number) => `${antigenKey}:${number}`;

const startOfToday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
/** YYYY-MM-DD → local Date. */
export const apptDate = (appt) => parseLocalDate(appt.date);

/**
 * The scheduled appointment that covers a dose not yet given (latest first),
 * with whether its date has passed (time to confirm the dose was given).
 *
 * @returns {{ appt: object, passed: boolean } | null}
 */
export function appointmentForDose(appointments, antigenKey, row) {
  if (!appointments?.length || row.kind === 'given') return null;
  const key = doseKey(antigenKey, row.number);
  const appt = appointments
    .filter(a => a.status === 'Scheduled' && a.doses.includes(key))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return appt ? { appt, passed: apptDate(appt) < startOfToday() } : null;
}
