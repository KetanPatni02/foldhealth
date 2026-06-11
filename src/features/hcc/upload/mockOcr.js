import { isValidV28Code } from './v28Whitelist';

/**
 * Scripted demo OCR.
 *
 * Real OCR would call a Vision / Textract endpoint to extract encounter
 * sections from the PDF. For the prototype we map a small set of demo
 * filenames to deterministic encounter payloads covering each test case
 * the Jira ticket calls out:
 *
 *   demo-single.pdf         — 1 patient, 1 DOS, clean (happy path)
 *   demo-multi-patient.pdf  — 2 patients, 1 DOS each (multi-group review)
 *   demo-missing-dos.pdf    — 1 patient, DOS field blank (AC-8 mandatory error)
 *   demo-dob-mismatch.pdf   — Patient name doesn't 100%-match any Fold record
 *                              (AC-9 HIPAA gate — manual link required)
 *
 * Any other filename falls back to single-patient/single-DOS with the
 * first available HCC member as the matched patient. Includes a 2.5s
 * delay to simulate processing.
 *
 * Each encounter returned has the shape:
 *   {
 *     tempId,
 *     patient: { name, dob, matchedMemberId|null, matchConfidence },
 *     dos, provider, pos, posDesc,
 *     icds: [{ code, valid }],     // invalid codes per V28 marked valid:false
 *     errors: ['dos', ...],         // mandatory fields missing (AC-8)
 *     docType,                      // OCR-derived document category (impl note)
 *   }
 */

const PROCESSING_DELAY_MS = 2500;

const POS_LABEL = {
  '11': 'Office',
  '12': 'Home',
  '22': 'On Campus-Outpatient Hospital',
  '02': 'Telehealth',
};

const mandatoryFields = ['patientName', 'dob', 'dos', 'provider', 'pos'];

function newTempId() {
  return `enc-${Math.random().toString(36).slice(2, 9)}`;
}

function annotateIcds(codes) {
  return (codes || []).map(c => ({ code: c.trim().toUpperCase(), valid: isValidV28Code(c) }));
}

function annotateErrors(enc) {
  const errors = [];
  if (!enc.patient?.name) errors.push('patientName');
  if (!enc.patient?.dob) errors.push('dob');
  if (!enc.dos) errors.push('dos');
  if (!enc.provider) errors.push('provider');
  if (!enc.pos) errors.push('pos');
  return errors;
}

/**
 * Resolve a patient by exact name match against the supplied hccMembers
 * list. Used by the mock to set matchedMemberId on each encounter.
 * Real backend uses normalized name + DOB at 100% confidence.
 */
function resolveByName(hccMembers, name) {
  const target = (name || '').trim().toLowerCase();
  return hccMembers.find(m => (m.name || '').trim().toLowerCase() === target) || null;
}

