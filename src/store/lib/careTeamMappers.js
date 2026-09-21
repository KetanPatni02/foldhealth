export function careTeamRowToJs(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    teamType: row.team_type,
    allocatedTins: row.allocated_tins || [],
    createdAt: row.created_label,
    createdBy: row.created_by,
    lastModifiedAt: row.modified_label,
    lastModifiedBy: row.modified_by,
    members: row.members || [],
  };
}

export function careTeamJsToDb(t) {
  return {
    id: t.id,
    name: t.name,
    kind: t.kind,
    team_type: t.teamType,
    allocated_tins: t.allocatedTins || [],
    created_label: t.createdAt,
    created_by: t.createdBy,
    modified_label: t.lastModifiedAt,
    modified_by: t.lastModifiedBy,
    members: t.members || [],
    updated_at: new Date().toISOString(),
  };
}
