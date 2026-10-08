import jsPDF from 'jspdf';
import { CIS_DOSE_STATUS } from './cisRules';
import { fmtDate } from './cisStatusConfig';

const INK = [20, 24, 32];
const MUTED = [110, 118, 134];
const LINE = [220, 224, 230];
const SHADE = [246, 247, 249];
const STATUS_COLOR = {
  [CIS_DOSE_STATUS.completed]: [46, 125, 50],
  [CIS_DOSE_STATUS.completedLate]: [46, 125, 50],
  [CIS_DOSE_STATUS.notCounted]: [198, 40, 40],
  [CIS_DOSE_STATUS.overdue]: [198, 40, 40],
  [CIS_DOSE_STATUS.cannotMeet]: [198, 40, 40],
  [CIS_DOSE_STATUS.dueNow]: [178, 120, 0],
};

const COLUMNS = [
  { label: 'Vaccine (Dose)', width: 150 },
  { label: 'Recommended window', width: 140 },
  { label: 'Earliest allowed', width: 90 },
  { label: 'Date administered', width: 100 },
  { label: 'Status', width: 90 },
  { label: 'Note', width: 0 },
];

// Record mode: only the doses given, with the product that was recorded.
const RECORD_COLUMNS = [
  { label: 'Vaccine (Dose)', width: 150 },
  { label: 'Product', width: 190 },
  { label: 'CVX', width: 50 },
  { label: 'Date administered', width: 110 },
  { label: 'Status', width: 0 },
];

const ageLabel = (m) => (m === 0 ? 'At birth' : `${m} Month${m === 1 ? '' : 's'}`);
const windowOf = (r) => {
  const from = fmtDate(r.start);
  return r.recommendedEnd && +r.recommendedEnd !== +r.start ? `${from} - ${fmtDate(r.recommendedEnd)}` : from;
};

/**
 * CIS-CMB10 as a printable PDF. 'schedule' (default): every dose, grouped
 * by the age it starts at, like a child's vaccination schedule. 'record':
 * only the doses given, by vaccine, with product and CVX: the confirmed
 * immunization history saved to the gap as evidence (no billing).
 *
 * @param {object} params
 * @param {'schedule'|'record'} [params.mode='schedule']
 * @returns {{ blob: Blob, filename: string }}
 */
