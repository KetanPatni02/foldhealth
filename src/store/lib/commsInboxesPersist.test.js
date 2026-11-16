import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('./reportPersistFailure', () => ({ reportPersistFailure: vi.fn() }));

const { isMissingTable } = await import('./commsInboxesPersist');

describe('isMissingTable', () => {
  it('is true only when the table itself is missing', () => {
    expect(isMissingTable({ code: '42P01', message: 'relation "public.comms_inboxes" does not exist' })).toBe(true);
    expect(isMissingTable({ code: 'PGRST205', message: "Could not find the table 'public.comms_inboxes' in the schema cache" })).toBe(true);
  });

  it('treats permission and other errors that name the table as real failures', () => {
    expect(isMissingTable({ code: '42501', message: 'new row violates row-level security policy for table "comms_inboxes"' })).toBe(false);
    expect(isMissingTable({ code: '23505', message: 'duplicate key value violates unique constraint "comms_inboxes_pkey"' })).toBe(false);
    expect(isMissingTable({ code: 'PGRST204', message: "Could not find the 'label' column of 'comms_inboxes' in the schema cache" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});
