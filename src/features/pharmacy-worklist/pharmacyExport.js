import { parseLocalDate } from '../../lib/localDate';

// Outreach export for auditors (Suresh): every outreach and assessment logged
// on the members in view within a date range, one row each, with a link that
// opens that member's Outreach tab in Fold.

export const OUTREACH_EXPORT_COLUMNS = [
  { key: 'member', label: 'Member' },
  { key: 'memberId', label: 'Member ID' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'kind', label: 'Record' },
  { key: 'type', label: 'Type' },
  { key: 'contact', label: 'Contacted' },
  { key: 'gaps', label: 'Gaps' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'by', label: 'Logged By' },
  { key: 'note', label: 'Note' },
  { key: 'link', label: 'Link' },
];

// The link an auditor pastes into Fold to open this outreach.
export const outreachLink = (origin, memberId, outreachId) =>
  `${origin}/#/population/pharmacy?member=${encodeURIComponent(memberId)}&outreach=${encodeURIComponent(outreachId)}`;

function inRange(mdy, from, to) {
  const d = parseLocalDate(mdy);
  const start = parseLocalDate(from);
  const end = parseLocalDate(to);
  if (!d || !start || !end) return false;
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

// `members`: worklist members (callHistory per member); `range`: [from, to].
export function outreachExportRows(members, [from, to], origin) {
  const rows = [];
  for (const m of members) {
    for (const c of m.callHistory || []) {
      if (!inRange(c.date, from, to)) continue;
      rows.push({
        member: m.name,
        memberId: m.memberId || m.id,
        date: c.date,
        time: c.time || '',
        kind: c.kind === 'pharmacy-verification' ? 'Assessment' : 'Outreach',
        type: c.action || c.type || c.mode || '',
        contact: [c.party, c.contact].filter(Boolean).join(': '),
        gaps: (c.measures || []).join(', '),
        outcome: c.outcome || '',
        by: c.by || '',
        note: c.note || '',
        link: outreachLink(origin, m.id, c.id),
      });
    }
  }
  return rows.toSorted((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows, columns = OUTREACH_EXPORT_COLUMNS) {
  return [columns.map(c => csvCell(c.label)).join(','), ...rows.map(r => columns.map(c => csvCell(r[c.key])).join(','))].join('\n');
}

// Reads "?member=…&outreach=…" from a pharmacy worklist link.
export function outreachLinkTarget(hash) {
  const query = (hash || '').split('?')[1];
  if (!query) return null;
  const params = new URLSearchParams(query);
  const member = params.get('member');
  return member ? { member, outreach: params.get('outreach') } : null;
}
