import { parseLocalDate } from '../../lib/localDate';

export const DATE_PRESETS = ['Today', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'This month'];

export const fmtDay = iso => parseLocalDate(iso)?.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) || '';

// Whether an ISO time falls in a Date Range preset, or in `range` (two ISO
// days, inclusive) for Custom; no preset keeps everything.
export function inDatePreset(preset, range = []) {
  if (!preset) return () => true;
  if (preset === 'Custom') {
    const from = parseLocalDate(range[0]);
    const to = parseLocalDate(range[1]);
    if (!from || !to) return () => true;
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1).getTime();
    return iso => !!iso && new Date(iso).getTime() >= from.getTime() && new Date(iso).getTime() < end;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = { Today: 0, 'Last 7 days': 7, 'Last 30 days': 30, 'Last 90 days': 90 }[preset];
  return (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (preset === 'This month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return day <= today && today - day <= days * 86400000;
  };
}
