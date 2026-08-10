  const fromTeams = [];
  for (const t of teams || []) {
    if (t.kind !== 'hcc' || t.teamType !== teamType) continue;
    for (const m of t.members || []) {
      fromTeams.push({
        id: m.userId, name: m.name, initials: m.initials,
        roles: m.roles, source: 'team', teamName: t.name,
      });
    }
  }
  const seen = new Set(fromTeams.map(c => c.id));
  const fromAstrana = [];
  for (const s of staffForRole(role)) {
    if (seen.has(s.id)) continue;
    fromAstrana.push({
      id: s.id, name: s.name, initials: s.initials,
      roles: ROLE_LABEL[s.role], source: 'astrana',
    });
  }
  return [...fromTeams, ...fromAstrana];
}

/**
 * Group ICDs by HCC into rich `{ hcc, assoc, unlinked }` records.
 *
 * - `assoc` holds regular ICDs **plus** AI-suggested ones that have been
 *   Accepted (they're now "real" associations).
 * - `unlinked` holds AI-suggested ICDs still pending acceptance, **plus**
 *   genuinely unlinked rows from the `notLinked` list.
 */
export function groupIcdsByHcc(linked, notLinked) {
  const map = new Map();
  const ensure = (key) => {
    if (!map.has(key)) map.set(key, { hcc: key, assoc: [], unlinked: [] });
    return map.get(key);
  };
  for (const icd of linked) {
    const key = icd.hcc || 'HCC Not Linked';
    const bucket = ensure(key);
    if (isAISuggested(icd) && icd.status !== 'Accepted') bucket.unlinked.push(icd);
    else bucket.assoc.push(icd);
  }
  for (const icd of notLinked) {
    const key = icd.hcc || 'HCC Not Linked';
    ensure(key).unlinked.push(icd);
  }
  return [...map.values()];
}

const VIEW_MODES = ['HCC', 'ICD'];

