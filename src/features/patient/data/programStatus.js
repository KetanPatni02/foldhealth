// Care-program status vocabulary + per-status text color. Shared by the Care
// Programs table Status cell and the program-detail header status dropdown so
// both offer the same options and colors.
export const PROGRAM_STATUS_OPTIONS = ['Engaged', 'Declined', 'Unable to Reach', 'Enrolled', 'Attempted'];

// Warning-dark (in-program), neutral (declined/closed), error (unable to reach).
export const STATUS_COLOR = {
  New:               'var(--primary-300)',
  Engaged:           'var(--status-warning)',
  Enrolled:          'var(--status-warning)',
  Attempted:         'var(--status-warning)',
  Declined:          'var(--neutral-300)',
  'Unable to Reach': 'var(--status-error)',
  Closed:            'var(--neutral-300)',
};

export const statusColorFor = (status) => STATUS_COLOR[status] || 'var(--primary-300)';
