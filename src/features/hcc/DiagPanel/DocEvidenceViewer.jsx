import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { getIcdsForMember } from '../data/icds';
import styles from './DocEvidenceViewer.module.css';

/**
 * DocEvidenceViewer — the source-document preview shown in the LeftWorkspace
 * Documents tab when an ICD is selected (Paper 1UD1). Dark PDF-style chrome
 * over a rendered clinical note; the selected ICD's Past-Medical-History
 * line is highlighted as the coding evidence.
 *
 * Demo-stage: the note is synthesized from the member's diagnosis-gap data
 * (a real integration would render the actual source document with OCR
 * bounding-box highlights).
 */
export function DocEvidenceViewer({ member, icdScope }) {
  const [zoom, setZoom] = useState(100);
  const icds = getIcdsForMember(member?.name);
  const dos = member?.dos_list?.[0]?.date || member?.dos || '—';
  const provider = member?.rp || 'Dr. Aldo Richman';
  const fileName = `${(member?.name || 'Patient').replace(/\s+/g, '')}_ClinicalNote.pdf`;

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <Icon name="solar:hamburger-menu-linear" size={15} className={styles.toolbarMuted} />
        <span className={styles.toolbarTitle}>{fileName}</span>
        <span className={styles.toolbarPage}>
          <span className={styles.toolbarPageNum}>1</span> / 2
        </span>
        <span className={styles.toolbarDivider} />
        <button type="button" className={styles.toolbarBtn} aria-label="Zoom out" onClick={() => setZoom(z => Math.max(50, z - 10))}>
          <Icon name="solar:minus-circle-linear" size={14} />
        </button>
        <span className={styles.toolbarZoom}>{zoom}%</span>
        <button type="button" className={styles.toolbarBtn} aria-label="Zoom in" onClick={() => setZoom(z => Math.min(200, z + 10))}>
          <Icon name="solar:add-circle-linear" size={14} />
        </button>
        <span className={styles.toolbarDivider} />
        <button type="button" className={styles.toolbarBtn} aria-label="Download">
          <Icon name="solar:download-minimalistic-linear" size={14} />
        </button>
        <button type="button" className={styles.toolbarBtn} aria-label="Print" onClick={() => window.print()}>
          <Icon name="solar:printer-linear" size={14} />
        </button>
      </div>

      <div className={styles.scroll}>
        <div className={styles.page} style={{ zoom: zoom / 100 }}>
          <h1 className={styles.h1}>OUTPATIENT CLINIC VISIT NOTE</h1>
          <p className={styles.meta}>
            <strong>Patient:</strong> {member?.name} <strong>Date of Service:</strong> {dos}{' '}
            <strong>Visit Type:</strong> Follow-up — Chronic Disease Management{' '}
            <strong>Attending Physician:</strong> {provider}
          </p>

          <h2 className={styles.h2}>CHIEF COMPLAINT</h2>
          <p className={styles.body}>
            Follow-up for chronic condition management and medication review.
          </p>

          <h2 className={styles.h2}>HISTORY OF PRESENT ILLNESS</h2>
          <p className={styles.body}>
            {member?.name?.split(' ')[0]} is a patient with known chronic conditions presenting
            today for scheduled follow-up. Reports ongoing symptoms consistent with the
            documented problem list below. Adherent to medications; home readings have been
            variable. No acute distress at time of visit.
          </p>

          <h2 className={styles.h2}>PAST MEDICAL HISTORY</h2>
          <ul className={styles.pmh}>
            {icds.map(icd => (
              <li
                key={icd.code}
                className={icd.code === icdScope ? styles.hl : undefined}
              >
                {icd.desc} ({icd.code})
              </li>
            ))}
          </ul>

          <h2 className={styles.h2}>MEDICATIONS</h2>
          <ul className={styles.list}>
            <li>Metformin (dose per medication list)</li>
            <li>ACE inhibitor / ARB for nephroprotection</li>
            <li>Insulin regimen as prescribed</li>
            <li>Nutritional supplementation per dietary plan</li>
          </ul>

          <h2 className={styles.h2}>ALLERGIES</h2>
          <p className={styles.body}>NKDA</p>

          <h2 className={styles.h2}>SOCIAL HISTORY</h2>
          <p className={styles.body}>Lives at home. Support from family. Non-smoker. Denies alcohol use.</p>

          <h2 className={styles.h2}>REVIEW OF SYSTEMS</h2>
          <p className={styles.body}>
            Constitutional: no fever or chills. Otherwise negative except as noted in HPI.
          </p>

          <p className={styles.signoff}>
            Electronically signed · {provider} · {dos}
          </p>
        </div>
      </div>
    </div>
  );
}