export async function runMockOcr(file, hccMembers) {
  await new Promise(r => setTimeout(r, PROCESSING_DELAY_MS));
  const name = (file?.name || '').toLowerCase();

  const buildEnc = ({ patientName, dob, dos, provider, pos, icds, docType, matchOverride }) => {
    const match = matchOverride === null ? null : (matchOverride || resolveByName(hccMembers, patientName));
    const enc = {
      tempId: newTempId(),
      patient: {
        name: patientName,
        dob,
        matchedMemberId: match?.id || null,
        matchConfidence: match ? 100 : 0,
      },
      dos: dos || '',
      provider: provider || '',
      pos: pos || '',
      posDesc: POS_LABEL[pos] || '',
      icds: annotateIcds(icds || []),
      docType: docType || 'Progress Note',
      errors: [],
    };
    enc.errors = annotateErrors(enc);
    return enc;
  };

  // ── Demo: single patient · single DOS · clean ─────────────────────
  if (name.includes('demo-single')) {
    const target = hccMembers.find(m => m.name === 'William Jammy') || hccMembers[0];
    return [
      buildEnc({
        patientName: target?.name || 'William Jammy',
        dob: '01/15/1965',
        dos: '02/14/2026',
        provider: 'Dr. Sarah Connor',
        pos: '11',
        icds: ['E11.22', 'I50.32', 'J44.9'],
        docType: 'Progress Note',
        matchOverride: target,
      }),
    ];
  }

  // ── Demo: large multi-patient (20+ patients, several with multi-DOS,
  //   plus 2 missing-field encounters and 1 unmatched patient) ───────
  // Mirrors a realistic batch upload: a clinic sends one PDF covering a
  // day's worth of progress notes across the panel. Demonstrates that
  // the master-detail list scales (filter chips, sticky banners, per-row
  // status chips) and that mixed-quality OCR output (errors + mismatch)
  // is gated correctly by the Confirm button.
  if (name.includes('demo-bulk') || name.includes('demo-bulk-multi-patient')) {
    // Patients in the seed (name → DOB used by mock OCR). Drawn from
    // src/features/hcc/data/mock.js MEMBERS_RAW so resolveByName lands
    // on real members.
    const COHORT = [
      // [name, dob, encounters[]: { dos, provider, pos, icds, docType, errors? }]
      ['William Jammy',       '01/15/1965', [
        { dos: '02/14/2026', provider: 'Dr. Sarah Connor', pos: '11', icds: ['E11.22', 'I48.91'], docType: 'Progress Note' },
        { dos: '03/15/2026', provider: 'Dr. Sarah Connor', pos: '11', icds: ['I50.32'], docType: 'SOAP Note' },
        { dos: '04/22/2026', provider: 'Dr. Helen Yu',     pos: '02', icds: ['N18.4', 'J44.9'], docType: 'Progress Note' },
      ]],
      ['Grace Hill',          '04/22/1954', [
        { dos: '02/18/2026', provider: 'Dr. Eamon',        pos: '11', icds: ['F33.1', 'N18.4'], docType: 'Progress Note' },
        { dos: '04/03/2026', provider: 'Dr. Eamon',        pos: '11', icds: ['I50.22'], docType: 'SOAP Note' },
      ]],
      ['Annette Brave',       '08/12/1958', [
        { dos: '02/20/2026', provider: 'Dr. Mallory Hayes', pos: '11', icds: ['E11.42'], docType: 'Progress Note' },
      ]],
      ['Frank Green',         '06/30/1956', [
        { dos: '02/22/2026', provider: 'Dr. Indigo I',     pos: '02', icds: ['I50.21', 'E11.9'], docType: 'Progress Note' },
        { dos: '03/30/2026', provider: 'Dr. Indigo I',     pos: '02', icds: ['I50.21'], docType: 'Progress Note' },
      ]],
      ['Brian Carter',        '11/04/1952', [
        { dos: '02/25/2026', provider: 'Dr. Ulysses Horne', pos: '11', icds: ['J44.0', 'C18.9'], docType: 'SOAP Note' },
      ]],
      ['David Evans',         '03/18/1949', [
        { dos: '02/27/2026', provider: 'Dr. Tatum',        pos: '11', icds: ['I50.33', 'N18.5'], docType: 'Progress Note' },
        { dos: '03/24/2026', provider: 'Dr. Tatum',        pos: '11', icds: ['F32.2'], docType: 'Progress Note' },
      ]],
      ['Cynthia Davis',       '09/08/1959', [
        { dos: '03/02/2026', provider: 'Dr. Reed MacLeod', pos: '02', icds: ['I48.0'], docType: 'Telehealth Note' },
      ]],
      ['Emily Foster',        '12/12/1965', [
        { dos: '03/04/2026', provider: 'Dr. Tatum',        pos: '11', icds: ['C50.911'], docType: 'Progress Note' },
      ]],
      ['Robert Kim',          '07/19/1953', [
        { dos: '03/05/2026', provider: 'Dr. Susan Park',   pos: '11', icds: ['I70.221', 'E11.40'], docType: 'Progress Note' },
      ]],
      ['Maria Santos',        '02/01/1961', [
        { dos: '03/07/2026', provider: 'Dr. Alan Morse',   pos: '02', icds: ['F33.2'], docType: 'Telehealth Note' },
        { dos: '04/10/2026', provider: 'Dr. Alan Morse',   pos: '02', icds: ['F33.1'], docType: 'Progress Note' },
      ]],
      ['James Walker',        '05/03/1947', [
        { dos: '03/08/2026', provider: 'Dr. Calvin Reed',  pos: '11', icds: ['I50.9', 'J44.1', 'I70.231'], docType: 'Progress Note' },
      ]],
      ['Jessica Clark',       '10/15/1965', [
        { dos: '03/10/2026', provider: 'Dr. Karen Mills',  pos: '11', icds: ['E10.9'], docType: 'Progress Note' },
      ]],
      ['Richard Scott',       '07/03/1960', [
        { dos: '03/11/2026', provider: 'Dr. Karen Mills',  pos: '11', icds: ['E11.42', 'I50.22'], docType: 'Progress Note' },
      ]],
      ['Dorothy Nguyen',      '01/22/1948', [
        { dos: '03/12/2026', provider: 'Dr. Eamon',        pos: '11', icds: ['I48.21', 'N18.6'], docType: 'SOAP Note' },
      ]],
      ['Patricia Moore',      '11/30/1962', [
        { dos: '03/13/2026', provider: 'Dr. Karen Mills',  pos: '11', icds: ['F32.1'], docType: 'Progress Note' },
      ]],
      ['Charles Rivera',      '08/25/1951', [
        { dos: '03/14/2026', provider: 'Dr. Helen Yu',     pos: '02', icds: ['I50.32', 'I70.211'], docType: 'Telehealth Note' },
      ]],
      ['Michelle Jackson',    '04/14/1964', [
        { dos: '03/16/2026', provider: 'Dr. Alan Morse',   pos: '11', icds: ['F33.1'], docType: 'Progress Note' },
      ]],
      ['Linda Chen',          '06/06/1959', [
        { dos: '03/17/2026', provider: 'Dr. Calvin Reed',  pos: '11', icds: ['I48.91'], docType: 'Progress Note' },
      ]],
      ['Kevin Brown',         '02/28/1967', [
        { dos: '03/18/2026', provider: 'Dr. Indigo I',     pos: '11', icds: ['C61'], docType: 'Progress Note' },
      ]],
      ['Helen Park',          '09/02/1956', [
        { dos: '03/19/2026', provider: 'Dr. Susan Park',   pos: '11', icds: ['E11.21'], docType: 'Progress Note' },
      ]],
    ];

    const out = [];
    COHORT.forEach(([patientName, dob, encs]) => {
      const member = hccMembers.find(m => (m.name || '').trim().toLowerCase() === patientName.toLowerCase());
      encs.forEach((e) => out.push(buildEnc({
        patientName,
        dob,
        dos: e.dos,
        provider: e.provider,
        pos: e.pos,
        icds: e.icds,
        docType: e.docType,
        matchOverride: member || null,
      })));
    });

    // Sprinkle in 2 missing-field encounters (different patients) and
    // 1 unmatched patient so the filter chips show real numbers.
    out.push(buildEnc({
      patientName: 'Dorothy Nguyen',
      dob: '01/22/1948',
      dos: '',                            // ← missing
      provider: 'Dr. Eamon',
      pos: '11',
      icds: ['I48.21'],
      docType: 'Progress Note',
      matchOverride: hccMembers.find(m => (m.name || '').toLowerCase() === 'dorothy nguyen'),
    }));
    out.push(buildEnc({
      patientName: 'James Walker',
      dob: '05/03/1947',
      dos: '03/22/2026',
      provider: '',                       // ← missing
      pos: '11',
      icds: ['I50.9'],
      docType: 'Progress Note',
      matchOverride: hccMembers.find(m => (m.name || '').toLowerCase() === 'james walker'),
    }));
    out.push(buildEnc({
      patientName: 'Jane Doe',            // ← won't match any seed
      dob: '01/01/1970',
      dos: '03/25/2026',
      provider: 'Dr. Lin',
      pos: '02',
      icds: ['E11.22'],
      docType: 'Progress Note',
      matchOverride: null,
    }));

    return out;
  }

  // ── Demo: same patient with multiple DOS sections ─────────────────
  // Common real-world case: a single PDF with 3 progress notes for the
  // same patient across different dates. Each encounter becomes a
  // separate worklist row under the same member.
  if (name.includes('demo-same-patient-multi-dos')) {
    const target = hccMembers.find(m => m.name === 'William Jammy') || hccMembers[0];
    return [
      buildEnc({
        patientName: target?.name || 'William Jammy',
        dob: '01/15/1965',
        dos: '02/14/2026',
        provider: 'Dr. Sarah Connor',
        pos: '11',
        icds: ['E11.22', 'I48.91'],
        docType: 'Progress Note',
        matchOverride: target,
      }),
      buildEnc({
        patientName: target?.name || 'William Jammy',
        dob: '01/15/1965',
        dos: '03/15/2026',
        provider: 'Dr. Sarah Connor',
        pos: '11',
        icds: ['I50.32'],
        docType: 'SOAP Note',
        matchOverride: target,
      }),
      buildEnc({
        patientName: target?.name || 'William Jammy',
        dob: '01/15/1965',
        dos: '04/22/2026',
        provider: 'Dr. Helen Yu',
        pos: '02',
        icds: ['N18.4', 'J44.9'],
        docType: 'Progress Note',
        matchOverride: target,
      }),
    ];
  }

  // ── Demo: multi-patient (2 patients, 1 encounter each) ────────────
  if (name.includes('demo-multi-patient')) {
    const p1 = hccMembers.find(m => m.name === 'William Jammy') || hccMembers[0];
    const p2 = hccMembers.find(m => m.name === 'Grace Hill') || hccMembers[1];
    return [
      buildEnc({
        patientName: p1?.name || 'William Jammy',
        dob: '01/15/1965',
        dos: '03/01/2026',
        provider: 'Dr. Sarah Connor',
        pos: '11',
        icds: ['E11.22', 'I48.91'],
        docType: 'SOAP Note',
        matchOverride: p1,
      }),
      buildEnc({
        patientName: p2?.name || 'Grace Hill',
        dob: '04/22/1954',
        dos: '03/01/2026',
        provider: 'Dr. Eamon',
        pos: '11',
        icds: ['F33.1', 'N18.4'],
        docType: 'Progress Note',
        matchOverride: p2,
      }),
    ];
  }

  // ── Demo: missing DOS field (AC-8 mandatory error) ────────────────
  if (name.includes('demo-missing-dos')) {
    const target = hccMembers.find(m => m.name === 'Richard Scott') || hccMembers[0];
    return [
      buildEnc({
        patientName: target?.name || 'Richard Scott',
        dob: '07/03/1960',
        dos: '',           // ← missing
        provider: 'Dr. Karen Mills',
        pos: '11',
        icds: ['E11.42', 'I50.22'],
        docType: 'Progress Note',
        matchOverride: target,
      }),
    ];
  }

  // ── Demo: DOB mismatch (AC-9 HIPAA gate — manual link required) ───
  if (name.includes('demo-dob-mismatch')) {
    return [
      buildEnc({
        patientName: 'Unknown Patient',     // doesn't match any Fold record
        dob: '12/25/1980',
        dos: '03/05/2026',
        provider: 'Dr. Helen Yu',
        pos: '02',
        icds: ['E11.9', 'J44.1'],
        docType: 'Progress Note',
        matchOverride: null,                // explicit null — no auto-match
      }),
    ];
  }

  // ── Fallback: pick the first member, 1 encounter ──────────────────
  const fallback = hccMembers[0];
  return [
    buildEnc({
      patientName: fallback?.name || 'Demo Patient',
      dob: '01/01/1960',
      dos: '03/15/2026',
      provider: 'Dr. Demo',
      pos: '11',
      icds: ['E11.22'],
      docType: 'Progress Note',
      matchOverride: fallback,
    }),
  ];
}

export { mandatoryFields, POS_LABEL };
