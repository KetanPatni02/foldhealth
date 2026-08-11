export const ALL_USERS = 'All Users';

export const THRESHOLD_MINUTES = {
  'No Time': -1,
  '> 5 mins': 5,
  '>10 mins': 10,
  '>15 mins': 15,
  '>20 mins': 20,
  '>90 mins': 90,
};

export function matchTimeFilter(rowSeconds, rowUser, filter) {
  if (!filter) return true;
  const { user, threshold } = filter;
  if (user && user !== ALL_USERS && rowUser !== user) return false;
  if (!threshold) return true;
  const mins = (rowSeconds || 0) / 60;
  if (threshold === 'No Time') return (rowSeconds || 0) === 0;
  const min = THRESHOLD_MINUTES[threshold];
  return typeof min === 'number' ? mins > min : true;
}

export const summarizeTimeFilter = ({ user, threshold }) => {
  const parts = [];
  if (user && user !== ALL_USERS) parts.push(user);
  if (threshold) parts.push(threshold);
  return parts.join(' · ') || 'All';
};

export const isTimeFilterActive = (f) =>
  !!f && ((f.user && f.user !== ALL_USERS) || !!f.threshold);
