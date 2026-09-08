// A `template` audit row carries the goals / interventions / barriers it
// brought to the plan as JSON in `detail`, written at sign time by
// signCarePlan. Parsing is guarded so a hand-edited or legacy row degrades to
// an empty template rather than breaking History.
export function templateContents(row) {
  try {
    const parsed = JSON.parse(row?.detail || '{}');
    return {
      goals: parsed.goals || [],
      interventions: parsed.interventions || [],
      barriers: parsed.barriers || [],
    };
  } catch {
    return { goals: [], interventions: [], barriers: [] };
  }
}

// Titles a version's template rows account for, so the same items are not also
// counted as loose additions.
export function templateOwnedTitles(templateRows) {
  const owned = new Set();
  for (const row of templateRows) {
    const c = templateContents(row);
    for (const title of [...c.goals, ...c.interventions, ...c.barriers]) {
      owned.add((title || '').trim().toLowerCase());
    }
  }
  return owned;
}
