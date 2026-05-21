// Single source of truth for HCC status icons + colors. Used by:
//  - StatusLegend (worklist footer bar)
//  - HccWorklistRow's RoleStatusCell (Support / Coder / Reviewer columns)
//  - DiagPanel's DosStatusMenu (status pill next to assignee avatar)
//  - DosSelector (per-DOS status pill in the dropdown)
//
// Icon + color choices match the Figma legend at
//   https://www.figma.com/design/ZZbDQP2LSEzNXqq2dbFUir/HCC-Workflow
//   (node 12082-513650)
//
// Color tiers in the Figma:
//   New                 → primary (purple)
//   Awaiting / InProg / RecordReceived → warning (amber)
//   Insufficient / Returned / RecordRequested → secondary (orange)
//   Reject              → error (red)
//   Completed           → success (green)
//
// Each entry exposes:
//   icon         — Iconify name
//   color        — text + icon color (CSS variable)
//   bg           — soft tinted background for the pill
//   border       — pill border color (matches color at ~20% alpha)
//   legendOrder  — display order in the StatusLegend strip

export const STATUS_SPEC = {
  New: {
    // Sparkle inside a purple coin
    icon: 'solar:stars-bold',
    color: 'var(--primary-300)',
    bg: 'var(--primary-50)',
    border: 'rgba(140, 90, 226, 0.2)',
    legendOrder: 0,
  },
  Awaiting: {
    // Sun-burst — warning amber
    icon: 'solar:sun-bold',
    color: 'var(--status-warning)',
    bg: 'var(--status-warning-light)',
    border: 'rgba(217, 165, 11, 0.2)',
    legendOrder: 1,
  },
  'In Progress': {
    // Half-filled circle — warning amber
    icon: 'solar:half-circle-bold',
    color: 'var(--status-warning)',
    bg: 'var(--status-warning-light)',
    border: 'rgba(217, 165, 11, 0.2)',
    legendOrder: 2,
  },
  'Record Received': {
    // Down-arrow inside an amber coin
    icon: 'solar:download-minimalistic-bold',
    color: 'var(--status-warning)',
    bg: 'var(--status-warning-light)',
    border: 'rgba(217, 165, 11, 0.2)',
    legendOrder: 3,
  },
  Insufficient: {
    // Filled exclamation in an orange coin
    icon: 'solar:danger-circle-bold',
    color: 'var(--secondary-300)',
    bg: 'var(--secondary-100)',
    border: 'rgba(244, 122, 62, 0.2)',
    legendOrder: 4,
  },
  Returned: {
    // Undo arrow in an orange coin
    icon: 'solar:undo-left-bold',
    color: 'var(--secondary-300)',
    bg: 'var(--secondary-100)',
    border: 'rgba(244, 122, 62, 0.2)',
    legendOrder: 5,
  },
  'Record Requested': {
    // Clock inside an orange coin
    icon: 'solar:clock-circle-bold',
    color: 'var(--secondary-300)',
    bg: 'var(--secondary-100)',
    border: 'rgba(244, 122, 62, 0.2)',
    legendOrder: 6,
  },
  Reject: {
    // Filled X-circle in red
    icon: 'solar:close-circle-bold',
    color: 'var(--status-error)',
    bg: 'var(--status-error-light)',
    border: 'rgba(215, 40, 37, 0.2)',
    legendOrder: 7,
  },
  Completed: {
    // Filled check-circle in green
    icon: 'solar:check-circle-bold',
    color: 'var(--status-success)',
    bg: 'var(--status-success-light)',
    border: 'rgba(0, 155, 83, 0.2)',
    legendOrder: 8,
  },
  // Special states — referenced by code, not surfaced in the legend.
  // Unassigned uses the neutral palette since it's an absence-of-state.
  Unassigned: {
    icon: 'solar:user-plus-rounded-linear',
    color: 'var(--neutral-200)',
    bg: 'var(--neutral-50)',
    border: 'var(--neutral-150)',
    legendOrder: null,
  },
  Accepted: {
    icon: 'solar:check-circle-bold',
    color: 'var(--status-success)',
    bg: 'var(--status-success-light)',
    border: 'rgba(0, 155, 83, 0.2)',
    legendOrder: null,
  },
  Dismissed: {
    icon: 'solar:close-circle-bold',
    color: 'var(--neutral-300)',
    bg: 'var(--neutral-50)',
    border: 'var(--neutral-150)',
    legendOrder: null,
  },
  Closed: {
    icon: 'solar:lock-keyhole-minimalistic-bold',
    color: 'var(--neutral-300)',
    bg: 'var(--neutral-50)',
    border: 'var(--neutral-150)',
    legendOrder: null,
  },
};

// Some Supabase rows + the prototype use plural names — map them to the
// canonical singular keys above so the spec lookup keeps working without
// us having to migrate every row.
const ALIAS = {
  'Records Received': 'Record Received',
  'Records Requested': 'Record Requested',
  Rejected: 'Reject',
};

export const canonicalStatus = (label) => ALIAS[label] || label;

// Look up a status spec, falling back to "Unassigned" tones for unknowns.
export const getStatusSpec = (status) =>
  STATUS_SPEC[canonicalStatus(status)] || STATUS_SPEC.Unassigned;

// Status options ordered for the StatusLegend strip.
export const LEGEND_STATUSES = Object.entries(STATUS_SPEC)
  .filter(([, s]) => s.legendOrder != null)
  .sort(([, a], [, b]) => a.legendOrder - b.legendOrder)
  .map(([label, spec]) => ({ label, ...spec }));
