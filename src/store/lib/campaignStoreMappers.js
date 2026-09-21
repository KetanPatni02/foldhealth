// campaign_sends row → JS shape for the delivery log / summary UI.
export function campaignSendRowToJs(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    memberId: row.member_id,
    name: row.recipient_name,
    email: row.recipient_email,
    status: row.status,
    subject: row.subject,
    sentAt: row.sent_at,
    openedAt: row.opened_at,
    error: row.error,
  };
}

// Single source of truth for translating Supabase campaigns rows into the JS
// shape the UI consumes.
export function campaignRowToJs(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    channel: row.channel || 'email',
    section: row.section || 'scheduled',
    audience: row.audience || 0,
    dynamic: row.dynamic || false,
    health: row.health,
    delivered: row.delivered,
    opened: row.opened,
    startDate: row.start_date,
    duration: row.duration,
    progress: row.progress || 0,
    executesIn: row.executes_in,
    enabled: row.enabled || false,
    emailTemplate: row.email_template,
    colorVariables: row.color_variables,
    audienceInclude: row.audience_include || [],
    audienceExclude: row.audience_exclude || [],
    sendVia: row.send_via || ['email'],
    startMode: row.start_mode || 'immediately',
    startAt: row.start_at,
    endDate: row.end_date,
    campaignType: row.campaign_type || 'one_time',
    senderName: row.sender_name || '',
    sendFrom: row.send_from || '',
    subjectLine: row.subject_line || '',
    category: row.category || null,
    updatedAt: row.updated_at || null,
    updatedBy: row.updated_by || null,
    updatedByName: row.updated_by_profile?.full_name || null,
  };
}

const CAMPAIGN_FIELD_MAP = {
  name: 'name',
  description: 'description',
  channel: 'channel',
  section: 'section',
  audience: 'audience',
  enabled: 'enabled',
  audienceInclude: 'audience_include',
  audienceExclude: 'audience_exclude',
  sendVia: 'send_via',
  startMode: 'start_mode',
  startAt: 'start_at',
  endDate: 'end_date',
  campaignType: 'campaign_type',
  senderName: 'sender_name',
  sendFrom: 'send_from',
  subjectLine: 'subject_line',
  category: 'category',
};

/** JS-shape patch → DB-shape patch; only keys present in the patch. */
export function campaignPatchToDb(patch) {
  const out = {};
  for (const [jsKey, value] of Object.entries(patch)) {
    const dbKey = CAMPAIGN_FIELD_MAP[jsKey];
    if (dbKey) out[dbKey] = value;
  }
  return out;
}
