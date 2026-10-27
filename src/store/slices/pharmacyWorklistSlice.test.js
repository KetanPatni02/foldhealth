import { describe, expect, it, vi } from 'vitest';

const updates = [];
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ update: (patch) => ({ eq: async (_col, id) => { updates.push({ id, patch }); return { error: null }; } }) }),
  },
}));

vi.mock('../lib/worklistListFilters', () => ({ hydrateListFilters: () => ({}), detachSaved: (x) => x }));

const { createPharmacyWorklistSlice } = await import('./pharmacyWorklistSlice.js');

// A bare store holding one member, as the app's store holds the slice.
function storeWith(callHistory) {
  let state = { currentUserProfile: { name: 'Priya' }, pharmacyWorklistIsMock: false };
  const set = (fn) => { state = { ...state, ...(typeof fn === 'function' ? fn(state) : fn) }; };
  const get = () => state;
  state = { ...state, ...createPharmacyWorklistSlice(set, get) };
  state.pharmacyWorklistMembers = [{ id: '1', measures: [], callHistory, activityLog: [] }];
  return { get, member: () => state.pharmacyWorklistMembers[0] };
}

const call = (o) => ({ id: 'out-1', logIds: [11, 12], date: '10/20/2026', time: '9:00 AM', by: 'Priya', contact: 'Member', measures: ['MAD', 'MAH'], outcome: 'MAD: Left voicemail; MAH: Busy', note: 'first try', ...o });

describe('pharmacy outreach edit and delete', () => {
  it('saves an edited line back to its call, changing only that measure', () => {
    updates.length = 0;
    const s = storeWith([call()]);
    s.get().editPharmacyOutreach('1', 12, { measure: 'MAH', outcome: 'Call back later', note: 'second try', type: 'Call', date: '10/21', time: '10:00 AM' });
    const c = s.member().callHistory[0];
    expect(c).toMatchObject({ outcome: 'MAD: Left voicemail; MAH: Call back later', note: 'second try', date: '10/21/2026' });
    expect(s.member().activityLog[0]).toMatchObject({ title: 'Outreach edited (MAH)', actor: 'Priya' });
    expect(updates.at(-1)).toMatchObject({ id: '1', patch: { call_history: [expect.objectContaining({ id: 'out-1' })] } });
  });

  it('finds an older call saved without an id', () => {
    const old = { date: '09/01/2026', by: 'Marcus', outcome: 'Busy', measures: ['MAD'] };
    const s = storeWith([old]);
    s.get().editPharmacyOutreach('1', 'ph-09/01/2026--Marcus-Busy', { measure: 'MAD', outcome: 'Reached member', note: '', type: 'Call', date: '09/01', time: '' });
    expect(s.member().callHistory[0].outcome).toBe('Reached member');
  });

  it('drops a deleted measure from the call, then the call itself', () => {
    const s = storeWith([call()]);
    s.get().deletePharmacyOutreach('1', 11, ['MAD']);
    expect(s.member().callHistory[0]).toMatchObject({ measures: ['MAH'], logIds: [12] });
    s.get().deletePharmacyOutreach('1', 12, ['MAH']);
    expect(s.member().callHistory).toEqual([]);
    expect(s.member().activityLog.map(a => a.title)).toEqual(['Outreach deleted (MAH)', 'Outreach deleted (MAD)']);
  });

  it('deletes the whole call when one feed line stands for all its measures', () => {
    const s = storeWith([call()]);
    s.get().deletePharmacyOutreach('1', 'out-1', ['MAD', 'MAH']);
    expect(s.member().callHistory).toEqual([]);
  });

  it('keeps an older call findable after it is edited', () => {
    const key = 'ph-09/01/2026--Marcus-Busy';
    const s = storeWith([{ date: '09/01/2026', by: 'Marcus', outcome: 'Busy', measures: ['MAD'] }]);
    s.get().editPharmacyOutreach('1', key, { measure: 'MAD', outcome: 'Reached member', note: '', type: 'Call', date: '09/01', time: '' });
    s.get().editPharmacyOutreach('1', key, { measure: 'MAD', outcome: 'Picked up', note: '', type: 'Call', date: '09/01', time: '' });
    expect(s.member().callHistory[0]).toMatchObject({ id: key, outcome: 'Picked up' });
    s.get().deletePharmacyOutreach('1', key, ['MAD']);
    expect(s.member().callHistory).toEqual([]);
  });

  it('never changes a locked verification call', () => {
    const locked = call({ id: 'ver-1', locked: true, measures: ['MAD'], outcome: 'Med pickup confirmed' });
    const s = storeWith([locked]);
    s.get().editPharmacyOutreach('1', 'ver-1', { measure: 'MAD', outcome: 'x', note: '', type: 'Call', date: '10/20', time: '' });
    s.get().deletePharmacyOutreach('1', 'ver-1', ['MAD']);
    expect(s.member().callHistory).toEqual([locked]);
  });
});

describe('reason for non-adherence on a medication', () => {
  function storeWithMed(interventionLog = []) {
    const s = storeWith([]);
    s.get().pharmacyWorklistMembers[0] = {
      id: '1', callHistory: [], activityLog: [], interventionLog,
      measures: [{ code: 'MAD', medications: [{ id: 'd1', name: 'Metformin', status: 'Active', refills: [] }] }],
    };
    return s;
  }
  const prior = { date: '10/02/2026', by: 'Marcus', measures: { MAD: { barriers: [], interventions: ['90/100-day conversion'], result: 'Pending Refill Approval' } } };

  it('logs the reason as a barrier on its gap, keeping the latest interventions and result', () => {
    updates.length = 0;
    const s = storeWithMed([prior]);
    s.get().updatePharmacyMedication('1', 'd1', { nonAdherenceReason: 'Forgetfulness' });
    const [entry] = s.member().interventionLog;
    expect(entry).toMatchObject({
      by: 'Priya', source: 'Medication review', medication: 'Metformin',
      measures: { MAD: { barriers: ['Forgetfulness'], interventions: ['90/100-day conversion'], result: 'Pending Refill Approval' } },
    });
    expect(s.member().interventionLog).toHaveLength(2);
    expect(updates.at(-1).patch.intervention_log).toHaveLength(2);
  });

  it('logs nothing when the reason is cleared or unchanged', () => {
    const s = storeWithMed();
    s.get().updatePharmacyMedication('1', 'd1', { nonAdherenceReason: 'Cost' });
    s.get().updatePharmacyMedication('1', 'd1', { nonAdherenceReason: 'Cost' });
    s.get().updatePharmacyMedication('1', 'd1', { nonAdherenceReason: '' });
    expect(s.member().interventionLog).toHaveLength(1);
  });
});
