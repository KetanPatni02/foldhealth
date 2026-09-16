/** Roles string for AssigneeChange picker rows (all clinical roles). */
export function clinicalRolesPickerLabel(user) {
  return (user?.clinicalRoles || []).filter(Boolean).join(', ');
}

/** Map platform users to AssigneeChange picker rows. */
export function platformUsersForAssigneePicker(platformUsers, { excludeClinicalRoles } = {}) {
  const exclude = excludeClinicalRoles ? new Set(excludeClinicalRoles) : null;
  return (platformUsers || [])
    .filter((u) => !exclude || !u.clinicalRoles?.some((r) => exclude.has(r)))
    .map((u) => ({
      id: u.id,
      name: u.name,
      initials: u.initials,
      role: clinicalRolesPickerLabel(u),
    }));
}
