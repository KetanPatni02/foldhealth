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

/**
 * Build a care plan PDF from the selected elements.
 *
 * @returns {Blob}
 */
export function generateCarePlanPdf(meta, selection) {
  const { patientName = 'Patient', programName = '', sharedBy = '', date = '' } = meta;
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

  const drawHeaderBand = () => {
    doc.setFillColor(...C.surface);
    doc.rect(0, 0, pageW, 108, 'F');
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.5);
    doc.line(0, 108, pageW, 108);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...C.text);
    doc.text('Care Plan', margin, 44);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    if (programName) doc.text(programName, margin, 62);

    const metaPairs = [
      { label: 'Patient', value: patientName },
      { label: 'Date', value: date || '—' },
      ...(sharedBy ? [{ label: 'Prepared by', value: sharedBy }] : []),
    ];
    const colMid = margin + contentW * 0.5;
    metaPairs.forEach((pair, i) => {
      const x = i % 2 === 0 ? margin : colMid;
      const row = Math.floor(i / 2);
      const metaY = 78 + row * 26;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.faint);
      doc.text(pair.label.toUpperCase(), x, metaY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...C.text);
      doc.text(esc(pair.value), x, metaY + 11, { maxWidth: contentW * 0.45 });
    });

    y = 128;
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

  const drawStatusPill = (status, x, anchorY) => {
    const style = statusStyle(status);
    const label = esc(status || '—');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const padX = 8;
    const padY = 4;
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

  const drawItemCard = ({ title, subtitle, metaLeft, metaRight, status }) => {
    const titleLines = doc.splitTextToSize(esc(title), contentW - 100);
    const subtitleLines = subtitle
      ? doc.splitTextToSize(esc(subtitle), contentW - 24)
      : [];
    const cardPad = 12;
    const titleH = titleLines.length * 12;
    const subtitleH = subtitleLines.length ? subtitleLines.length * 11 + 4 : 0;
    const metaH = (metaLeft || metaRight) ? 14 : 0;
    const cardH = cardPad * 2 + titleH + subtitleH + metaH;

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
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.faint);
      if (metaLeft) {
        doc.setFont('helvetica', 'bold');
        doc.text(metaLeft.label, margin + cardPad, innerY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.text);
        doc.text(esc(metaLeft.value), margin + cardPad + doc.getTextWidth(metaLeft.label) + 4, innerY);
      }
      if (metaRight) {
        const rightX = margin + contentW * 0.55;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...C.faint);
        doc.text(metaRight.label, rightX, innerY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...C.text);
        doc.text(esc(metaRight.value), rightX + doc.getTextWidth(metaRight.label) + 4, innerY);
      }
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
        metaLeft: g.currentValue ? { label: 'Current value:', value: g.currentValue } : null,
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
