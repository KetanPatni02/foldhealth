/** First numeric token in a reading (e.g. "145/90" → 145) — shared by table + drawer. */
export function sparkNum(v) {
  const m = String(v).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : NaN;
}

/** Measurements for one goal, oldest → newest. */
export function goalMeasurements(goalId, measurements = []) {
  return measurements
    .filter(m => m.goalId === goalId)
    .slice()
    .sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
}

/**
 * Derive care-plan table fields from the same goal row + readings the drawer uses.
 * `progress` and `status` live on the goal; value/trend come from measurements.
 */
export function deriveGoalTableFields(goal, measurements = []) {
  const rows = goalMeasurements(goal?.id, measurements);
  let currentValue = 'No Data';
  let trend = '-';

  if (rows.length) {
    const latest = rows[rows.length - 1];
    const unit = latest.unit || goal?.customUnit || '';
    currentValue = unit && !String(latest.value).includes(unit)
      ? `${latest.value} ${unit}`.trim()
      : latest.value;

    if (rows.length >= 2) {
      const prev = sparkNum(rows[rows.length - 2].value);
      const next = sparkNum(rows[rows.length - 1].value);
      if (!Number.isNaN(prev) && !Number.isNaN(next)) {
        if (next > prev) trend = '↑';
        else if (next < prev) trend = '↓';
        else trend = '→';
      }
    }
  }

  return {
    currentValue,
    trend,
    progress: Number.isFinite(goal?.progress) ? goal.progress : 0,
    status: goal?.status || 'Not Started',
  };
}