export function generateCisSchedulePdf({ member, result, notes, startedOn, mode = 'schedule' }) {
  const isRecord = mode === 'record';
  const COLS = isRecord ? RECORD_COLUMNS : COLUMNS;
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const tableW = pageW - margin * 2;
  const cols = COLS.map(c => ({ ...c, width: c.width || tableW - COLS.reduce((n, x) => n + x.width, 0) }));
  const statusCol = cols.findIndex(c => c.label === 'Status');
  const pad = 6;
  let y = margin;

  const text = (value, x, top, { size = 9, bold = false, color = INK } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, top);
  };

  const columnHeader = () => {
    doc.setFillColor(...SHADE);
    doc.rect(margin, y, tableW, 20, 'F');
    let x = margin;
    cols.forEach(c => { text(c.label, x + pad, y + 13, { size: 8, color: MUTED }); x += c.width; });
    y += 20;
  };

  const newPage = () => {
    doc.addPage();
    y = margin;
    columnHeader();
  };

  // Header
  text(isRecord ? 'Immunization Record' : 'Childhood Immunization Schedule', margin, y + 6, { size: 16, bold: true });
  text('CIS-CMB10  (Childhood Immunization Status, Combination 10)', margin, y + 22, { size: 9, color: MUTED });
  y += 42;
  const facts = [
    ['Patient', member?.name],
    ['DOB', fmtDate(result.dob)],
    ['Member ID', member?.memberId],
    ['Doses complete', `${result.doses.completed}/${result.doses.total}`],
    isRecord ? ['Doses on record', String(result.antigens.reduce((n, a) => n + a.rows.filter(r => r.kind === 'given').length, 0))] : [],
    ['Status', result.evaluation],
    ['Started', startedOn ? fmtDate(startedOn) : '-'],
    ['Ends (2nd birthday)', fmtDate(result.secondBirthday)],
  ].filter(([, v]) => v);
  let x = margin;
  facts.forEach(([k, v]) => {
    text(k, x, y, { size: 8, color: MUTED });
    text(String(v), x, y + 13, { size: 10, bold: true });
    x += Math.max(doc.getTextWidth(String(v)), 60) + 28;
  });
  y += 28;
  if (isRecord) {
    text('Immunization history documented for HEDIS CIS-CMB10 care coordination. No vaccines were administered by this organization; not a billable service.', margin, y + 2, { size: 8, color: MUTED });
    y += 14;
  }
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  // Schedule: doses by the age they start at. Record: given doses by vaccine.
  const groups = [];
  if (isRecord) {
    result.antigens.forEach(a => {
      const given = a.rows.filter(r => r.kind === 'given').map(r => ({ a, r }));
      if (given.length) {
        groups.push({
          title: `${a.name} (${a.label})`,
          right: `${Math.min(a.valid.length, a.required)} of ${a.requiredLabel} counted`,
          items: given,
        });
      }
    });
  } else {
    result.antigens
      .flatMap(a => a.rows.map(r => ({ a, r })))
      .sort((p, q) => p.r.ageMonths - q.r.ageMonths || p.r.start - q.r.start)
      .forEach(it => {
        const last = groups[groups.length - 1];
        if (last && last.age === it.r.ageMonths) last.items.push(it);
        else groups.push({ age: it.r.ageMonths, items: [it] });
      });
    groups.forEach(g => {
      g.title = `${ageLabel(g.age)} (${g.items.length})`;
      g.right = `Start date: ${fmtDate(g.items[0].r.start)}`;
    });
  }

  columnHeader();
  if (!groups.length) {
    text('No immunizations on record.', margin + pad, y + 18, { size: 9, color: MUTED });
  }
  groups.forEach(g => {
    if (y > pageH - margin - 60) newPage();
    y += 6;
    text(g.title, margin + pad, y + 12, { size: 10, bold: true });
    doc.setFontSize(8);
    text(g.right, pageW - margin - pad - doc.getTextWidth(g.right), y + 12, { size: 8, color: MUTED });
    y += 20;

    g.items.forEach(({ a, r }) => {
      const note = notes?.[`${a.key}:${r.number}`]?.note || '';
      const status = [CIS_DOSE_STATUS.notCounted, CIS_DOSE_STATUS.completedLate].includes(r.status) && r.reason ? `${r.status}: ${r.reason}` : r.status;
      const values = isRecord
        ? [`${a.label} (Dose ${r.number})`, r.record.title, r.record.code, fmtDate(r.record.date), status]
        : [`${a.label} (Dose ${r.number})`, windowOf(r), fmtDate(r.earliest), r.record ? fmtDate(r.record.date) : '-', status, note];
      const cells = values.map((v, i) => doc.setFontSize(9).splitTextToSize(String(v || ''), cols[i].width - pad * 2));
      const h = Math.max(...cells.map(l => l.length)) * 11 + pad * 2;
      if (y + h > pageH - margin) newPage();
      let cx = margin;
      cells.forEach((lines, i) => {
        const color = i === statusCol ? STATUS_COLOR[r.status] || INK : i === 5 ? MUTED : INK;
        text(lines, cx + pad, y + pad + 8, { size: 9, color, bold: i === statusCol });
        cx += cols[i].width;
      });
      y += h;
      doc.setDrawColor(...LINE);
      doc.line(margin, y, pageW - margin, y);
    });
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    text(`Generated ${new Date().toLocaleString()}`, margin, pageH - 20, { size: 8, color: MUTED });
    const n = `Page ${p} of ${pages}`;
    text(n, pageW - margin - doc.getTextWidth(n), pageH - 20, { size: 8, color: MUTED });
  }

  return {
    blob: doc.output('blob'),
    filename: `${(member?.name || 'patient').replace(/\s+/g, '_')}_CIS-CMB10_${isRecord ? 'immunization_record' : 'schedule'}.pdf`,
  };
}
