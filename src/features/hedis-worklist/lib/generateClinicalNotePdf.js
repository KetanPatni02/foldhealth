import jsPDF from 'jspdf';

/**
 * Build the consolidated Clinical Note PDF for a HEDIS care-gap encounter.
 *
 * Layout follows AC-14: one document with a shared header (patient + DOS +
 * Telehealth Statement) and one clearly-segregated section per gap with the
 * staff's responses. Header/footer style is intentionally kept generic so it
 * can be swapped for the production template later.
 *
 * @param {object} params
 * @param {object} params.member        HEDIS member record
 * @param {string[]} params.gapCodes    Codes included in this note
 * @param {string} params.dateOfService MM-DD-YYYY from the DatePicker
 * @param {boolean} params.audioOnly
 * @param {boolean} params.audioVideo
 * @param {Record<string, object>} params.gapData per-gap form values (state)
 * @param {string} [params.signedBy]   actor that triggered generation
 *
 * @returns {{ blob: Blob, filename: string }}
 */
export function generateClinicalNotePdf({
  member,
  gapCodes,
  dateOfService,
  audioOnly,
  audioVideo,
  gapData,
  signedBy = 'Care Manager',
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensureRoom = (rows = 80) => {
    if (y > pageH - margin - rows) {
      doc.addPage();
      y = margin;
    }
  };

  const heading = (text, size = 14, weight = 'bold') => {
    ensureRoom(36);
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    doc.setTextColor(20, 24, 32);
    doc.text(text, margin, y);
    y += size + 6;
  };

  const subHeading = (text) => {
    ensureRoom(24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(80, 88, 100);
    doc.text(text.toUpperCase(), margin, y);
    y += 14;
  };

  const body = (text, opts = {}) => {
    const { indent = 0, color = [40, 44, 52], size = 10 } = opts;
    if (!text) return;
    ensureRoom(24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text), pageW - margin * 2 - indent);
    for (const line of lines) {
      ensureRoom(16);
      doc.text(line, margin + indent, y);
      y += size + 4;
    }
  };

  const kv = (key, value) => {
    if (!value) return;
    ensureRoom(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60, 64, 72);
    doc.text(`${key}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 44, 52);
    doc.text(String(value), margin + 130, y);
    y += 16;
  };

  const divider = () => {
    ensureRoom(20);
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  // ── Header ────────────────────────────────────────────────────────────
  heading('Consolidated Clinical Note', 18);
  body(`Patient: ${member.name}   ·   ${member.gender === 'F' ? 'Female' : member.gender === 'M' ? 'Male' : 'Other'} · Age ${member.age}`);
  body(`Member ID: ${member.memberId}`);
  body(`Date of Service: ${dateOfService || '—'}`);
  body(`Generated: ${new Date().toLocaleString()}   ·   Signed by: ${signedBy}`);
  divider();

  // ── Telehealth Statement ──────────────────────────────────────────────
  subHeading('Telehealth Statement');
  if (!audioOnly && !audioVideo) {
    body('No telehealth consent recorded.');
  } else {
    if (audioOnly) {
      body('☑ Audio-only visit — Verbal consent obtained. Patient was informed of the nature of the visit and the limitations of audio-only communication, and agreed to proceed.');
    }
    if (audioVideo) {
      body('☑ Audio-video visit — Verbal consent obtained. Patient was informed of the nature of the visit and the limitations of audio-video communication, and agreed to proceed.');
    }
  }
  divider();

  // ── Per-gap sections ──────────────────────────────────────────────────
  const MEASURE_NAMES = {
    CBP: 'Controlling Blood Pressure',
    COL: 'Colorectal Cancer Screening',
    'COA-FS': 'Care for Older Adults: Functional Status',
    'COA-M': 'Care for Older Adults: Medication Review',
    BCS: 'Breast Cancer Screening',
    DM: 'Diabetes HbA1c Control',
    ABA: 'Adult BMI Assessment',
    FUH: 'Follow-Up After Hospitalization',
    AMR: 'Asthma Medication Ratio',
    KED: 'Kidney Health Evaluation',
  };

  gapCodes.forEach((code, i) => {
    const data = gapData?.[code] ?? {};
    ensureRoom(60);
    if (i > 0) {
      y += 8;
      divider();
    }
    heading(`${code} — ${MEASURE_NAMES[code] ?? code}`, 13);

    if (code === 'CBP') {
      kv('Location', data.location);
      kv('On BP medication', data.bpMedication);
      kv('Self-reported vitals', data.selfReported ? 'Yes' : 'No');
      kv('Digital BP baseline', data.digitalBaseline ? 'Yes' : 'No');
      if (data.bpManagement) body('• Blood Pressure Management: reinforced low NA diet; recorded BP daily; notify PCP if SBP>140 or DBP>90.', { indent: 8 });
      if (data.medEducation) body('• Medication management education: reinforced to take medications as prescribed.', { indent: 8 });
      if (data.referredPcp) body('• Referred to PCP for f/u within 14 days if needed.', { indent: 8 });
      if (data.noFurtherQuestions) body('• Patient confirmed no further questions; understands PCP follow-up plan.', { indent: 8 });
    } else if (code === 'COL') {
      kv('Screening method', data.screeningMethod);
      kv('Result date', data.colResultDate);
    } else if (code === 'KED') {
      kv('eGFR (mL/min/1.73 m²)', data.egfr);
      kv('eGFR result date', data.egfrResultDate);
      kv('uACR (mg/g)', data.uacr);
      kv('uACR result date', data.uacrResultDate);
    } else {
      body('Evidence template not yet configured for this measure.', { color: [120, 124, 132] });
    }
  });

  // ── Footer (page numbers) ─────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(140, 144, 152);
    doc.text(`${member.name}  ·  Consolidated Clinical Note`, margin, pageH - 24);
    doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 24, { align: 'right' });
  }

  // Return the jsPDF-native Blob — it's far more reliable to render in an
  // <object>/<iframe> via URL.createObjectURL(blob) than to round-trip through
  // a `data:application/pdf;filename=…;base64,…` URL (which some browsers
  // refuse to render inline because of the non-standard `filename=` segment).
  const blob = doc.output('blob');
  const safeName = member.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const datePart = new Date().toISOString().slice(0, 10);
  return {
    blob,
    filename: `consolidated-clinical-note__${safeName}__${datePart}.pdf`,
  };
}
