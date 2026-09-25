import { ROLES, ROLE_LABEL, staffById } from './assignment/astranaStaff';

// Legacy member-level assignee name fields, used when a record has no
// per-DOS assignment state yet.
const LEGACY_NAME_FIELD = { support: 'sup', coder: 'cdr', reviewer: 'r1', reviewer2: 'r2' };

const initialsOf = (name) =>
  String(name || '?').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

/**
 * People who are working, or have worked, on an HCC record, with the role(s)
 * they hold on THIS record. Drives the @mention picker in the record's
 * Comments so only people involved in the record can be tagged.
 *
 * Sources, per DOS of the record: each role's current assignee and every past
 * assignee in that role's history; falls back to the member's legacy
 * sup / cdr / r1 / r2 names when there's no per-DOS state.
 *
 * Returns [{ id, name, initials, roleLabel, active, realProfile }], current
 * assignees first, in Support → Coder → QA → Compliance order.
 */
export function recordParticipants(member, dosAssignments = {}, platformUsers = []) {
  if (!member) return [];
  const byName = new Map();
  const resolveName = (idOrName) => {
    if (!idOrName) return null;
    return staffById(idOrName)?.name
      || platformUsers.find(u => u.id === idOrName)?.name
      || (/\s/.test(idOrName) ? idOrName : null);
  };
  const add = (idOrName, role, active) => {
    const name = resolveName(idOrName);
    if (!name) return;
    const key = name.toLowerCase();
    const p = byName.get(key) || { name, roles: new Set(), active: false, order: Infinity };
    p.roles.add(role);
    p.active = p.active || active;
    p.order = Math.min(p.order, ROLES.indexOf(role));
    byName.set(key, p);
  };

  const states = Object.values(dosAssignments || {}).filter(ds => ds?.patientId === member.id);
  for (const ds of states) {
    for (const role of ROLES) {
      const rs = ds[role];
      if (!rs) continue;
      if (rs.assignee) add(rs.assignee, role, true);
      for (const h of rs.history || []) if (h?.assignee) add(h.assignee, role, false);
    }
  }
  for (const role of ROLES) {
    const legacy = member[LEGACY_NAME_FIELD[role]];
    if (legacy) add(legacy, role, !states.length);
  }

  return [...byName.values()]
    .sort((a, b) => (a.active === b.active ? a.order - b.order : a.active ? -1 : 1))
    .map(p => {
      const profile = platformUsers.find(u => (u.name || '').toLowerCase() === p.name.toLowerCase());
      return {
        id: profile?.id || p.name,
        name: p.name,
        initials: profile?.initials || initialsOf(p.name),
        roleLabel: ROLES.filter(r => p.roles.has(r)).map(r => ROLE_LABEL[r]).join(', '),
        active: p.active,
        realProfile: !!profile,
      };
    });
}

/**
 * Full @mention roster for an HCC record: the record's participants (from
 * recordParticipants, pickable) followed by every other system user, shown
 * but disabled because they have no access to this record.
 */
export function recordMentionRoster(member, dosAssignments = {}, platformUsers = []) {
  const participants = recordParticipants(member, dosAssignments, platformUsers);
  const onRecord = new Set(participants.map(p => p.name.toLowerCase()));
  const outsiders = platformUsers
    .filter(u => u?.name && !onRecord.has(u.name.toLowerCase()))
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map(u => ({
      id: u.id,
      name: u.name,
      initials: u.initials || initialsOf(u.name),
      realProfile: true,
      disabled: true,
      disabledReason: 'Not part of this record',
    }));
  return [...participants, ...outsiders];
}
