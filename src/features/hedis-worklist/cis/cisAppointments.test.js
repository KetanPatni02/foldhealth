import { describe, it, expect } from 'vitest';
import { appointmentForDose, doseKey } from './cisAppointments';

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysFromToday = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
const appt = (over) => ({ id: 'a1', date: daysFromToday(7), doses: [doseKey('ipv', 2)], status: 'Scheduled', ...over });
const planned = { kind: 'planned', number: 2 };

describe('appointmentForDose', () => {
  it('finds the scheduled appointment covering a planned dose', () => {
    expect(appointmentForDose([appt()], 'ipv', planned)).toMatchObject({ appt: { id: 'a1' }, passed: false });
  });

  it('flags it once the appointment date has passed', () => {
    expect(appointmentForDose([appt({ date: daysFromToday(-1) })], 'ipv', planned)?.passed).toBe(true);
  });

  it('today is not passed yet', () => {
    expect(appointmentForDose([appt({ date: daysFromToday(0) })], 'ipv', planned)?.passed).toBe(false);
  });

  it('ignores given doses, cancelled appointments and other doses', () => {
    expect(appointmentForDose([appt()], 'ipv', { kind: 'given', number: 2 })).toBeNull();
    expect(appointmentForDose([appt({ status: 'Cancelled' })], 'ipv', planned)).toBeNull();
    expect(appointmentForDose([appt()], 'hepb', planned)).toBeNull();
  });

  it('uses the latest appointment when a dose was rebooked', () => {
    const list = [appt({ id: 'old', date: daysFromToday(-10) }), appt({ id: 'new', date: daysFromToday(5) })];
    expect(appointmentForDose(list, 'ipv', planned)).toMatchObject({ appt: { id: 'new' }, passed: false });
  });
});
