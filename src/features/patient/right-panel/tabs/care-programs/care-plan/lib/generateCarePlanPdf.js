import jsPDF from 'jspdf';

const esc = (s) => String(s ?? '');

const MARGIN = 36;
const FEATURED_LIMIT = 5;

const C = {
  text: [26, 35, 32],
  muted: [90, 106, 101],
  faint: [151, 164, 160],
  border: [226, 232, 229],
  surface: [244, 248, 252],
  activeRow: [245, 252, 248],
  white: [255, 255, 255],
};

const STATUS_STYLE = {
  'Not Started': { bg: [244, 245, 245], text: [90, 106, 101] },
  'In Progress': { bg: [232, 248, 240], text: [0, 122, 66] },
  'On Hold': { bg: [244, 245, 245], text: [90, 106, 101] },
  Met: { bg: [232, 248, 240], text: [0, 122, 66] },
  'Not Met': { bg: [255, 245, 245], text: [215, 40, 37] },
  Overdue: { bg: [255, 245, 245], text: [215, 40, 37] },
};

const ACTIVE_STATUSES = new Set(['In Progress', 'On Hold', 'Met', 'Not Met', 'Overdue']);

function statusStyle(status) {
  return STATUS_STYLE[status] || STATUS_STYLE['Not Started'];
}

function formatPdfDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function itemSortRank(status) {
  if (status === 'In Progress') return 0;
  if (ACTIVE_STATUSES.has(status)) return 1;
  return 2;
}

function splitFeatured(items, limit = FEATURED_LIMIT) {
  const sorted = [...items].sort((a, b) => {
    const r = itemSortRank(a.status) - itemSortRank(b.status);
    if (r !== 0) return r;
    return (a.title || '').localeCompare(b.title || '');
  });
  return {
    featured: sorted.slice(0, limit),
    additional: sorted.slice(limit),
  };
}

function isActiveRow(status) {
  return status === 'In Progress';
}

/**
 * Build a care plan PDF from the selected elements.
 *
 * @returns {Blob}
 */
