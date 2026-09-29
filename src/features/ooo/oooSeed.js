/**
 * Sample Out of Office records for the first few staff users, dated around
 * `now` so every status shows: one ongoing, a few upcoming, a few past.
 * Used by `bun run seed` and, until the table exists, by the store.
 */
const REASONS = ['Out on Planned Leave', 'Personal', 'Medical Leave', 'Annual Leave', 'Professional Development', 'Family Emergency', 'Jury Duty'];

// [day offset from today, start hour, length in days]
const PLAN = [
  [0, 0, 2],     // ongoing
  [3, 9, 2],
  [6, 0, 1],
  [10, 8, 3],
  [14, 0, 5],
  [-12, 0, 2],   // past
  [-25, 9, 1],
];

export function sampleOooRecords(users, now = new Date()) {
  const at = (days, hour) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0).toISOString();
  return (users || []).slice(0, PLAN.length).map((u, i) => {
    const [offset, hour, len] = PLAN[i];
    return {
      id: `ooo-sample-${i + 1}`,
      userId: u.id || null,
      userName: u.name,
      userEmail: u.email || null,
      userRole: u.role || 'Physician',
      startAt: at(offset, hour),
      endAt: at(offset + len, hour),
      reason: REASONS[i % REASONS.length],
      autoReply: i === 0,
      autoReplyMessage: i === 0 ? 'Hi! Thanks for reaching out. I\'m currently unavailable but will get back to you as soon as I can.' : '',
      createdBy: u.name,
      createdAt: at(offset - 7, 10),
      updatedAt: at(offset - 7, 10),
    };
  });
}

/** Record ↔ ooo_records row. */
export const oooToRow = (r) => ({
  id: r.id,
  user_id: r.userId || null,
  user_name: r.userName,
  user_email: r.userEmail || null,
  user_role: r.userRole || null,
  start_at: r.startAt,
  end_at: r.endAt,
  reason: r.reason || '',
  auto_reply: !!r.autoReply,
  auto_reply_message: r.autoReplyMessage || '',
  created_by: r.createdBy || null,
  created_at: r.createdAt || new Date().toISOString(),
  updated_at: r.updatedAt || new Date().toISOString(),
});

export const rowToOoo = (row) => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  userEmail: row.user_email,
  userRole: row.user_role,
  startAt: row.start_at,
  endAt: row.end_at,
  reason: row.reason,
  autoReply: row.auto_reply,
  autoReplyMessage: row.auto_reply_message,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
