// Relations a family history condition can be recorded against, in the order
// the Add New Relation picker lists them: closest first.
export const FAMILY_RELATIONS = [
  'Mother', 'Father', 'Sister', 'Brother', 'Daughter', 'Son',
  'Maternal Grandmother', 'Maternal Grandfather', 'Paternal Grandmother', 'Paternal Grandfather',
  'Maternal Aunt', 'Maternal Uncle', 'Paternal Aunt', 'Paternal Uncle',
  'Half-Sister', 'Half-Brother', 'Cousin',
];

/**
 * Family history entries (one per relation and condition) grouped by
 * relation, in the order each relation was first recorded.
 *
 * @returns {{ relation: string, entries: object[] }[]}
 */
export function groupByRelation(entries = []) {
  const groups = new Map();
  [...entries]
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
    .forEach((e) => {
      const key = e.relation || 'Unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    });
  return [...groups].map(([relation, list]) => ({ relation, entries: list }));
}
