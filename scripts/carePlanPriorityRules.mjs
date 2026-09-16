// Clinical priority heuristics for care-plan library goals, template
// interventions, and barriers. Used by genCarePlanTemplates.mjs and
// applyCarePlanLibraryPriorities.mjs.

const RANK = { low: 0, medium: 1, high: 2 };

function maxPriority(a, b) {
  return (RANK[a] ?? 1) >= (RANK[b] ?? 1) ? a : b;
}

/** Per-goal overrides where keyword rules would be wrong or too coarse. */
export const GOAL_PRIORITY_BY_TITLE = {
  'Maintain blood pressure within target': 'medium',
  'Improve blood pressure control': 'high',
  'Monitor blood pressure consistently': 'medium',
  'Improve medication adherence for hypertension': 'medium',
  'Reduce cardiovascular risk through activity': 'medium',
  'Maintain controlled heart rate': 'high',
  'Improve heart failure symptom control': 'high',
  'Monitor daily weight for heart failure': 'high',
  'Reduce tobacco exposure': 'medium',
  'Improve lipid management': 'medium',
  'Maintain glucose within target range': 'medium',
  'Improve A1C control': 'medium',
  'Monitor blood glucose consistently': 'medium',
  'Improve diabetes medication adherence': 'medium',
  'Reduce episodes of hypoglycemia': 'high',
  'Improve nutrition consistency for diabetes': 'medium',
  'Increase physical activity for metabolic health': 'low',
  'Improve weight management': 'medium',
  'Complete routine diabetes monitoring': 'medium',
  'Improve renal risk monitoring': 'high',
  'Improve COPD symptom control': 'high',
  'Improve asthma control': 'high',
  'Improve inhaler adherence': 'medium',
  'Improve inhaler technique': 'medium',
  'Reduce respiratory exacerbations': 'high',
  'Maintain oxygen therapy adherence': 'high',
  'Improve overall medication adherence': 'medium',
  'Complete medication reconciliation': 'high',
  'Resolve medication discrepancies': 'high',
  'Reduce medication-related adverse effects': 'high',
  'Improve refill continuity': 'medium',
  'Simplify medication routine': 'medium',
  'Complete post-discharge follow-up': 'high',
  'Prevent avoidable readmission': 'high',
  'Understand discharge instructions': 'high',
  'Follow post-discharge medication plan': 'high',
  'Complete recommended post-discharge services': 'high',
  'Establish post-discharge care coordination': 'high',
  'Complete annual wellness visit': 'low',
  'Complete preventive screening plan': 'low',
  'Complete immunization review': 'low',
  'Complete fall-risk assessment': 'medium',
  'Improve fall-prevention behaviors': 'high',
  'Complete advance care planning review': 'low',
  'Establish emergency care plan': 'high',
  'Maintain ability to perform ADLs': 'medium',
  'Improve mobility': 'medium',
  'Improve balance': 'high',
  'Maintain appropriate assistive-device use': 'medium',
  'Increase independence with self-care': 'medium',
  'Maintain adequate hydration': 'medium',
  'Improve nutritional intake': 'medium',
  'Prevent unintended weight loss': 'high',
  'Improve nutrition plan adherence': 'medium',
  'Improve mood stability': 'medium',
  'Improve adherence to behavioral-health treatment': 'medium',
  'Maintain cognitive safety plan': 'high',
  'Improve appointment and medication organization': 'medium',
  'Increase social engagement': 'low',
  'Improve chronic pain control': 'medium',
  'Improve pain-related function': 'medium',
  'Reduce reliance on rescue interventions': 'high',
  'Maintain kidney function monitoring': 'high',
  'Maintain individualized renal-protection plan': 'high',
  'Monitor for worsening chronic disease symptoms': 'high',
  'Support wound healing': 'high',
  'Complete wound-care regimen': 'high',
  'Reduce risk of skin breakdown': 'high',
  'Complete specialty follow-up': 'medium',
  'Close referral loop': 'medium',
  'Maintain updated care plan': 'medium',
  'Improve access to primary care': 'medium',
  'Improve access to transportation': 'medium',
  'Improve access to community resources': 'medium',
  'Improve understanding of condition': 'medium',
  'Improve recognition of warning signs': 'high',
  'Increase patient participation in care decisions': 'low',
  'Improve self-monitoring skills': 'medium',
  'Improve sleep consistency': 'low',
  'Improve daytime energy': 'low',
  'Address food insecurity': 'high',
  'Address housing instability': 'high',
  'Improve caregiver support': 'medium',
  'Reduce social isolation': 'low',
  'Maintain home safety': 'high',
  'Maintain timely care-plan outreach': 'high',
  'Improve response to care-team outreach': 'medium',
  'Maintain updated emergency contacts': 'medium',
  'Improve engagement with care program': 'medium',
  'Complete individualized care-plan actions': 'medium',
  'Reduce avoidable urgent-care utilization': 'high',
  'Improve care-plan goal attainment': 'medium',
  'Maintain stable chronic-condition status': 'medium',
  'Improve timely reporting of symptoms': 'high',
  'Reduce missed appointments': 'medium',
  'Improve continuity after provider transition': 'high',
  'Maintain accurate patient health information': 'medium',
  'Improve completion of recommended labs': 'medium',
  'Improve completion of recommended preventive services': 'low',
  'Maintain overall care-plan stability': 'medium',
  'Maintain healthy body height record': 'low',
  'Maintain resting oxygen saturation': 'high',
  'Monitor oxygen saturation for COPD': 'high',
  'Maintain resting respiratory rate': 'high',
  'Maintain body temperature within normal range': 'high',
  'Reduce waist circumference': 'low',
  'Build muscular strength': 'low',
  'Adopt low-impact aerobic routine': 'low',
  'Follow DASH eating pattern': 'low',
  'Follow Mediterranean eating pattern': 'low',
  'Maintain sodium consumption': 'medium',
  'Increase daily fiber intake': 'low',
  'Meet daily water intake target': 'medium',
  'Meet daily fruit and vegetable target': 'low',
  'Reduce added sugar intake': 'medium',
  'Manage carbohydrate intake for diabetes': 'medium',
  'Maintain adequate protein intake': 'medium',
  'Reduce saturated fat intake': 'low',
  'Consume calories': 'medium',
  'Target to maintain normal BMI': 'low',
  'Target to achieve a healthy weight': 'medium',
  'Eat a healthier diet for hypertensive patients': 'low',
};

