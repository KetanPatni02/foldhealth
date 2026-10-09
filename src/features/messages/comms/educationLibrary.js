// Patient education content for "Send Education" (the Send Content drawer).
// Each item is a public MedlinePlus (U.S. National Library of Medicine) page,
// so the link opens for any patient without sign-in. Seeded into Supabase
// (patient_education_content) by scripts/seed.js; used as the fallback list
// when that table isn't there yet.

const ml = (slug) => `https://medlineplus.gov/${slug}.html`;

export const EDUCATION_LIBRARY = [
  { id: 'edu-diabetes', title: 'Diabetes', category: 'Chronic Conditions', summary: 'What diabetes is, how it is managed, and how to prevent complications.', url: ml('diabetes') },
  { id: 'edu-blood-pressure', title: 'High Blood Pressure', category: 'Chronic Conditions', summary: 'Understanding blood pressure numbers and ways to bring them down.', url: ml('highbloodpressure') },
  { id: 'edu-heart-failure', title: 'Heart Failure', category: 'Chronic Conditions', summary: 'Symptoms to watch for and daily habits that help the heart.', url: ml('heartfailure') },
  { id: 'edu-copd', title: 'COPD', category: 'Chronic Conditions', summary: 'Living with chronic obstructive pulmonary disease and easier breathing.', url: ml('copd') },
  { id: 'edu-asthma', title: 'Asthma', category: 'Chronic Conditions', summary: 'Triggers, controller and rescue medicines, and an action plan.', url: ml('asthma') },
  { id: 'edu-kidney', title: 'Chronic Kidney Disease', category: 'Chronic Conditions', summary: 'How kidneys work and how to protect them.', url: ml('chronickidneydisease') },
  { id: 'edu-cholesterol', title: 'Cholesterol', category: 'Heart Health', summary: 'Good and bad cholesterol, and what changes your levels.', url: ml('cholesterol') },
  { id: 'edu-nutrition', title: 'Nutrition', category: 'Healthy Living', summary: 'Building a balanced plate and reading food labels.', url: ml('nutrition') },
  { id: 'edu-exercise', title: 'Exercise and Physical Fitness', category: 'Healthy Living', summary: 'How much activity you need and safe ways to start.', url: ml('exerciseandphysicalfitness') },
  { id: 'edu-weight', title: 'Weight Control', category: 'Healthy Living', summary: 'Practical steps to reach and keep a healthy weight.', url: ml('weightcontrol') },
  { id: 'edu-sleep', title: 'Healthy Sleep', category: 'Healthy Living', summary: 'Why sleep matters and habits for better rest.', url: ml('healthysleep') },
  { id: 'edu-quit-smoking', title: 'Quitting Smoking', category: 'Healthy Living', summary: 'Benefits of quitting and support that makes it easier.', url: ml('quittingsmoking') },
  { id: 'edu-medicines', title: 'Medicines', category: 'Medications', summary: 'Taking medicines safely and asking the right questions.', url: ml('medicines') },
  { id: 'edu-falls', title: 'Falls', category: 'Safety', summary: 'Preventing falls at home and staying steady.', url: ml('falls') },
  { id: 'edu-flu', title: 'Flu', category: 'Prevention', summary: 'Flu symptoms, the yearly vaccine, and when to get care.', url: ml('flu') },
  { id: 'edu-depression', title: 'Depression', category: 'Mental Health', summary: 'Signs of depression and where to find help.', url: ml('depression') },
  { id: 'edu-stress', title: 'Stress', category: 'Mental Health', summary: 'How stress affects health and ways to manage it.', url: ml('stress') },
];

export const educationToRow = (c) => ({
  id: c.id, title: c.title, category: c.category, summary: c.summary, url: c.url, source: 'MedlinePlus',
});
