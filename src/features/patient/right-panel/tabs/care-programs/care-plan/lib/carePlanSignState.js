function itemTimestamp(item) {
  if (!item) return 0;
  const updated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
  const created = item.createdAt ? new Date(item.createdAt).getTime() : 0;
  return Math.max(updated, created);
}

/** True when the plan header has a recorded signature. */
export function isCarePlanSigned(plan) {
  return !!(plan?.signedBy && plan?.signedAt);
}

/** True when GBI content or the plan row changed after the last signature. */
export function carePlanHasChangesSinceSign(carePlan) {
  if (!carePlan?.plan || !isCarePlanSigned(carePlan.plan)) return false;
  const signedMs = new Date(carePlan.plan.signedAt).getTime();
  const stamps = [
    carePlan.plan.updatedAt ? new Date(carePlan.plan.updatedAt).getTime() : 0,
    ...(carePlan.goals || []).map(itemTimestamp),
    ...(carePlan.interventions || []).map(itemTimestamp),
    ...(carePlan.barriers || []).map(itemTimestamp),
  ];
  return Math.max(...stamps, 0) > signedMs;
}

/** Sign & Share is available when unsigned, or signed with pending edits. */
export function carePlanSignShareEnabled(carePlan, { usingMock = false } = {}) {
  if (usingMock || !carePlan?.plan) return false;
  if (!isCarePlanSigned(carePlan.plan)) return true;
  return carePlanHasChangesSinceSign(carePlan);
}
