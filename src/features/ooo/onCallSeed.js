/**
 * On call schedules: who covers the phone tree, by type (Holiday Hours or
 * Out of Office), between two dates on chosen weekdays. Sample rows for
 * `bun run seed` and, until the table exists, the store.
 */
export const PHONE_TREE_TYPES = ['Holiday Hours', 'Out of Office'];

export function sampleOnCallSchedules(users, now = new Date()) {
  const day = (offset) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [a, b] = users || [];
  if (!a) return [];
  return [
    { id: 'oncall-sample-1', name: 'Weekday OOO cover', phoneTreeType: 'Out of Office', fromDate: day(0), toDate: day(14), days: [1, 2, 3, 4, 5], userName: a.name, userId: a.id || null },
    { id: 'oncall-sample-2', name: 'Holiday weekend cover', phoneTreeType: 'Holiday Hours', fromDate: day(20), toDate: day(22), days: [0, 5, 6], userName: (b || a).name, userId: (b || a).id || null },
  ].map(s => ({ ...s, oooRecordId: null, createdBy: a.name, createdAt: now.toISOString() }));
}

/** Schedule ↔ on_call_schedules row. */
export const onCallToRow = (s) => ({
  id: s.id,
  name: s.name,
  phone_tree_type: s.phoneTreeType,
  from_date: s.fromDate,
  to_date: s.toDate,
  days: s.days || [],
  user_name: s.userName,
  user_id: s.userId || null,
  ooo_record_id: s.oooRecordId || null,
  created_by: s.createdBy || null,
  created_at: s.createdAt || new Date().toISOString(),
});

export const rowToOnCall = (row) => ({
  id: row.id,
  name: row.name,
  phoneTreeType: row.phone_tree_type,
  fromDate: row.from_date,
  toDate: row.to_date,
  days: row.days || [],
  userName: row.user_name,
  userId: row.user_id,
  oooRecordId: row.ooo_record_id,
  createdBy: row.created_by,
  createdAt: row.created_at,
});
