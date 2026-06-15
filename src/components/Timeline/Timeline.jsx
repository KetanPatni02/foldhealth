import { useMemo } from 'react';
import { Icon } from '../Icon/Icon';

/**
 * Timeline — month-grouped vertical timeline used by Domain Registry's
 * audit log and the Care Gap drawer's Activity Log tab. Extracted from
 * the original AuditLogDrawer so both callers share the same pattern.
 *
 * @param {Array}  props.entries          Entries (see TimelineEntry for shape).
 * @param {string} [props.currentUserName] Name to compare against entry.user
 *                                         for the "(Current User)" hint.
 * @param {(entry: object) => React.ReactNode} [props.renderExtra]
 *                                         Optional content rendered inside the
 *                                         entry card below the description
 *                                         (e.g. attachment buttons).
 * @param {string} [props.emptyLabel]      Placeholder shown when entries is empty.
 */
export function Timeline({ entries, currentUserName, renderExtra, emptyLabel = 'No activity yet.' }) {
  const groups = useMemo(() => groupByMonth(entries || []), [entries]);

  if (!entries || entries.length === 0) {
    return <div style={{ padding: 16, fontSize: 13, color: 'var(--neutral-300)' }}>{emptyLabel}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map(group => (
        <div key={group.label}>
          <div style={{
            fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)',
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8, paddingLeft: 4,
          }}>
            {group.label}
          </div>
          {group.entries.map((entry, i) => (
            <TimelineEntry
              key={entry.id ?? i}
              entry={entry}
              isFirst={i === 0}
              isLast={i === group.entries.length - 1}
              currentUserName={currentUserName}
              renderExtra={renderExtra}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Group an array of entries by month based on `entry.createdAt` (ISO string).
 * Preserves the input order within each group.
 */
export function groupByMonth(entries) {
  const groups = {};
  entries.forEach(e => {
    const d = new Date(e.createdAt);
    if (Number.isNaN(d.getTime())) return;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[monthKey]) groups[monthKey] = { label: monthLabel, entries: [] };
    groups[monthKey].entries.push(e);
  });
  return Object.values(groups);
}

/* ── Icons + colors keyed off entry.action — domain-registry uses these,
   but a caller can override per-entry by passing `icon` / `iconBg` /
   `iconColor` / `iconBorder` directly on the entry. ───────────────── */
const ACTION_CONFIG = {
  created:   { icon: 'solar:add-circle-linear',           bg: 'var(--status-success-light)', border: 'color-mix(in srgb, var(--status-success) 20%, transparent)', color: 'var(--status-success)' },
  updated:   { icon: 'solar:pen-linear',                  bg: 'var(--primary-100)',          border: 'color-mix(in srgb, var(--primary-300) 20%, transparent)', color: 'var(--primary-300)' },
  deleted:   { icon: 'solar:trash-bin-minimalistic-linear', bg: 'var(--status-error-light)', border: 'color-mix(in srgb, var(--status-error) 30%, transparent)',  color: 'var(--status-error)' },
  enabled:   { icon: 'solar:check-circle-linear',         bg: 'var(--status-success-light)', border: 'color-mix(in srgb, var(--status-success) 20%, transparent)', color: 'var(--status-success)' },
  disabled:  { icon: 'solar:close-circle-linear',         bg: 'var(--status-error-light)',   border: 'color-mix(in srgb, var(--status-error) 30%, transparent)',  color: 'var(--status-error)' },
  previewed: { icon: 'solar:eye-linear',                  bg: 'var(--status-info-light)',    border: 'color-mix(in srgb, var(--status-info) 15%, transparent)',  color: 'var(--status-info)' },
  note:      { icon: 'solar:document-text-linear',        bg: 'var(--neutral-50)',           border: 'color-mix(in srgb, var(--neutral-300) 12%, transparent)',  color: 'var(--neutral-300)' },
};
const DEFAULT_CONFIG = { icon: 'solar:document-text-linear', bg: 'var(--neutral-50)', border: 'color-mix(in srgb, var(--neutral-300) 10%, transparent)', color: 'var(--neutral-300)' };

const STATUS_COLORS = {
  Enabled:  { bg: 'var(--status-success-light)', color: 'var(--status-success-bright)' },
  Disabled: { bg: 'var(--status-warning-light)', color: 'var(--status-warning)' },
  Active:   { bg: 'var(--status-success-light)', color: 'var(--status-success-bright)' },
  Inactive: { bg: 'var(--status-warning-light)', color: 'var(--status-warning)' },
  Verified: { bg: 'var(--status-success-light)', color: 'var(--status-success-bright)' },
  Removed:  { bg: 'var(--status-error-light)', color: 'var(--status-error)' },
};

function ArrowRight() {
  return <Icon name="solar:arrow-right-linear" size={14} color="var(--neutral-200)" />;
}

/** A single field-level change row inside a TimelineEntry. */
export function ChangeDisplay({ change }) {
  if (change.type === 'status') {
    const fromColor = STATUS_COLORS[change.from] || { bg: 'var(--neutral-50)', color: 'var(--neutral-300)' };
    const toColor = STATUS_COLORS[change.to] || { bg: 'var(--neutral-50)', color: 'var(--neutral-300)' };
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', padding: '2px 6px', borderRadius: 4, fontSize: 12, background: fromColor.bg, color: fromColor.color }}>{change.from}</span>
        <ArrowRight />
        <span style={{ display: 'inline-flex', padding: '2px 6px', borderRadius: 4, fontSize: 12, background: toColor.bg, color: toColor.color }}>{change.to}</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
      <span style={{ color: 'var(--neutral-300)', textDecoration: 'line-through' }}>{change.from || '(empty)'}</span>
      <ArrowRight />
      <span style={{ color: 'var(--neutral-400)' }}>{change.to || '(empty)'}</span>
    </div>
  );
}

/**
 * TimelineEntry — single timeline node.
 *
 * Accepted entry fields:
 *   - createdAt   (string)  — ISO timestamp (drives month grouping)
 *   - date        (string)  — display date, pre-formatted
 *   - time        (string)  — display time, pre-formatted
 *   - user        (string)  — actor name
 *   - action      (string)  — key into ACTION_CONFIG (created/updated/etc.).
 *   - icon, iconBg, iconBorder, iconColor   — per-entry overrides
 *   - details     (string)  — primary description line
 *   - category    (string)  — muted subtitle line
 *   - changes     (array)   — structured field diffs (Domain Registry)
 */
export function TimelineEntry({ entry, isFirst, isLast, currentUserName, renderExtra }) {
  const cfg = ACTION_CONFIG[entry.action] || DEFAULT_CONFIG;
  const icon = entry.icon || cfg.icon;
  const iconBg = entry.iconBg || cfg.bg;
  const iconBorder = entry.iconBorder || cfg.border;
  const iconColor = entry.iconColor || cfg.color;
  const isCurrentUser = currentUserName && entry.user && entry.user.toLowerCase() === currentUserName.toLowerCase();

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
        <div style={{ width: 0.5, flex: '0 0 14px', background: isFirst ? 'transparent' : 'var(--neutral-150)' }} />
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          border: `0.5px solid ${iconBorder}`, background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={icon} size={14} color={iconColor} />
        </div>
        <div style={{ width: 0.5, flex: 1, minHeight: 12, background: isLast ? 'transparent' : 'var(--neutral-150)' }} />
      </div>

      <div style={{ flex: 1, background: 'var(--neutral-0)', borderRadius: 8, padding: '6px 4px 12px 4px' }}>
        <div style={{ padding: 8 }}>
          <div style={{
            display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap',
            fontSize: 12, fontWeight: 500, color: 'var(--neutral-300)', marginBottom: 4,
          }}>
            {entry.date && <span>{entry.date}</span>}
            {entry.date && entry.time && <span style={{ color: 'var(--neutral-150)' }}>•</span>}
            {entry.time && <span>{entry.time}</span>}
            {entry.user && <span style={{ color: 'var(--neutral-150)' }}>•</span>}
            {entry.user && (
              <span>
                {entry.user}
                {isCurrentUser && <span style={{ color: 'var(--neutral-200)', fontWeight: 400 }}> (Current User)</span>}
              </span>
            )}
          </div>

          {entry.details && (
            <div style={{ fontSize: 14, color: 'var(--neutral-400)', lineHeight: 1.2, marginBottom: 4 }}>
              {entry.details}
            </div>
          )}

          {entry.changes && entry.changes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, marginBottom: 4 }}>
              {entry.changes.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--neutral-200)', minWidth: 60, textTransform: 'capitalize' }}>{c.field}</span>
                  <ChangeDisplay change={c} />
                </div>
              ))}
            </div>
          )}

          {entry.category && (
            <span style={{ fontSize: 12, color: 'var(--neutral-200)' }}>{entry.category}</span>
          )}

          {renderExtra && renderExtra(entry)}
        </div>
      </div>
    </div>
  );
}
