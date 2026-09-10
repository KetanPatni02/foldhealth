import jsPDF from 'jspdf';

const esc = (s) => String(s ?? '');

// Fold token palette (light mode) — kept as RGB tuples for jsPDF.
const C = {
  text: [26, 35, 32],
  muted: [90, 106, 101],
  faint: [151, 164, 160],
  border: [226, 232, 229],
  surface: [248, 249, 250],
  white: [255, 255, 255],
  brand: [107, 79, 212],
  brandLight: [244, 241, 254],
};

const STATUS_STYLE = {
  'Not Started': { bg: [244, 245, 245], text: [90, 106, 101] },
  'In Progress': { bg: [255, 252, 245], text: [217, 165, 11] },
  'On Hold': { bg: [244, 245, 245], text: [90, 106, 101] },
  Met: { bg: [245, 255, 250], text: [0, 122, 66] },
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
  const margin = 54;
  const contentW = pageW - margin * 2;
  let y = margin;
  let pageNum = 1;

  const footer = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.faint);
    const line = 'Generated from Fold Health';
    doc.text(line, margin, pageH - 28);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 28, { align: 'right' });
  };

  const newPage = () => {
    footer();
    doc.addPage();
    pageNum += 1;
    y = margin;
  };

  const ensureRoom = (needed = 48) => {
    if (y > pageH - margin - needed) newPage();
  };

  const measureMetaCell = (width, value) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(esc(value), width);
    return 10 + lines.length * 11;
  };

  const drawMetaCell = (x, startY, width, label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.faint);
    doc.text(label.toUpperCase(), x, startY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.text);
    const lines = doc.splitTextToSize(esc(value), width);
    let cellY = startY + 10;
    for (const line of lines) {
      doc.text(line, x, cellY);
      cellY += 11;
    }
    return cellY - startY;
  };

  const drawHeaderBand = () => {
    const colGap = 16;
    const colW = (contentW - colGap) / 2;
    const colRight = margin + colW + colGap;

    const metaPairs = [
      { label: 'Patient', value: patientName },
      { label: 'Date', value: date || '—' },
      ...(sharedBy ? [{ label: 'Prepared by', value: sharedBy }] : []),
    ];

    let contentY = 36;
    contentY += 26;

    let programLines = [];
    if (programName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      programLines = doc.splitTextToSize(esc(programName), contentW);
      contentY += programLines.length * 13 + 8;
    }

    let metaBottom = contentY;
    for (let i = 0; i < metaPairs.length; i += 2) {
      const left = metaPairs[i];
      const right = metaPairs[i + 1];
      const rowH = Math.max(
        measureMetaCell(colW, left.value),
        right ? measureMetaCell(colW, right.value) : 0,
      );
      metaBottom += rowH + 12;
    }

    const headerBottom = metaBottom + 14;

    doc.setFillColor(...C.surface);
    doc.rect(0, 0, pageW, headerBottom, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.line(0, headerBottom, pageW, headerBottom);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...C.text);
    doc.text('Care Plan', margin, 36);

    let drawY = 62;
    if (programLines.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...C.muted);
      for (const line of programLines) {
        doc.text(line, margin, drawY);
        drawY += 13;
      }
      drawY += 8;
    } else {
      drawY = 62;
    }

    let rowY = drawY;
    for (let i = 0; i < metaPairs.length; i += 2) {
      const left = metaPairs[i];
      const right = metaPairs[i + 1];
      const leftH = drawMetaCell(margin, rowY, colW, left.label, left.value);
      const rightH = right
        ? drawMetaCell(colRight, rowY, colW, right.label, right.value)
        : 0;
      rowY += Math.max(leftH, rightH) + 12;
    }

    y = headerBottom + 20;
  };

  const sectionTitle = (text) => {
    ensureRoom(32);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(text.toUpperCase(), margin, y);
    y += 14;
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  const mutedBody = (text) => {
    if (!text) return;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...C.faint);
    const lines = doc.splitTextToSize(esc(text), contentW);
    for (const line of lines) {
      ensureRoom(14);
      doc.text(line, margin, y);
      y += 13;
    }
    y += 4;
  };

  const bodyText = (text) => {
    if (!text) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.text);
    const lines = doc.splitTextToSize(esc(text), contentW);
    for (const line of lines) {
      ensureRoom(14);
      doc.text(line, margin, y);
      y += 13;
    }
    y += 4;
  };

  const drawStatusPill = (status, x, anchorY) => {
    const style = statusStyle(status);
    const label = esc(status || '—');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const padX = 8;
    const textW = doc.getTextWidth(label);
    const pillW = textW + padX * 2;
    const pillH = 14;
    const pillY = anchorY - pillH + 4;

    doc.setFillColor(...style.bg);
    doc.setDrawColor(...style.bg);
    doc.roundedRect(x, pillY, pillW, pillH, 3, 3, 'F');
    doc.setTextColor(...style.text);
    doc.text(label, x + padX, anchorY);
    return pillW;
  };

  const drawConditionChips = (conditions) => {
    if (!conditions?.length) {
      mutedBody('None recorded');
      return;
    }
    let x = margin;
    const chipH = 18;
    const gap = 6;
    ensureRoom(chipH + 8);
    for (const cond of conditions) {
      const label = esc(cond);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const textW = doc.getTextWidth(label);
      const chipW = textW + 16;
      if (x + chipW > pageW - margin) {
        x = margin;
        y += chipH + gap;
        ensureRoom(chipH + 8);
      }
      doc.setFillColor(...C.brandLight);
      doc.setDrawColor(207, 196, 245);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y - 12, chipW, chipH, 9, 9, 'FD');
      doc.setTextColor(47, 107, 94);
      doc.text(label, x + 8, y);
      x += chipW + gap;
    }
    y += chipH + 6;
  };

  const measureMetaLine = (meta, colW) => {
    if (!meta) return 0;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const value = `${meta.label} ${meta.value}`;
    const lines = doc.splitTextToSize(esc(value), colW);
    return lines.length * 11;
  };

  const drawMetaLine = (meta, x, innerY, colW) => {
    if (!meta) return innerY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.faint);
    const prefix = `${meta.label} `;
    const prefixW = doc.getTextWidth(prefix);
    doc.text(meta.label, x, innerY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    const valueLines = doc.splitTextToSize(esc(meta.value), colW - prefixW);
    if (valueLines.length === 1) {
      doc.text(valueLines[0], x + prefixW, innerY);
      return innerY + 11;
    }
    doc.text(valueLines[0], x + prefixW, innerY);
    let lineY = innerY + 11;
    for (let i = 1; i < valueLines.length; i += 1) {
      doc.text(valueLines[i], x, lineY);
      lineY += 11;
    }
    return lineY;
  };

  const drawItemCard = ({ title, subtitle, metaLeft, metaRight, metaFooter, status }) => {
    const cardPad = 12;
    const metaColW = contentW * 0.45;
    const titleLines = doc.splitTextToSize(esc(title), contentW - 100);
    const subtitleLines = subtitle
      ? doc.splitTextToSize(esc(subtitle), contentW - 24)
      : [];
    const titleH = titleLines.length * 12;
    const subtitleH = subtitleLines.length ? subtitleLines.length * 11 + 4 : 0;
    const metaRowH = (metaLeft || metaRight)
      ? Math.max(measureMetaLine(metaLeft, metaColW), measureMetaLine(metaRight, metaColW)) + 2
      : 0;
    const metaFooterH = metaFooter ? measureMetaLine(metaFooter, contentW - cardPad * 2) + 2 : 0;
    const cardH = cardPad * 2 + titleH + subtitleH + metaRowH + metaFooterH;

    ensureRoom(cardH + 8);
    const cardY = y;

    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, cardY, contentW, cardH, 4, 4, 'FD');

    let innerY = cardY + cardPad + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.text);
    for (const line of titleLines) {
      doc.text(line, margin + cardPad, innerY);
      innerY += 12;
    }

    if (status) {
      const pillLabel = esc(status || '—');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      const pillW = doc.getTextWidth(pillLabel) + 16;
      drawStatusPill(status, pageW - margin - cardPad - pillW, cardY + cardPad + 10);
    }

    if (subtitleLines.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      for (const line of subtitleLines) {
        doc.text(line, margin + cardPad, innerY);
        innerY += 11;
      }
    }

    if (metaLeft || metaRight) {
      const metaY = innerY + 2;
      const leftEnd = drawMetaLine(metaLeft, margin + cardPad, metaY, metaColW);
      const rightEnd = drawMetaLine(metaRight, margin + contentW * 0.52, metaY, metaColW);
      innerY = Math.max(leftEnd, rightEnd);
    }

    if (metaFooter) {
      innerY = drawMetaLine(metaFooter, margin + cardPad, innerY + 2, contentW - cardPad * 2);
    }

    y = cardY + cardH + 8;
  };

  drawHeaderBand();

  sectionTitle('Conditions');
  drawConditionChips(selection.conditions);

  sectionTitle('Goals');
  if (!selection.goals?.length) {
    mutedBody('No goals included.');
  } else {
    for (const g of selection.goals) {
      drawItemCard({
        title: g.title,
        subtitle: g.subtitle,
        status: g.status,
        metaLeft: { label: 'Start:', value: formatPdfDate(g.createdAt) },
        metaRight: { label: 'Target:', value: formatPdfDate(g.targetDate) },
        metaFooter: g.currentValue ? { label: 'Current value:', value: g.currentValue } : null,
      });
    }
  }

  sectionTitle('Interventions');
  if (!selection.interventions?.length) {
    mutedBody('No interventions included.');
  } else {
    for (const i of selection.interventions) {
      drawItemCard({
        title: i.title,
        status: i.status,
        metaLeft: { label: 'Assigned to:', value: i.assignee?.name || '—' },
      });
    }
  }

  sectionTitle('Barriers');
  if (!selection.barriers?.length) {
    mutedBody('No barriers included.');
  } else {
    for (const b of selection.barriers) {
      drawItemCard({
        title: b.title,
        subtitle: b.description,
        status: b.status,
      });
    }
  }

  if (note?.trim()) {
    sectionTitle('Additional Note');
    bodyText(note.trim());
  }

  ensureRoom(40);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.faint);
  const disclaimer = 'This document reflects the selected elements of the care plan at export time. Review before sharing with patients or external systems.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentW);
  for (const line of disclaimerLines) {
    ensureRoom(12);
    doc.text(line, margin, y);
    y += 11;
  }

  footer();
  return doc.output('blob');
}
