import { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { getIcdsForMember } from '../data/icds';
import styles from './DocEvidenceViewer.module.css';

/**
 * DocEvidenceViewer — the source-document preview shown in the LeftWorkspace
 * Documents tab when an ICD is selected (Paper 1UD1 / 5IX).
 *
 * Renders a real PDF (built client-side with jsPDF) inside an <iframe> so the
 * BROWSER'S native PDF viewer provides the chrome — page nav, zoom, download,
 * print — rather than a hand-built toolbar. The selected ICD's
 * Past-Medical-History line is highlighted (yellow fill drawn behind the
 * text) as the coding evidence.
 *
 * Demo-stage: the note is synthesized from the member's diagnosis-gap data;
 * a real integration would stream the actual source document.
 */
export function DocEvidenceViewer({ member, icdScope }) {
  const [url, setUrl] = useState(null);

  // Build the blob URL in an effect (not useMemo) so each mount — including
  // React StrictMode's double-mount — gets a FRESH url and revokes its own
  // on cleanup. A memoised url would be revoked by the first cleanup and
  // then reused stale on remount, giving a blank viewer.
  useEffect(() => {
    const next = buildNotePdfUrl(member, icdScope);
    setUrl(next);
    return () => { if (next) URL.revokeObjectURL(next); };
  }, [member?.name, member?.dos, icdScope]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!url) return null;
  return (
    <iframe
      key={url}
      title="Source document"
      src={url}
      className={styles.frame}
    />
  );
}

// Build a one-page outpatient note as a PDF blob URL, highlighting the line
// for `icdScope`. Returns a `blob:` URL (revoke it when done).
function buildNotePdfUrl(member, icdScope) {
  if (!member?.name) return null;
  const icds = getIcdsForMember(member.name);
  const dos = member?.dos_list?.[0]?.date || member?.dos || '—';
  const provider = member?.rp || 'Dr. Aldo Richman';
  const first = member.name.split(' ')[0];

  const doc = new jsPDF({ unit: 'pt', format: 'letter' }); // 612 × 792 pt
  const L = 56;               // left margin
  const R = 612 - 56;         // right edge
  let y = 64;

  const heading = (text) => {
    y += 10;
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(30, 41, 59);
    doc.text(text, L, y);
    y += 14;
  };
  const para = (text) => {
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, R - L);
    doc.text(lines, L, y);
    y += lines.length * 14 + 4;
  };

  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(15, 23, 42);
  doc.text('OUTPATIENT CLINIC VISIT NOTE', L, y);
  y += 20;
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(51, 65, 85);
  doc.text(
    doc.splitTextToSize(
      `Patient: ${member.name}    Date of Service: ${dos}    Visit Type: Follow-up — Chronic Disease Management    Attending Physician: ${provider}`,
      R - L,
    ),
    L, y,
  );
  y += 34;

  heading('CHIEF COMPLAINT');
  para('Follow-up for chronic condition management and medication review.');

  heading('HISTORY OF PRESENT ILLNESS');
  para(`${first} is a patient with known chronic conditions presenting today for scheduled follow-up. Reports ongoing symptoms consistent with the documented problem list below. Adherent to medications; home readings have been variable. No acute distress at time of visit.`);

  heading('PAST MEDICAL HISTORY');
  doc.setFont('helvetica', 'normal').setFontSize(10);
  icds.forEach((icd) => {
    const line = `•  ${icd.desc} (${icd.code})`;
    const wrapped = doc.splitTextToSize(line, R - L - 12);
    const blockH = wrapped.length * 13;
    if (icd.code === icdScope) {
      // Evidence highlight — yellow fill behind the matched line.
      doc.setFillColor(255, 234, 138);
      doc.rect(L - 3, y - 9, R - L + 6, blockH + 2, 'F');
    }
    doc.setTextColor(icd.code === icdScope ? 30 : 51, icd.code === icdScope ? 27 : 65, icd.code === icdScope ? 12 : 85);
    doc.text(wrapped, L + 8, y);
    y += blockH + 3;
  });

  heading('MEDICATIONS');
  ['Metformin (dose per medication list)', 'ACE inhibitor / ARB for nephroprotection', 'Insulin regimen as prescribed', 'Nutritional supplementation per dietary plan']
    .forEach((m) => { doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(51, 65, 85); doc.text(`•  ${m}`, L + 8, y); y += 14; });

  heading('ALLERGIES');
  para('NKDA');
  heading('SOCIAL HISTORY');
  para('Lives at home. Support from family. Non-smoker. Denies alcohol use.');
  heading('REVIEW OF SYSTEMS');
  para('Constitutional: no fever or chills. Otherwise negative except as noted in HPI.');

  y += 12;
  doc.setDrawColor(203, 213, 225).line(L, y, R, y);
  y += 16;
  doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(100, 116, 139);
  doc.text(`Electronically signed · ${provider} · ${dos}`, L, y);

  return doc.output('bloburl').toString();
}
