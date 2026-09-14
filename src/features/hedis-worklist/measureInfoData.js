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
  'DSF-A': {
    requirements: [
      {
        text: 'Administer PHQ-2 (2-item depression screener) inside Fold',
        children: [
          { text: 'Date of Service, Location (Telehealth or Home), and Performed by' },
          { text: 'Verbal telehealth consent (audio-only or audio-video) when Location is Telehealth' },
          { text: 'Item scores for both PHQ-2 questions (0 to 3)' },
        ],
      },
      {
        text: 'Save the PHQ-2 score to lock DSF-A',
        children: [
          { text: 'Negative (total under 3): the wellness care plan renders, ready to submit' },
          { text: 'Positive (total 3 or more): DSF-B opens automatically for the same patient' },
        ],
      },
    ],
    instructions: [
      { intro: 'Score PHQ-2 in the same consolidated Clinical Note used for other measures.' },
      {
        heading: 'PHQ-2 Negative',
        items: [
          { text: 'Review the wellness care plan with the patient and mark "All components of care plan completed".' },
          { text: 'Submit for Review; the note routes to the provider queue under LOINC 55758-7.' },
        ],
      },
      {
        heading: 'PHQ-2 Positive',
        items: [
          { text: 'Saving the score locks DSF-A and opens the DSF-B gap automatically.' },
          { text: 'Continue in the same note into PHQ-9, or save as draft and finish within 30 days.' },
        ],
      },
      {
        heading: 'Patient declines further evaluation',
        items: [
          { text: 'Tick Decline Follow-Up. The Decline care plan renders and no sign-off task is created.' },
        ],
      },
    ],
  },
  'DSF-B': {
    requirements: [
      {
        text: 'Administer PHQ-9 (9-item depression severity) inside Fold',
        children: [
          { text: 'Item scores for all nine PHQ-9 questions (0 to 3)' },
          { text: 'If total falls in the Mild band (5 to 9), answer the follow-up sub-question' },
        ],
      },
      {
        text: 'Complete within 30 days of the positive PHQ-2 result',
        children: [
          { text: 'Save as Draft is allowed with partial responses until the window closes.' },
        ],
      },
    ],
    instructions: [
      { intro: 'DSF-B opens automatically when PHQ-2 is Positive. Complete PHQ-9 in the same note.' },
      {
        heading: 'Minimal (0 to 4)',
        items: [
          { text: 'Wellness care plan renders. Submit for Review routes to the provider queue.' },
        ],
      },
      {
        heading: 'Mild (5 to 9)',
        items: [
          { text: 'Answer the sub-question. Mild/No shows active-surveillance care; Mild/Yes escalates to a PCP follow-up in 2 to 4 weeks.' },
        ],
      },
      {
        heading: 'Moderate (10 to 19) or Severe (20 or more)',
        items: [
          { text: 'The corresponding care plan renders immediately with escalation guidance and mental-health resources.' },
        ],
      },
      {
        heading: 'Sign-off',
        items: [
          { text: 'DSF-A is the billing carrier for both PHQ-2 and PHQ-9; on Save & Sign both DSF-A and DSF-B close together.' },
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