const GOAL_HIGH_RE = /\b(hypoglycemia|readmission|post-discharge|reconcil|discrepanc|adverse effect|heart failure|wound|skin breakdown|fall-prevention|home safety|warning sign|exacerbation|oxygen therapy|emergency care|renal-protection|worsening|urgent-care|oxygen saturation|body temperature|housing instability|food insecurity)\b/i;

export function goalPriority(goal) {
  const title = goal?.title || '';
  if (GOAL_PRIORITY_BY_TITLE[title]) return GOAL_PRIORITY_BY_TITLE[title];
  const blob = [title, goal?.description, ...(goal?.conditions || [])].join(' ');
  if (GOAL_HIGH_RE.test(blob)) return 'high';
  if (/\b(preventive|wellness|immunization|screening plan|social engagement|social isolation|advance care|height record|fiber intake|fruit and vegetable|dash eating|mediterranean|muscular strength|low-impact aerobic|healthy body height)\b/i.test(blob)) {
    return 'low';
  }
  return 'medium';
}

const INTERVENTION_HIGH_TITLES = new Set([
  'Escalation coordination',
  'Medication reconciliation',
  'Medication issue escalation',
  'Post-discharge outreach',
  'Readmission-risk review',
  'Transition escalation',
  'Hypoglycemia review',
  'Heart-failure symptom review',
  'Daily weight monitoring',
  'Warning-sign education',
  'Symptom escalation education',
  'Wound-care coordination',
  'Wound measurement tracking',
  'Oxygen-use support',
  'Exacerbation prevention',
  'Renal monitoring',
  'Respiratory symptom monitoring',
  'Fall-risk assessment',
  'Home-safety follow-up',
  'Emergency-contact review',
  'Care-management outreach',
  'Housing-resource coordination',
  'Food-resource coordination',
  'Pain-care coordination',
  'Glucose pattern review',
  'BP trend follow-up',
]);

const INTERVENTION_LOW_TITLES = new Set([
  'AWV coordination',
  'AWV care-plan update',
  'Immunization review',
  'Immunization coordination',
  'Advance-care-planning review',
  'Advance-care-plan documentation',
  'Preventive screening tracking',
  'Social-connection planning',
  'Community-engagement referral',
  'Goal-progress review',
  'Activity coaching',
  'Sleep-hygiene education',
  'Energy/activity pacing',
  'Patient-information review',
  'Organization tools',
  'Shared goal setting',
  'Care-plan review',
  'BP care-plan review',
  'Proactive care-management review',
]);

export function interventionPriority({ kind, title } = {}, parentGoalPriority = 'medium') {
  const t = title || '';
  if (INTERVENTION_HIGH_TITLES.has(t)) return 'high';
  if (INTERVENTION_LOW_TITLES.has(t)) return 'low';
  if (kind === 'measure-vital' && /monitoring|assessment|tracking|weight|glucose|blood pressure|oxygen|respiratory|renal|wound|pain/i.test(t)) {
    return maxPriority('medium', parentGoalPriority === 'high' ? 'high' : 'medium');
  }
  if (kind === 'patient-education' && /hypoglycemia|warning|emergency|wound|respiratory action|asthma action/i.test(t)) {
    return 'high';
  }
  if (kind === 'internal-task' && /post-discharge|readmission|reconcil|escalation|outreach/i.test(t)) {
    return 'high';
  }
  if (parentGoalPriority === 'high') return 'medium';
  if (parentGoalPriority === 'low') return 'low';
  return 'medium';
}

export function barrierPriority(title = '') {
  const t = title.toLowerCase();
  if (/hypoglycemia|persistent abnormal|equipment access|housing|food access|caregiver (burden|capacity)|difficulty controlling|home safety|oxygen|wound|fall/.test(t)) {
    return 'high';
  }
  if (/forgetfulness|limited understanding|social isolation|transportation/.test(t)) {
    return 'medium';
  }
  return 'medium';
}
