/** Clinical role line under an assignee name in worklist tables. */
export function assigneeRoleLabel(assigneeName, platformUsers, storedRole) {
  if (storedRole) return storedRole;
  if (!assigneeName) return undefined;
  const user = (platformUsers || []).find((u) => u.name === assigneeName);
  return user?.clinicalRoles?.[0] || undefined;
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
      role: u.clinicalRoles?.[0] || '',
    }));
}
