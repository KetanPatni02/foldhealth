// Who the HCC call widget can call. Numbers are demo numbers, stable per
// person, until members, PCPs and staff carry real phone numbers.

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export const demoPhone = (seed, area = '702') => `(${area}) 555-${String(hash(seed) % 10000).padStart(4, '0')}`;

/**
 * [{ key, name, number, member?, pcp? }] for 'member' (one per Member ID),
 * 'pcp' (each rendering provider) or 'user' (active staff), A to Z.
 */
export function callTargets(kind, members = [], staff = []) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (kind === 'member') {
    const seen = new Map();
    for (const m of members) {
      const key = String(m.memberId || m.id);
      if (!seen.has(key)) seen.set(key, { key, name: m.name, number: demoPhone(key), member: m });
    }
    return [...seen.values()].sort(byName);
  }
  if (kind === 'pcp') {
    const pcps = [...new Set(members.map(m => m.rp).filter(Boolean))];
    return pcps.map(p => ({ key: p, name: p, number: demoPhone(p, '581'), pcp: p })).sort(byName);
  }
  return staff.map(s => ({ key: s.id, name: `${s.name}${s.roleLabel ? ` (${s.roleLabel})` : ''}`, number: demoPhone(s.id, '800') })).sort(byName);
}
