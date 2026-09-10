import jsPDF from 'jspdf';

const esc = (s) => String(s ?? '');

/**
 * Build a care plan PDF from the selected elements.
 * Layout mirrors buildCarePlanHtml so preview and download stay in sync.
 *
 * @returns {Blob}
 */
export function generateCarePlanPdf(meta, selection) {
  const { patientName = 'Patient', programName = '', sharedBy = '', date = '' } = meta;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureRoom = (rows = 72) => {
    if (y > pageH - margin - rows) {
      doc.addPage();
      y = margin;
    }
  };

  const heading = (text, size = 14) => {
    ensureRoom(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    doc.setTextColor(26, 35, 32);
    doc.text(text, margin, y);
    y += size + 8;
  };

  const sectionTitle = (text) => {
    ensureRoom(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(90, 106, 101);
    doc.text(text.toUpperCase(), margin, y);
    y += 16;
    doc.setDrawColor(226, 232, 229);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 12;
  };

  const body = (text, opts = {}) => {
    const { size = 10, color = [26, 35, 32], indent = 0 } = opts;
    if (!text) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(esc(text), contentW - indent);
    for (const line of lines) {
      ensureRoom(14);
      doc.text(line, margin + indent, y);
      y += size + 4;
    }
  };

  const tableHeader = (cols) => {
    ensureRoom(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(90, 106, 101);
    let x = margin;
    for (const col of cols) {
      doc.text(col.label, x, y);
      x += col.width;
    }
    y += 14;
    doc.setDrawColor(226, 232, 229);
    doc.line(margin, y - 4, pageW - margin, y - 4);
  };

  const tableRow = (cols) => {
    ensureRoom(18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(26, 35, 32);
    let x = margin;
    let rowHeight = 12;
    for (const col of cols) {
      const lines = doc.splitTextToSize(esc(col.value), col.width - 4);
      rowHeight = Math.max(rowHeight, lines.length * 11);
      doc.text(lines, x, y);
      x += col.width;
    }
    y += rowHeight + 4;
  };

  heading('Care Plan', 20);
  const metaLine = [
    patientName,
    programName,
    date,
    sharedBy ? `Prepared by ${sharedBy}` : '',
  ].filter(Boolean).join(' · ');
  body(metaLine, { size: 10, color: [90, 106, 101] });
  y += 8;

  sectionTitle('Conditions');
  if (selection.conditions?.length) {
    body(selection.conditions.join(', '));
  } else {
    body('None recorded', { color: [151, 164, 160] });
  }
  y += 6;

  sectionTitle('Goals');
  if (!selection.goals?.length) {
    body('No goals included.', { color: [151, 164, 160] });
  } else {
    tableHeader([
      { label: 'Goal', width: contentW * 0.52 },
      { label: 'Current Value', width: contentW * 0.24 },
      { label: 'Status', width: contentW * 0.24 },
    ]);
    for (const g of selection.goals) {
      tableRow([
        { value: g.subtitle ? `${g.title}\n${g.subtitle}` : g.title, width: contentW * 0.52 },
        { value: g.currentValue || '—', width: contentW * 0.24 },
        { value: g.status || '—', width: contentW * 0.24 },
      ]);
    }
  }
  y += 6;

  sectionTitle('Interventions');
  if (!selection.interventions?.length) {
    body('No interventions included.', { color: [151, 164, 160] });
  } else {
    tableHeader([
      { label: 'Intervention', width: contentW * 0.52 },
      { label: 'Assigned To', width: contentW * 0.24 },
      { label: 'Status', width: contentW * 0.24 },
    ]);
    for (const i of selection.interventions) {
      tableRow([
        { value: i.title, width: contentW * 0.52 },
        { value: i.assignee?.name || '—', width: contentW * 0.24 },
        { value: i.status || '—', width: contentW * 0.24 },
      ]);
    }
  }
  y += 6;

  sectionTitle('Barriers');
  if (!selection.barriers?.length) {
    body('No barriers included.', { color: [151, 164, 160] });
  } else {
    tableHeader([
      { label: 'Barrier', width: contentW * 0.72 },
      { label: 'Status', width: contentW * 0.28 },
    ]);
    for (const b of selection.barriers) {
      tableRow([
        { value: b.description ? `${b.title}\n${b.description}` : b.title, width: contentW * 0.72 },
        { value: b.status || '—', width: contentW * 0.28 },
      ]);
    }
  }

  ensureRoom(24);
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(151, 164, 160);
  doc.text(
    'Generated from Fold Health. This document reflects the selected elements of the care plan at export time.',
    margin,
    y,
    { maxWidth: contentW },
  );

  return doc.output('blob');
}
