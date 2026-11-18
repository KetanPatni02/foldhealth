import { assessmentContactLine, outreachEvidence, stepsByGap } from './pharmacyRecords';

// Outreaches or Assessments as a PDF for auditors (Suresh), laid out like the
// consolidated note: member block, then one section per record, an
// Assessment's steps grouped by gap.

// What each record prints: a heading, then label/value lines and, for an
// Assessment, its gaps with their steps. Kept apart from jsPDF so it can be
// tested.
export function recordSections(kind, records) {
  return records.map(r => {
    if (kind === 'assessment') {
      return {
        heading: `Assessment · ${r.date}${r.by ? ` · ${r.by}` : ''}`,
        lines: [['Contact', assessmentContactLine(r)], ['Outcome', r.outcome]],
        gaps: stepsByGap(r).map(g => ({ title: `${g.code} · ${g.name}`, items: g.steps.length ? g.steps : ['No steps recorded'] })),
        note: r.note,
      };
    }
    return {
      heading: `Outreach · ${r.date}${r.time ? ` ${r.time}` : ''}${r.by ? ` · ${r.by}` : ''}`,
      lines: [
        ['Type', r.type || r.mode || 'Call'],
        ['Contacted', r.contact],
        ['Gaps', (r.measures || []).join(', ')],
        ['Outcome', r.outcome],
        ...outreachEvidence(r),
      ].filter(([, v]) => v),
      gaps: [],
      note: r.note,
    };
  });
}

const PAGE = { w: 612, h: 792 };
const PAD = 40;
const WIDTH = PAGE.w - PAD * 2;
const C = {
  ink: [22, 24, 29],
  body: [58, 72, 95],
  muted: [138, 148, 168],
  rule: [233, 236, 241],
  accent: [128, 90, 213],
};

// `member`: { name, memberId, dob, healthPlan }; `kind`: 'outreach' | 'assessment'.
// Builds the document; downloadPharmacyRecordsPdf saves it.
export async function buildPharmacyRecordsPdf({ member, kind, records }) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  let y = PAD;
  const ensure = (h) => { if (y + h > PAGE.h - PAD) { doc.addPage(); y = PAD; } };
  const text = (str, { size = 10, color = C.body, bold = false, x = PAD, width = WIDTH, gap = 4 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    for (const line of doc.splitTextToSize(String(str), width)) {
      ensure(size + gap);
      doc.text(line, x, y + size);
      y += size + gap;
    }
  };
  const rule = () => { ensure(12); doc.setDrawColor(...C.rule); doc.line(PAD, y + 4, PAD + WIDTH, y + 4); y += 12; };

  const title = kind === 'assessment' ? 'Pharmacy Assessments' : 'Pharmacy Outreaches';
  text(title, { size: 16, color: C.ink, bold: true, gap: 6 });
  text([member.name, member.memberId && `Member ID ${member.memberId}`, member.dob && `DOB ${member.dob}`, member.healthPlan].filter(Boolean).join('  ·  '), { color: C.muted });
  text(`${records.length} record${records.length === 1 ? '' : 's'} · generated ${new Date().toLocaleDateString('en-US')}`, { color: C.muted, gap: 10 });
  rule();

  for (const s of recordSections(kind, records)) {
    ensure(40);
    text(s.heading, { size: 12, color: C.ink, bold: true, gap: 6 });
    for (const [label, value] of s.lines) {
      text(`${label}: ${value}`);
    }
    for (const g of s.gaps) {
      y += 4;
      text(g.title, { color: C.accent, bold: true });
      for (const item of g.items) text(`•  ${item}`, { x: PAD + 12, width: WIDTH - 12 });
    }
    if (s.note) {
      y += 4;
      text('Note', { bold: true, color: C.ink });
      text(s.note);
    }
    rule();
  }
  if (!records.length) text('Nothing logged yet.', { color: C.muted });
  return doc;
}

export async function downloadPharmacyRecordsPdf({ member, kind, records }) {
  const doc = await buildPharmacyRecordsPdf({ member, kind, records });
  const safe = (member.name || 'member').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  doc.save(`${safe}-${kind === 'assessment' ? 'assessments' : 'outreaches'}.pdf`);
}
