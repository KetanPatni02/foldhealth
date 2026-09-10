import jsPDF from 'jspdf';

const esc = (s) => String(s ?? '');

const MARGIN = 36;
const NOT_STARTED = 'Not Started';

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
  if (status === 'Met') return 1;
  if (status === 'Not Met' || status === 'Overdue') return 2;
  if (status === 'On Hold') return 3;
  return 4;
}

function splitPrimaryAdditional(items) {
  const sortFn = (a, b) => {
    const r = itemSortRank(a.status) - itemSortRank(b.status);
    if (r !== 0) return r;
    return (a.title || '').localeCompare(b.title || '');
  };
  return {
    primary: items.filter((i) => i.status !== NOT_STARTED).sort(sortFn),
    additional: items.filter((i) => i.status === NOT_STARTED).sort(sortFn),
  };
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

  // Fixed column grid — shared by primary and additional tables within each GBI type.
  const COL = {
    title: { x: MARGIN + 2, w: contentW * 0.34 },
    status: { x: MARGIN + contentW * 0.36, w: 68 },
    col3: { x: MARGIN + contentW * 0.50, w: 62 },
    col4: { x: MARGIN + contentW * 0.62, w: 62 },
    col5: { x: MARGIN + contentW * 0.74, w: contentW * 0.26 - 4 },
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

  const drawStatusPill = (status, x, baselineY, maxW = COL.status.w) => {
    const style = statusStyle(status);
    let label = esc(status || '—');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const padX = 5;
    let textW = doc.getTextWidth(label);
    if (textW + padX * 2 > maxW) {
      doc.setFontSize(6);
      textW = doc.getTextWidth(label);
    }
    const pillW = Math.min(maxW, textW + padX * 2);
    const pillH = 12;
    const pillY = baselineY - pillH + 3;
    doc.setFillColor(...style.bg);
    doc.roundedRect(x, pillY, pillW, pillH, 2, 2, 'F');
    doc.setTextColor(...style.text);
    doc.text(label, x + padX, baselineY);
    return pillW;
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
      for (const line of doc.splitTextToSize(esc(programName), contentW * 0.55)) {
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
    doc.text(doc.splitTextToSize(esc(condText), contentW * 0.45)[0], condX, y + 24);

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

  const drawTableHeader = (headers) => {
    ensureRoom(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...C.faint);
    for (const { label, x, align } of headers) {
      doc.text(label, x, y, { align: align || 'left' });
    }
    y += 10;
    drawRule();
    y += 6;
  };

  const measureTextBlock = (title, subtitle, width) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const titleLines = doc.splitTextToSize(esc(title), width);
    let h = titleLines.length * 10;
    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      h += 3 + doc.splitTextToSize(esc(subtitle), width).length * 9;
    }
    return { titleLines, subtitleLines: subtitle ? doc.splitTextToSize(esc(subtitle), width) : [], h };
  };

  const drawTitleBlock = (titleLines, subtitleLines, x, startY) => {
    let textY = startY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    for (const line of titleLines) {
      doc.text(line, x, textY);
      textY += 10;
    }
    if (subtitleLines.length) {
      textY += 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      for (const line of subtitleLines) {
        doc.text(line, x, textY);
        textY += 9;
      }
    }
    return textY;
  };

  const drawCellText = (text, x, yPos, w, align = 'left') => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    const lines = doc.splitTextToSize(esc(text), w);
    doc.text(lines[0], align === 'right' ? x + w : x, yPos, { align });
    return lines.length > 1 ? lines[1] : null;
  };

  const GOAL_HEADERS = [
    { label: 'GOAL', x: COL.title.x },
    { label: 'STATUS', x: COL.status.x },
    { label: 'START', x: COL.col3.x },
    { label: 'TARGET', x: COL.col4.x },
    { label: 'CURRENT VALUE', x: COL.col5.x + COL.col5.w, align: 'right' },
  ];

  const drawGoalRow = (goal, emphasize) => {
    const { titleLines, subtitleLines, h } = measureTextBlock(
      goal.title,
      goal.subtitle,
      COL.title.w - 4,
    );
    const rowH = Math.max(26, h + 10);
    ensureRoom(rowH + 2);
    const rowY = y;

    if (emphasize && goal.status === 'In Progress') {
      doc.setFillColor(...C.activeRow);
      doc.rect(MARGIN, rowY, contentW, rowH, 'F');
    }

    drawTitleBlock(titleLines, subtitleLines, COL.title.x, rowY + 11);

    const midY = rowY + rowH / 2 + 3;
    drawStatusPill(goal.status, COL.status.x, midY);
    drawCellText(formatPdfDate(goal.createdAt), COL.col3.x, midY, COL.col3.w);
    drawCellText(formatPdfDate(goal.targetDate), COL.col4.x, midY, COL.col4.w);
    drawCellText(goal.currentValue || 'No Data', COL.col5.x, midY, COL.col5.w, 'right');

    y = rowY + rowH;
    drawRule();
  };

  const INTV_HEADERS = [
    { label: 'INTERVENTION', x: COL.title.x },
    { label: 'STATUS', x: COL.status.x },
    { label: 'ASSIGNED TO', x: COL.col3.x },
    { label: 'START', x: COL.col4.x },
    { label: '', x: COL.col5.x },
  ];

  const drawInterventionRow = (item, emphasize) => {
    const { titleLines, subtitleLines, h } = measureTextBlock(item.title, null, COL.title.w - 4);
    const rowH = Math.max(24, h + 10);
    ensureRoom(rowH + 2);
    const rowY = y;

    if (emphasize && item.status === 'In Progress') {
      doc.setFillColor(...C.activeRow);
      doc.rect(MARGIN, rowY, contentW, rowH, 'F');
    }

    drawTitleBlock(titleLines, subtitleLines, COL.title.x, rowY + 11);
    const midY = rowY + rowH / 2 + 3;
    drawStatusPill(item.status, COL.status.x, midY);
    drawCellText(item.assignee?.name || '—', COL.col3.x, midY, COL.col3.w);
    drawCellText(formatPdfDate(item.createdAt), COL.col4.x, midY, COL.col4.w);

    y = rowY + rowH;
    drawRule();
  };

  const BARRIER_HEADERS = [
    { label: 'BARRIER', x: COL.title.x },
    { label: 'STATUS', x: COL.status.x },
    { label: '', x: COL.col3.x },
    { label: '', x: COL.col4.x },
    { label: '', x: COL.col5.x },
  ];

  const drawBarrierRow = (item, emphasize) => {
    const { titleLines, subtitleLines, h } = measureTextBlock(
      item.title,
      item.description,
      COL.title.w - 4,
    );
    const rowH = Math.max(24, h + 10);
    ensureRoom(rowH + 2);
    const rowY = y;

    if (emphasize && item.status === 'In Progress') {
      doc.setFillColor(...C.activeRow);
      doc.rect(MARGIN, rowY, contentW, rowH, 'F');
    }

    drawTitleBlock(titleLines, subtitleLines, COL.title.x, rowY + 11);
    const midY = rowY + rowH / 2 + 3;
    drawStatusPill(item.status, COL.status.x, midY);

    y = rowY + rowH;
    drawRule();
  };

  const drawGbiSection = ({
    items,
    noun,
    primaryTitle,
    additionalTitle,
    headers,
    drawRow,
  }) => {
    if (!items.length) {
      drawSectionHeader(primaryTitle, 0, noun);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(...C.faint);
      doc.text(`No ${noun}s included.`, MARGIN, y + 4);
      y += 18;
      return;
    }

    const { primary, additional } = splitPrimaryAdditional(items);

    if (primary.length) {
      drawSectionHeader(primaryTitle, primary.length, noun);
      drawTableHeader(headers);
      for (const item of primary) drawRow(item, true);
    }

    if (additional.length) {
      if (primary.length) y += 8;
      const addTitle = primary.length ? additionalTitle : primaryTitle;
      drawSectionHeader(addTitle, additional.length, noun);
      drawTableHeader(headers);
      for (const item of additional) drawRow(item, false);
    }
  };

  drawDocumentHeader();
  drawContextBar(selection.conditions);

  drawGbiSection({
    items: selection.goals || [],
    noun: 'goal',
    primaryTitle: 'Goals',
    additionalTitle: 'Additional Goals',
    headers: GOAL_HEADERS,
    drawRow: drawGoalRow,
  });

  y += 10;
  drawGbiSection({
    items: selection.interventions || [],
    noun: 'intervention',
    primaryTitle: 'Interventions',
    additionalTitle: 'Additional Interventions',
    headers: INTV_HEADERS,
    drawRow: drawInterventionRow,
  });

  y += 10;
  drawGbiSection({
    items: selection.barriers || [],
    noun: 'barrier',
    primaryTitle: 'Barriers',
    additionalTitle: 'Additional Barriers',
    headers: BARRIER_HEADERS,
    drawRow: drawBarrierRow,
  });

  if (note?.trim()) {
    y += 6;
    drawSectionHeader('Additional Note');
    ensureRoom(20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    for (const line of doc.splitTextToSize(esc(note.trim()), contentW)) {
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
