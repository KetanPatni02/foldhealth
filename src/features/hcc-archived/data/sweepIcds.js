// Sweep-mode ICD data — deduplicated list across all DOSes per member.
// Each entry has a `dos_entries` array showing per-DOS status / RAF / claim.
//
// Ported from /Users/ketanp/Downloads/HCC/hcc_worklist_v2.tsx (SWEEP_ICD_DATA
// lines 510–564 + getSweepICDs line 565). Falls back to `_default` for any
// member not in the map.

export const SWEEP_ICD_DATA = {
  'Annette Brave': [
    {
      code: 'E11.22',
      desc: 'Type 2 diabetes with diabetic chronic kidney disease',
      hcc: 'HCC 18 - Diabetes w/ Complications',
      type: 'Suspect',
      dos_entries: [
        { dos: '03/04/2025', status: 'New',      raf: 0.302, claimed: false },
        { dos: '11/10/2024', status: 'Accepted', raf: 0.302, claimed: true  },
        { dos: '03/10/2024', status: 'Accepted', raf: 0.302, claimed: true  },
      ],
      docs: 3, cmts: 2, notes: 0, last: '03/04/2025', by: 'A. Beauchamp (Support Team)',
    },
    {
      code: 'E11.21',
      desc: 'Type 2 diabetes with diabetic nephropathy',
      hcc: 'HCC 18 - Diabetes w/ Complications',
      type: null,
      dos_entries: [{ dos: '03/04/2025', status: 'Accepted', raf: 0.302, claimed: false }],
      docs: 1, cmts: 0, notes: 1, last: '03/04/2025', by: 'Deborah Hintz (Coder)',
    },
    {
      code: 'E44.0',
      desc: 'Moderate protein-calorie malnutrition',
      hcc: 'HCC 18 - Diabetes w/ Complications',
      type: null,
      dos_entries: [
        { dos: '03/04/2025', status: 'New', raf: 0.201, claimed: false },
        { dos: '11/10/2024', status: 'New', raf: 0.201, claimed: false },
      ],
      docs: 1, cmts: 0, notes: 0, last: '03/04/2025', by: 'Dr Aldo Richman (Physician)',
    },
    {
      code: 'E41.0',
      desc: 'Nutritional marasmus',
      hcc: 'HCC Not Linked',
      type: null,
      dismissReason: 'Not clinically supported',
      dos_entries: [{ dos: '03/04/2025', status: 'Dismissed', raf: 0.081, claimed: false }],
      docs: 1, cmts: 3, notes: 1, last: '03/04/2025', by: 'Deborah Hintz (Coder)',
    },
    {
      code: 'E11.51',
      desc: 'Type 2 diabetes mellitus with diabetic peripheral angiopathy without gangrene',
      hcc: 'HCC 18 - Diabetes w/ Complications',
      type: 'Manual',
      dos_entries: [{ dos: '03/04/2025', status: 'New', raf: 0.118, claimed: false }],
      docs: 1, cmts: 0, notes: 1, last: '03/04/2025', by: 'Dr Aldo Richman (Physician)',
    },
    {
      code: 'E11.65',
      desc: 'Type 2 diabetes mellitus with hyperglycemia',
      hcc: 'HCC 18 - Diabetes w/ Complications',
      type: 'Suspect',
      // `trumpedBy` means: another ICD already captures this HCC, so this row
      // is shown read-only with an "Overridden by …" banner.
      trumpedBy: 'E11.22',
      dos_entries: [{ dos: '03/04/2025', status: 'Accepted', raf: 0.000, claimed: true }],
      docs: 0, cmts: 0, notes: 0, last: '03/04/2025', by: 'System',
    },
  ],
  _default: [
    {
      code: 'E11.22',
      desc: 'Type 2 diabetes with diabetic chronic kidney disease',
      hcc: 'HCC 18 - Diabetes w/ Complications',
      type: 'Suspect',
      dos_entries: [{ dos: '03/04/2025', status: 'New', raf: 0.302, claimed: false }],
      docs: 2, cmts: 1, notes: 0, last: '03/04/2025', by: 'System',
    },
  ],
};

export const getSweepIcdsForMember = (name) =>
  SWEEP_ICD_DATA[name] || SWEEP_ICD_DATA._default;
