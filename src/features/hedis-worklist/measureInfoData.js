// Per-gap Measure Requirements + Measure Instructions rendered in the
// Care Gap drawer's left "Measure Tutorial" workspace.
//
// Each entry is:
//   requirements: [{ text, children?: [{ text, children? }] }]
//   instructions: [{ heading?, intro?, items?: [{ text, children? }] }]
//
// Instruction items are written as normal sentence copy (e.g. "Add
// clinical note documenting the reading") rather than the legacy
// "+CLINICAL NOTE: …" prefix notation, which read as jargon.
//
// A gap without a specific entry falls back to a generic scaffold so the
// workspace never renders empty.

export const MEASURE_INFO = {
  CBP: {
    requirements: [
      {
        text: 'Document Systolic BP < 140 mmHg -AND- Diastolic BP < 90 mmHg',
        children: [
          { text: 'Date of result' },
          {
            text: 'Location (choose one)',
            children: [
              { text: 'Outpatient Visit' },
              { text: 'Telehealth Visit (Digital BP Device)' },
            ],
          },
        ],
      },
    ],
    instructions: [
      { intro: 'Choose the action that matches the reading.' },
      {
        heading: "Patient's BP between 100/60 and 140/90",
        items: [
          { text: 'Add a clinical note documenting the reading as care gap evidence.' },
        ],
      },
      {
        heading: "Patient's BP <100/60 or >140/90 (do both)",
        items: [
          { text: 'Add a BP-check clinical note.' },
          { text: 'Refer the patient to a provider to address the care gap.' },
        ],
      },
      {
        heading: 'Patient does not have a BP device (choose one)',
        items: [
          { text: 'Refer the patient to a provider to address the care gap.' },
          { text: 'Create a task to obtain a BP device if the plan includes OTC benefits.' },
        ],
      },
    ],
  },
  BCS: {
    requirements: [
      {
        text: 'Document a completed breast cancer screening',
        children: [
          { text: 'Screening type (mammogram, MRI, or biopsy with malignant finding)' },
          { text: 'Date of screening' },
          { text: 'Facility / imaging center' },
        ],
      },
    ],
    instructions: [
      { intro: 'Match the action to the screening history.' },
      {
        heading: 'Screening completed in the last 27 months',
        items: [{ text: 'Add a clinical note with the date, facility, and result.' }],
      },
      {
        heading: 'No screening on file',
        items: [
          { text: 'Refer the patient for a screening mammogram at an imaging center.' },
          { text: 'Follow up with the member to confirm the appointment.' },
        ],
      },
    ],
  },
  COL: {
    requirements: [
      {
        text: 'Document a completed colorectal cancer screening',
        children: [
          { text: 'Screening type (colonoscopy, FIT/FOBT, Cologuard, CT colonography)' },
          { text: 'Date of screening' },
          { text: 'Result' },
        ],
      },
    ],
    instructions: [
      { intro: 'Match the action to the screening history.' },
      {
        heading: 'Screening completed within the required lookback',
        items: [{ text: 'Add a clinical note capturing the screening type, date, and result.' }],
      },
      {
        heading: 'No screening on file',
        items: [
          { text: 'Order Cologuard, or refer the patient to GI for a colonoscopy.' },
          { text: 'Create a follow-up task for kit return or procedure scheduling.' },
        ],
      },
    ],
  },
};

// Generic scaffold shown for any gap without a hand-authored entry, so
// the workspace still renders a useful shell instead of "coming soon".
export const DEFAULT_MEASURE_INFO = {
  requirements: [
    { text: 'Requirements are being finalized for this measure.' },
  ],
  instructions: [
    { intro: 'Measure-specific guidance will appear here once it is authored.' },
  ],
};
