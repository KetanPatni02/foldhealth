import { parseLocalDate } from '../../../../../../lib/localDate';

/**
 * Which care plan goals, interventions and barriers need attention now, and
 * why, so the Overview's Care Plan card can show those instead of every
 * item. Each rule reads only recorded fields; nothing is inferred.
 *
 *  Goals          Not met; past the target date; trending the wrong way
 *  Interventions  Past due; low adherence; high priority with no owner, or
 *                 not started two weeks after it was added
 *
 * The same item planned under more than one program counts once.
 *  Barriers       On hold; high priority and added in the last 30 days
 *
 * When fewer than `limit` items need attention, the most recently updated
 * open items fill the rest, marked as recent rather than as problems.
 *
 * Returns { items: [{ kind, item, reason, tone }], attention, open, total }
 * sorted by tone (error, warning, then recent), priority, then recency.
 */

const DAY = 24 * 3600 * 1000;
const CLOSED = /^(met|achieved|resolved|closed|completed|discontinued|not applicable)$/i;
const TONE_RANK = { error: 0, warning: 1, grey: 2, info: 3 };
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const isOpen = item => !CLOSED.test(item.status || '');
const ms = (iso) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
};
const dateMs = (s) => {
  const d = parseLocalDate(s);
  return d ? d.getTime() : null;
};
const ownerName = a => (typeof a === 'string' ? a : a?.name) || '';

function goalReason(g, now) {
  if (/^not met$/i.test(g.status || '')) return { reason: 'Not met', tone: 'error' };
  if (!isOpen(g)) return null;
  const target = dateMs(g.targetDate);
  if (target != null && target < now) return { reason: 'Past target date', tone: 'error' };
  if (g.trend === '↓') return { reason: 'Trending down', tone: 'warning' };
  return null;
}

function interventionReason(i, now) {
  if (!isOpen(i)) return null;
  const due = dateMs(i.config?.dueDateOverride);
  if (due != null && due < now) return { reason: 'Past due', tone: 'error' };
  const adherence = Number(i.adherence);
  if (i.adherence != null && i.adherence !== '' && Number.isFinite(adherence) && adherence < 50) {
    return { reason: `Adherence ${Math.round(adherence)}%`, tone: 'warning' };
  }
  if (i.priority === 'high' && (!ownerName(i.assignee) || ownerName(i.assignee) === 'Unassigned')) {
    return { reason: 'No owner', tone: 'warning' };
  }
  const created = ms(i.createdAt);
  if (i.priority === 'high' && /^not started$/i.test(i.status || '') && created != null && now - created > 14 * DAY) {
    return { reason: 'Not started', tone: 'warning' };
  }
  return null;
}

function barrierReason(b, now) {
  if (!isOpen(b)) return null;
  if (/^on hold$/i.test(b.status || '')) return { reason: 'On hold', tone: 'warning' };
  const created = ms(b.createdAt);
  if (b.priority === 'high' && created != null && now - created <= 30 * DAY) return { reason: 'New, high priority', tone: 'warning' };
  return null;
}

// One entry per kind and title: templates applied under several programs
// repeat the same goal or intervention. Of the copies, keep the one that
// needs the most attention.
function unique(entries) {
  const best = new Map();
  for (const e of entries) {
    const key = `${e.kind}:${String(e.item.title || '').trim().toLowerCase()}`;
    const prev = best.get(key);
    const rank = e.why ? TONE_RANK[e.why.tone] : 9;
    const prevRank = prev?.why ? TONE_RANK[prev.why.tone] : 9;
    if (!prev || rank < prevRank) best.set(key, e);
  }
  return [...best.values()];
}

export function carePlanAttention({ goals = [], interventions = [], barriers = [], now = Date.now(), limit = 5 } = {}) {
  const all = unique([
    ...goals.map(item => ({ kind: 'goal', item, why: goalReason(item, now) })),
    ...interventions.map(item => ({ kind: 'intervention', item, why: interventionReason(item, now) })),
    ...barriers.map(item => ({ kind: 'barrier', item, why: barrierReason(item, now) })),
  ]);
  const updated = e => ms(e.item.updatedAt) ?? ms(e.item.createdAt) ?? 0;
  const sort = (a, b) => (TONE_RANK[a.tone] - TONE_RANK[b.tone])
    || ((PRIORITY_RANK[a.item.priority] ?? 3) - (PRIORITY_RANK[b.item.priority] ?? 3))
    || (updated(b) - updated(a));

  const flagged = all.filter(e => e.why).map(e => ({ kind: e.kind, item: e.item, reason: e.why.reason, tone: e.why.tone }));
  flagged.sort(sort);
  const open = all.filter(e => isOpen(e.item));

  const recent = flagged.length >= limit ? [] : open
    .filter(e => !e.why && now - updated(e) <= 14 * DAY)
    .sort((a, b) => updated(b) - updated(a))
    .slice(0, limit - flagged.length)
    .map(e => ({ kind: e.kind, item: e.item, reason: 'Updated recently', tone: 'info' }));

  return {
    items: [...flagged, ...recent],
    attention: flagged.length,
    open: open.length,
    total: all.length,
  };
}
