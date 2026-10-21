// Overview tab column layout.
//
// The column count follows the Overview's own width (not the window), so the
// left panel being open, closed or dragged wider is handled in one place.
// With the left panel open it already reads as a column, so the Overview tops
// out at two; collapsed, a wide Overview gets three (25% / 50% / 25%).

export const TWO_COLUMN_MIN_WIDTH = 1150;
export const THREE_COLUMN_MIN_WIDTH = 1400;

export function overviewColumnCount(width, { leftPanelOpen }) {
  if (!leftPanelOpen && width >= THREE_COLUMN_MIN_WIDTH) return 3;
  if (width >= TWO_COLUMN_MIN_WIDTH) return 2;
  return 1;
}

// Card order per column count. The synopsis and health chart always open the
// first column; Quick Actions always sits directly above Upcoming Appointments.
export const OVERVIEW_COLUMNS = {
  3: [
    ['synopsis', 'healthChart', 'highlights'],
    ['suggestedActions', 'carePlan', 'carePrograms', 'gaps', 'notes'],
    ['quickActions', 'appointments', 'tasks', 'vitals'],
  ],
  2: [
    ['synopsis', 'healthChart', 'quickActions', 'appointments', 'tasks', 'vitals'],
    ['suggestedActions', 'carePlan', 'carePrograms', 'gaps', 'notes', 'highlights'],
  ],
  1: [
    ['synopsis', 'healthChart', 'suggestedActions', 'quickActions', 'appointments', 'carePlan', 'carePrograms', 'gaps', 'tasks', 'vitals', 'notes', 'highlights'],
  ],
};

// Relative column widths: 25 / 50 / 25 at three, 1/3 + 2/3 at two.
export const OVERVIEW_COLUMN_TEMPLATE = {
  3: '1fr 2fr 1fr',
  2: '1fr 2fr',
  1: 'minmax(0, 1fr)',
};
