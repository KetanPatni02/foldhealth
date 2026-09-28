// Local fallback until supabase/caregap_lab_orders_migration.sql has run:
// the same prior HbA1c the migration seeds (Aug 14, 2025, outside the 2026
// measurement period) for members with a GSD3 gap. Same ids as the seed.
export function priorLabResultsFor(member) {
  if (!(member?.gaps || []).some(g => g.code === 'GSD3')) return [];
  return [{
    id: `labres-prior-${member.id}`,
    labOrderId: null,
    memberId: member.id,
    gapCode: 'GSD3',
    testName: 'HbA1c',
    value: '8.2',
    unit: '%',
    referenceRange: '4.0 – 5.6 %',
    flag: 'High',
    note: '',
    collectedAt: '2025-08-14T09:00:00Z',
    resultedAt: '2025-08-15T14:00:00Z',
    source: 'Quest Diagnostics',
    evidenceStatus: 'Outside Measurement Period',
    reviewedBy: null,
    reviewedAt: null,
  }];
}
