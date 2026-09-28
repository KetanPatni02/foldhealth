// Care Gap lab workflow: measure rules, lab-order statuses and the evidence
// evaluation. Pure functions, no UI, so a real results feed can replace the
// simulation later without touching the screens.
//
// Two separate ideas (never merge them):
//   • Lab Order status: where the order is in the lab's process.
//   • Care Gap evaluation: whether the evidence satisfies the measure.
// A Completed order can leave the gap Open; an external result can satisfy
// the gap with no order at all.

export const LAB_ORDER_STATUS = {
  draft: 'Draft',
  ordered: 'Ordered',
  awaiting: 'Awaiting Collection',
  collected: 'Collected',
  inProcess: 'In Process',
  resultAvailable: 'Result Available',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
// Orders still out with the lab (the gap is "In Progress" while one exists).
export const ACTIVE_ORDER_STATUSES = [
  LAB_ORDER_STATUS.ordered, LAB_ORDER_STATUS.awaiting, LAB_ORDER_STATUS.collected,
  LAB_ORDER_STATUS.inProcess, LAB_ORDER_STATUS.resultAvailable,
];
// Forward path an order moves along; Cancelled can happen before a result.
export const ORDER_FLOW = [
  LAB_ORDER_STATUS.ordered, LAB_ORDER_STATUS.awaiting, LAB_ORDER_STATUS.collected,
  LAB_ORDER_STATUS.inProcess, LAB_ORDER_STATUS.resultAvailable, LAB_ORDER_STATUS.completed,
];
export const CANCELLABLE_STATUSES = [
  LAB_ORDER_STATUS.ordered, LAB_ORDER_STATUS.awaiting, LAB_ORDER_STATUS.collected, LAB_ORDER_STATUS.inProcess,
];

export const EVIDENCE_STATUS = {
  qualifying: 'Qualifying',
  nonQualifying: 'Non-qualifying',
  pendingReview: 'Pending Review',
  outsidePeriod: 'Outside Measurement Period',
};

export const GAP_EVALUATION = {
  open: 'Open',
  inProgress: 'In Progress',
  satisfied: 'Satisfied',
  notSatisfied: 'Not Satisfied',
};

// Measures a lab result can close, and what the result has to be. Anything
// with a value counts as the test being done; clinical interpretation
// (High / Positive) is shown next to it but does not decide the evidence.
export const LAB_MEASURE_RULES = {
  GSD3: {
    test: 'HbA1c', unit: '%', referenceRange: '4.0 – 5.6 %', high: 5.6,
    diagnosis: { code: 'E11.9', title: 'Type 2 diabetes mellitus without complications' },
    requirement: 'A qualifying HbA1c result is required during the current measurement period.',
    simulate: [
      { key: 'normalish', label: 'HbA1c 7.2%', value: '7.2' },
      { key: 'high', label: 'HbA1c 8.5%', value: '8.5' },
      { key: 'rejected', label: 'No Qualifying Result', value: null, note: 'Specimen hemolyzed, no reportable value.' },
    ],
    external: { value: '6.9', source: 'Labcorp' },
  },
  DM: null, // alias, filled below
  KED: {
    test: 'eGFR (Kidney Health Panel)', short: 'eGFR', unit: 'mL/min/1.73m²', referenceRange: '≥ 60', low: 60,
    diagnosis: { code: 'E11.9', title: 'Type 2 diabetes mellitus without complications' },
    requirement: 'An eGFR result is required during the current measurement period.',
    simulate: [
      { key: 'normal', label: 'eGFR 78', value: '78' },
      { key: 'low', label: 'eGFR 48', value: '48' },
      { key: 'rejected', label: 'No Qualifying Result', value: null, note: 'Specimen not received by the lab.' },
    ],
    external: { value: '71', source: 'Labcorp' },
  },
  COL: {
    test: 'FIT (Fecal Immunochemical Test)', short: 'FIT', qualitative: true, referenceRange: 'Negative',
    diagnosis: { code: 'Z12.11', title: 'Encounter for screening for malignant neoplasm of colon' },
    requirement: 'A FIT result is required during the current measurement period.',
    simulate: [
      { key: 'neg', label: 'FIT Negative', value: 'Negative' },
      { key: 'pos', label: 'FIT Positive', value: 'Positive' },
      { key: 'rejected', label: 'No Qualifying Result', value: null, note: 'Kit returned past stability window.' },
    ],
    external: { value: 'Negative', source: 'Labcorp' },
  },
  CHL: {
    test: 'Chlamydia NAAT', short: 'Chlamydia test', qualitative: true, referenceRange: 'Not Detected',
    diagnosis: { code: 'Z11.3', title: 'Encounter for screening for infections with a predominantly sexual mode of transmission' },
    requirement: 'A chlamydia screening result is required during the current measurement period.',
    simulate: [
      { key: 'neg', label: 'Not Detected', value: 'Not Detected' },
      { key: 'pos', label: 'Detected', value: 'Detected' },
      { key: 'rejected', label: 'No Qualifying Result', value: null, note: 'Specimen leaked in transit.' },
    ],
    external: { value: 'Not Detected', source: 'Labcorp' },
  },
};
LAB_MEASURE_RULES.DM = LAB_MEASURE_RULES.GSD3;

// Tests that can go on an order. One order is one requisition to one
// performing lab, and can carry several tests from a single collection.
export const LAB_TEST_CATALOG = ['HbA1c', 'eGFR (Kidney Health Panel)', 'Lipid Panel', 'Comprehensive Metabolic Panel', 'CBC', 'TSH', 'Vitamin D', 'FIT (Fecal Immunochemical Test)', 'Chlamydia NAAT'];

// An order's tests (older orders stored one test in testName).
export const testsOf = (order) => (order?.tests?.length ? order.tests : (order?.testName ? [order.testName] : []));
export const testsLabel = (order) => testsOf(order).join(', ');
export const diagnosisLabel = (d) => (d?.code ? `${d.code} ${d.title || ''}`.trim() : String(d || ''));
export const PERFORMING_LABS = ['Quest Diagnostics', 'Labcorp', 'In-house Lab'];
export const LAB_PRIORITIES = ['Routine', 'Urgent'];

export const measurementPeriod = (year) => ({
  start: new Date(Number(year), 0, 1),
  end: new Date(Number(year), 11, 31, 23, 59, 59),
  label: `Jan 1 – Dec 31, ${year}`,
});

const inPeriod = (iso, period) => {
  const d = iso ? new Date(iso) : null;
  return !!d && !Number.isNaN(d.getTime()) && d >= period.start && d <= period.end;
};

// Clinical interpretation (separate from evidence): High / Low / Abnormal.
export function interpretResult(result, rule) {
  if (!result || result.value == null || result.value === '') return '';
  if (rule?.qualitative) return result.value === rule.referenceRange ? 'Normal' : 'Abnormal';
  const v = Number(result.value);
  if (Number.isNaN(v)) return '';
  if (rule?.high != null && v > rule.high) return 'High';
  if (rule?.low != null && v < rule.low) return 'Low';
  return 'Normal';
}

/**
 * Does this result satisfy the gap's evidence requirement?
 * @returns {{ status: string, reason: string }}
 */
export function evaluateResult(result, rule, period) {
  if (!result) return { status: EVIDENCE_STATUS.pendingReview, reason: '' };
  if (!rule) {
    return { status: EVIDENCE_STATUS.nonQualifying, reason: 'This measure is not closed by a lab result.' };
  }
  if (result.testName && result.testName !== rule.test) {
    return { status: EVIDENCE_STATUS.nonQualifying, reason: `This measure needs ${rule.test}, not ${result.testName}.` };
  }
  if (result.value == null || result.value === '') {
    return { status: EVIDENCE_STATUS.nonQualifying, reason: result.note || 'The lab did not report a usable value.' };
  }
  if (!inPeriod(result.collectedAt, period)) {
    return {
      status: EVIDENCE_STATUS.outsidePeriod,
      reason: 'This result is outside the current measurement period and does not satisfy the Care Gap.',
    };
  }
  return {
    status: EVIDENCE_STATUS.qualifying,
    reason: 'This result satisfies the evidence requirement for the current measurement period.',
  };
}

const newest = (list, field) => list.toSorted((a, b) => new Date(b[field] || 0) - new Date(a[field] || 0))[0] || null;

/**
 * Everything the Orders tab needs, derived from the member's orders and
 * results for this gap: the gap evaluation, the order that matters now, the
 * latest relevant result, and the next action.
 */
export function deriveLabState({ gapCode, orders = [], results = [], period }) {
  const rule = LAB_MEASURE_RULES[gapCode] || null;
  const evaluated = results.map(r => ({ ...r, evaluation: evaluateResult(r, rule, period) }));
  const qualifying = newest(evaluated.filter(r => r.evaluation.status === EVIDENCE_STATUS.qualifying), 'collectedAt');
  // "Latest relevant" = latest result for the measure's test.
  const latestResult = newest(rule ? evaluated.filter(r => r.testName === rule.test) : evaluated, 'resultedAt') || null;
  const activeOrder = newest(orders.filter(o => ACTIVE_ORDER_STATUSES.includes(o.status)), 'orderedAt');
  const latestOrder = activeOrder || newest(orders, 'orderedAt');
  // All results on the latest order, and the one that counts for this gap
  // (its measure's test), which drives the evaluation.
  const orderResults = latestOrder ? evaluated.filter(r => r.labOrderId === latestOrder.id) : [];
  const orderResult = orderResults.find(r => !rule || r.testName === rule.test) || orderResults[0] || null;
  const orderCoversGap = !rule || !latestOrder || testsOf(latestOrder).includes(rule.test);

  // Only an order that includes the measure's test moves the gap forward.
  const activeCovers = activeOrder && (!rule || testsOf(activeOrder).includes(rule.test));
  let gap = GAP_EVALUATION.open;
  if (qualifying) gap = GAP_EVALUATION.satisfied;
  else if (activeCovers) gap = GAP_EVALUATION.inProgress;
  else if (latestResult && latestResult.evaluation.status !== EVIDENCE_STATUS.outsidePeriod) gap = GAP_EVALUATION.notSatisfied;

  // Short name for buttons and sentences ("Order FIT"), full name on the order.
  const test = rule?.short || rule?.test || 'lab';
  let action;
  if (activeOrder?.status === LAB_ORDER_STATUS.resultAvailable) {
    action = { key: 'review', label: 'Review Result', text: `A new ${test} result is available and ready for review.` };
  } else if (qualifying) {
    action = { key: 'evidence', label: 'View Evidence', text: 'This Care Gap has qualifying evidence for the current measurement period.' };
  } else if (activeOrder && !activeCovers) {
    action = { key: 'new', label: `Order ${test}`, text: `The current order does not include ${test}, which this Care Gap needs.` };
  } else if (activeOrder) {
    action = activeOrder.status === LAB_ORDER_STATUS.awaiting || activeOrder.status === LAB_ORDER_STATUS.ordered
      ? { key: 'order', label: 'View Order', text: `${test} has been ordered. The patient has not completed collection yet.` }
      : { key: 'order', label: 'View Order', text: `The specimen is with the lab (${activeOrder.status}). The result will appear here when it is ready.` };
  } else if (latestResult && latestResult.evaluation.status === EVIDENCE_STATUS.nonQualifying && rule) {
    action = { key: 'new', label: `Re-order ${test}`, text: `The last ${test} result did not qualify. A new ${test} is required to close this Care Gap.` };
  } else if (rule) {
    action = { key: 'new', label: `Order ${test}`, text: `${test} testing is required to close this Care Gap.` };
  } else {
    action = { key: 'new', label: 'Order Lab', text: 'This measure is not closed by a lab result, but you can still order labs for the patient.' };
  }

  return { rule, gap, qualifying, latestResult, activeOrder, latestOrder, orderResults, orderResult, orderCoversGap, evaluated, action };
}

// Plain-language "why is the gap open" line for the summary card.
export function gapReason(state) {
  const test = state.rule?.short || state.rule?.test || 'lab';
  if (state.gap === GAP_EVALUATION.satisfied) return `A qualifying ${test} result was found for the current measurement period.`;
  if (!state.rule) return 'This measure is closed by other evidence, not a lab result.';
  if (state.gap === GAP_EVALUATION.inProgress) return `A ${test} is on order, but no qualifying result has been received yet.`;
  if (state.gap === GAP_EVALUATION.notSatisfied) return `The latest ${test} result does not satisfy the measure.`;
  return `A qualifying ${test} result has not been found for the current measurement period.`;
}