export function generateCarePlanPdf(meta, selection) {
  const {
    patientName = 'Patient',
    programName = '',
    sharedBy = '',
    date = '',
    note = '',
  } = meta;

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = MARGIN;
  let pageNum = 1;

  const cols = {
    start: MARGIN + contentW * 0.58,
    target: MARGIN + contentW * 0.72,
    value: MARGIN + contentW * 0.86,
    titleW: contentW * 0.54,
  };

  const footer = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    doc.text('Generated from Fold Health', MARGIN, pageH - 24);
    doc.text(`Page ${pageNum}`, pageW - MARGIN, pageH - 24, { align: 'right' });
  };

  const newPage = () => {
    footer();
    doc.addPage();
    pageNum += 1;
    y = MARGIN;
  };

  const ensureRoom = (needed = 40) => {
    if (y > pageH - MARGIN - needed) newPage();
  };

  const drawRule = () => {
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y, pageW - MARGIN, y);
  };

  const drawStatusPill = (status, x, baselineY) => {
    const style = statusStyle(status);
    const label = esc(status || '—');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const padX = 6;
    const textW = doc.getTextWidth(label);
    const pillW = textW + padX * 2;
    const pillH = 12;
    const pillY = baselineY - pillH + 3;
    doc.setFillColor(...style.bg);
    doc.roundedRect(x, pillY, pillW, pillH, 2, 2, 'F');
    doc.setTextColor(...style.text);
    doc.text(label, x + padX, baselineY);
    return pillW;
  };

  const drawMetaColumn = (label, value, x, baselineY, align = 'left') => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    doc.text(label, x, baselineY - 10, { align });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(esc(value), x, baselineY, { align });
  };

  const drawDocumentHeader = () => {
    const rightX = pageW - MARGIN;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...C.text);
    doc.text('Care Plan', MARGIN, y);

    if (date) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.faint);
      doc.text('DATE', rightX - 120, y - 8, { align: 'left' });
      doc.setFontSize(9);
      doc.setTextColor(...C.text);
      doc.text(date, rightX - 120, y + 4, { align: 'left' });
    }

    if (sharedBy) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.faint);
      doc.text('PREPARED BY', rightX, y - 8, { align: 'right' });
      doc.setFontSize(9);
      doc.setTextColor(...C.text);
      const nameLines = doc.splitTextToSize(esc(sharedBy), 110);
      doc.text(nameLines[0], rightX, y + 4, { align: 'right' });
    }

    y += 22;

    if (programName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...C.muted);
      const lines = doc.splitTextToSize(esc(programName), contentW * 0.55);
      for (const line of lines) {
        doc.text(line, MARGIN, y);
        y += 12;
      }
    }

    y += 10;
    drawRule();
    y += 12;
  };

  const drawContextBar = (conditions) => {
    const barH = 34;
    ensureRoom(barH + 8);
    doc.setFillColor(...C.surface);
    doc.roundedRect(MARGIN, y, contentW, barH, 3, 3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    doc.text('PATIENT', MARGIN + 10, y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.text);
    doc.text(esc(patientName), MARGIN + 10, y + 24);

    const condX = MARGIN + contentW * 0.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    doc.text('CONDITIONS', condX, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    const condText = conditions?.length ? conditions.join(', ') : 'None recorded';
    const condLines = doc.splitTextToSize(esc(condText), contentW * 0.45);
    doc.text(condLines[0], condX, y + 24);

    y += barH + 14;
  };

  const drawSectionHeader = (title, count, countNoun) => {
    ensureRoom(28);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.text);
    doc.text(title, MARGIN, y);
    if (count != null && countNoun) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.faint);
      doc.text(`${count} ${countNoun}${count === 1 ? '' : 's'}`, pageW - MARGIN, y, { align: 'right' });
    }
    y += 14;
  };

  const drawFeaturedGoalRow = (goal) => {
    const titleLines = doc.splitTextToSize(esc(goal.title), cols.titleW - 70);
    const subtitleLines = goal.subtitle
      ? doc.splitTextToSize(esc(goal.subtitle), cols.titleW)
      : [];
    const rowH = Math.max(36, 16 + titleLines.length * 11 + subtitleLines.length * 10 + 8);

    ensureRoom(rowH + 4);
    const rowY = y;

    if (isActiveRow(goal.status)) {
      doc.setFillColor(...C.activeRow);
      doc.rect(MARGIN, rowY, contentW, rowH, 'F');
    }

    let textY = rowY + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text(titleLines[0], MARGIN + 4, textY);
    let titleEndX = MARGIN + 4 + doc.getTextWidth(titleLines[0]) + 6;
    drawStatusPill(goal.status, titleEndX, textY);
    for (let i = 1; i < titleLines.length; i += 1) {
      textY += 11;
      doc.text(titleLines[i], MARGIN + 4, textY);
    }

    if (subtitleLines.length) {
      textY += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      for (const line of subtitleLines) {
        doc.text(line, MARGIN + 4, textY);
        textY += 10;
      }
    }

    const metaY = rowY + rowH - 8;
    drawMetaColumn('Start', formatPdfDate(goal.createdAt), cols.start, metaY);
    drawMetaColumn('Target', formatPdfDate(goal.targetDate), cols.target, metaY);
    drawMetaColumn('Current value', goal.currentValue || 'No Data', cols.value, metaY, 'right');

    y = rowY + rowH;
    drawRule();
  };

  const drawCompactHeader = (headers) => {
    ensureRoom(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    headers.forEach(({ label, x, align }) => {
      doc.text(label, x, y, { align: align || 'left' });
    });
    y += 10;
    drawRule();
    y += 6;
  };

  const drawCompactGoalRow = (goal) => {
    const titleLines = doc.splitTextToSize(esc(goal.title), cols.titleW - 8);
    const subLine = goal.subtitle ? doc.splitTextToSize(esc(goal.subtitle), cols.titleW - 8)[0] : null;
    const rowH = subLine ? 28 : 20;
    ensureRoom(rowH + 2);
    const rowY = y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(titleLines[0], MARGIN + 2, rowY + 11);
    if (subLine) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text(subLine, MARGIN + 2, rowY + 21);
    }

    const statusX = MARGIN + contentW * 0.48;
    drawStatusPill(goal.status, statusX, rowY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.text);
    doc.text(formatPdfDate(goal.createdAt), MARGIN + contentW * 0.62, rowY + 9);
    doc.setTextColor(...C.faint);
    doc.text(formatPdfDate(goal.targetDate), MARGIN + contentW * 0.62, rowY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    doc.text('Current value', cols.value, rowY + 9, { align: 'right' });
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(esc(goal.currentValue || 'No Data'), cols.value, rowY + 18, { align: 'right' });

    y = rowY + rowH;
    drawRule();
  };

  const drawFeaturedInterventionRow = (item) => {
    const titleLines = doc.splitTextToSize(esc(item.title), cols.titleW - 70);
    const rowH = Math.max(28, 14 + titleLines.length * 11);
    ensureRoom(rowH + 4);
    const rowY = y;

    if (isActiveRow(item.status)) {
      doc.setFillColor(...C.activeRow);
      doc.rect(MARGIN, rowY, contentW, rowH, 'F');
    }

    let textY = rowY + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text(titleLines[0], MARGIN + 4, textY);
    drawStatusPill(item.status, MARGIN + 4 + doc.getTextWidth(titleLines[0]) + 6, textY);
    for (let i = 1; i < titleLines.length; i += 1) {
      textY += 11;
      doc.text(titleLines[i], MARGIN + 4, textY);
    }

    const metaY = rowY + rowH - 8;
    drawMetaColumn('Assigned to', item.assignee?.name || '—', cols.target, metaY);
    drawMetaColumn('Start', formatPdfDate(item.createdAt), cols.start, metaY);

    y = rowY + rowH;
    drawRule();
  };

  const drawCompactInterventionRow = (item) => {
    ensureRoom(22);
    const rowY = y;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    const titleLine = doc.splitTextToSize(esc(item.title), cols.titleW - 8)[0];
    doc.text(titleLine, MARGIN + 2, rowY + 12);
    drawStatusPill(item.status, MARGIN + contentW * 0.48, rowY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(esc(item.assignee?.name || '—'), MARGIN + contentW * 0.68, rowY + 12);
    y = rowY + 20;
    drawRule();
  };

  const drawFeaturedBarrierRow = (item) => {
    const titleLines = doc.splitTextToSize(esc(item.title), cols.titleW - 70);
    const descLines = item.description
      ? doc.splitTextToSize(esc(item.description), cols.titleW)
      : [];
    const rowH = Math.max(28, 14 + titleLines.length * 11 + descLines.length * 10);
    ensureRoom(rowH + 4);
    const rowY = y;

    if (isActiveRow(item.status)) {
      doc.setFillColor(...C.activeRow);
      doc.rect(MARGIN, rowY, contentW, rowH, 'F');
    }

    let textY = rowY + 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    doc.text(titleLines[0], MARGIN + 4, textY);
    drawStatusPill(item.status, MARGIN + 4 + doc.getTextWidth(titleLines[0]) + 6, textY);
    if (descLines.length) {
      textY += 11;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      for (const line of descLines) {
        doc.text(line, MARGIN + 4, textY);
        textY += 10;
      }
    }

    y = rowY + rowH;
    drawRule();
  };

  const drawCompactBarrierRow = (item) => {
    const titleLine = doc.splitTextToSize(esc(item.title), cols.titleW - 8)[0];
    const descLine = item.description
      ? doc.splitTextToSize(esc(item.description), cols.titleW - 8)[0]
      : null;
    const rowH = descLine ? 26 : 18;
    ensureRoom(rowH + 2);
    const rowY = y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text(titleLine, MARGIN + 2, rowY + 11);
    if (descLine) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text(descLine, MARGIN + 2, rowY + 20);
    }
    drawStatusPill(item.status, MARGIN + contentW * 0.55, rowY + 12);

    y = rowY + rowH;
    drawRule();
  };

  const drawGoalsSection = (goals) => {
    if (!goals.length) {
      drawSectionHeader('Goals', 0, 'goal');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...C.faint);
      doc.text('No goals included.', MARGIN, y + 4);
      y += 18;
      return;
    }

    const { featured, additional } = splitFeatured(goals);
    drawSectionHeader('Goals', goals.length, 'goal');
    for (const g of featured) drawFeaturedGoalRow(g);

    if (additional.length) {
      y += 8;
      drawSectionHeader('Additional Goals', additional.length, 'goal');
      drawCompactHeader([
        { label: 'GOAL', x: MARGIN + 2 },
        { label: 'STATUS', x: MARGIN + contentW * 0.48 },
        { label: 'START / TARGET', x: MARGIN + contentW * 0.62 },
        { label: 'CURRENT VALUE', x: cols.value, align: 'right' },
      ]);
      for (const g of additional) drawCompactGoalRow(g);
    }
  };

  const drawInterventionsSection = (items) => {
    if (!items.length) {
      drawSectionHeader('Interventions', 0, 'intervention');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...C.faint);
      doc.text('No interventions included.', MARGIN, y + 4);
      y += 18;
      return;
    }

    const { featured, additional } = splitFeatured(items);
    drawSectionHeader('Interventions', items.length, 'intervention');
    for (const item of featured) drawFeaturedInterventionRow(item);

    if (additional.length) {
      y += 8;
      drawSectionHeader('Additional Interventions', additional.length, 'intervention');
      drawCompactHeader([
        { label: 'INTERVENTION', x: MARGIN + 2 },
        { label: 'STATUS', x: MARGIN + contentW * 0.48 },
        { label: 'ASSIGNED TO', x: MARGIN + contentW * 0.68 },
      ]);
      for (const item of additional) drawCompactInterventionRow(item);
    }
  };

  const drawBarriersSection = (items) => {
    if (!items.length) {
      drawSectionHeader('Barriers', 0, 'barrier');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...C.faint);
      doc.text('No barriers included.', MARGIN, y + 4);
      y += 18;
      return;
    }

    const { featured, additional } = splitFeatured(items);
    drawSectionHeader('Barriers', items.length, 'barrier');
    for (const item of featured) drawFeaturedBarrierRow(item);

    if (additional.length) {
      y += 8;
      drawSectionHeader('Additional Barriers', additional.length, 'barrier');
      drawCompactHeader([
        { label: 'BARRIER', x: MARGIN + 2 },
        { label: 'STATUS', x: MARGIN + contentW * 0.55 },
      ]);
      for (const item of additional) drawCompactBarrierRow(item);
    }
  };

  drawDocumentHeader();
  drawContextBar(selection.conditions);
  drawGoalsSection(selection.goals || []);
  y += 10;
  drawInterventionsSection(selection.interventions || []);
  y += 10;
  drawBarriersSection(selection.barriers || []);

  if (note?.trim()) {
    y += 6;
    drawSectionHeader('Additional Note');
    ensureRoom(20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    const lines = doc.splitTextToSize(esc(note.trim()), contentW);
    for (const line of lines) {
      ensureRoom(12);
      doc.text(line, MARGIN, y);
      y += 11;
    }
  }

  ensureRoom(30);
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.faint);
  const disclaimer = 'This document reflects the selected elements of the care plan at export time. Review before sharing with patients or external systems.';
  for (const line of doc.splitTextToSize(disclaimer, contentW)) {
    ensureRoom(10);
    doc.text(line, MARGIN, y);
    y += 9;
  }

  footer();
  return doc.output('blob');
}
