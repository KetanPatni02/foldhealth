export const PROGRAMS = ['SNP', 'AWV', 'CCM', 'TCM', 'ECM', 'CBP', 'MRP'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
export const OUTCOME_CHOICES = ['Completed', 'Engaged', 'Left Voicemail', 'No Answer', 'Declined'];

export const TYPE_OPTIONS = [
  { label: 'General',   icon: 'solar:document-text-linear',  flip: false },
  { label: 'Call',      icon: 'solar:phone-calling-linear',   flip: false },
  { label: 'In Person', icon: 'solar:user-linear',            flip: false },
  { label: 'Virtual',   icon: 'solar:videocamera-linear',     flip: false },
  { label: 'Chat',      icon: 'solar:chat-round-linear',      flip: true  },
  { label: 'SMS',       isSms: true                                        },
  { label: 'Email',     icon: 'solar:letter-linear',          flip: false },
  { label: 'Letter',    icon: 'solar:letter-opened-linear',   flip: false },
];

export const LOG_TYPE_ICON = {
  'General':   { icon: 'solar:document-text-linear',  flip: false },
  'Call':      { icon: 'solar:phone-calling-linear',   flip: false },
  'In Person': { icon: 'solar:user-linear',            flip: false },
  'Virtual':   { icon: 'solar:videocamera-linear',     flip: false },
  'Chat':      { icon: 'solar:chat-round-linear',      flip: true  },
  'SMS':       { icon: null,                           flip: false },
  'Email':     { icon: 'solar:letter-linear',          flip: false },
  'Letter':    { icon: 'solar:letter-opened-linear',   flip: false },
};

export const TYPE_LOG_LABEL = {
  'General':   'General',
  'Call':      'Outgoing Call',
  'In Person': 'In Person',
  'Virtual':   'Virtual Call',
  'Chat':      'Chat',
  'SMS':       'Outgoing SMS',
  'Email':     'Email',
  'Letter':    'Letter',
};

export const OUTCOME_COLOR = {
  'Successful':   'var(--status-success)',
  'Unsuccessful': 'var(--status-error)',
  'Note':         'var(--status-warning)',
};

export const ACTIVITY_FILTERS = [
  { key: 'All', dot: null },
  { key: 'Successful', dot: 'var(--status-success)' },
  { key: 'Unsuccessful', dot: 'var(--status-error)' },
  { key: 'Note', dot: '#145ECC' },
];

export const LOG_FOR_OPTIONS = [
  { key: 'care-program', label: 'Care Program/Gaps' },
  { key: 'hcc-gaps',     label: 'HCC Gaps' },
];

export const logActivityCategory = (log) => {
  const c = log.outcomeColor || '';
  if (c.includes('success')) return 'Successful';
  if (c.includes('error')) return 'Unsuccessful';
  return 'Note';
};

export const matchesOutreachScope = (log, scope) => {
  if (!scope || scope === 'All') return true;
  if (scope === 'HCC Gaps') return !!log.outreachSource || log.logFor === 'hcc-gaps';
  if (scope === 'Care Gaps') return (log.programs || []).length > 0 || log.logFor === 'care-program';
  return (log.programs || []).includes(scope);
};

export function formatNow() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy}, ${hh}:${min}`;
}

export function parseDatetime(dt) {
  if (!dt) {
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      monthLabel: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      monthKey: `${now.getMonth()}-${now.getFullYear()}`,
    };
  }
  const [datePart, timePart] = dt.split(', ');
  const [mm, dd, yyyy] = datePart.split('/');
  const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  return {
    date: `${mm}/${dd}`,
    time: (timePart || '').trim(),
    monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    monthKey: `${d.getMonth()}-${d.getFullYear()}`,
  };
}

export function parsePickerValue(v) {
  if (!v) return { date: null, hour: 0, minute: 0 };
  const parts = v.split(', ');
  const datePart = parts[0];
  const timePart = parts[1] || '';
  const match24 = timePart.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) return { date: datePart, hour: parseInt(match24[1]), minute: parseInt(match24[2]) };
  const match12 = timePart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const m = parseInt(match12[2]);
    const ap = match12[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return { date: datePart, hour: h, minute: m };
  }
  return { date: datePart, hour: 0, minute: 0 };
}
