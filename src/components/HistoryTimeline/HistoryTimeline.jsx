import { useState } from 'react';
import { Icon } from '../Icon/Icon';
import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import styles from './HistoryTimeline.module.css';

// Status label → shared Badge tone. Every timeline renders its transition
// chips through the design-system Badge so the color band reads the same
// as the pills sitting on the worklist rows, drawer headers, etc.
const STATUS_TONE = {
  Open:          'primary',
  Audited:       'primary',
  New:           'warning',
  'In Progress': 'warning',
  Engaged:       'warning',
  'Engaged Requires Follow-Up': 'warning',
  Submitted:     'warning',
  Pending:       'warning',
  'Pending Review': 'warning',
  Completed:     'success',
  Accepted:      'success',
  Dismissed:     'error',
  Returned:      'error',
  Rejected:      'error',
  Deleted:       'grey',
  None:          'grey',
};
const toneFor = (label) => STATUS_TONE[label] || 'grey';

// Icon + tone treatment per HCC activity type. Exported so callers that
// still key on `t` (e.g. HCC's LeftWorkspace) can share the same routing
// table with tools that need to introspect it.
export const ACT_ICON = {
  outreach:    { icon: 'solar:phone-linear',                 color: 'var(--secondary-300)',  bg: 'var(--secondary-100)',        border: 'rgba(244,122,62,0.2)',    dashed: false },
  status_dos:  { icon: 'solar:eye-scan-linear',              color: 'var(--status-warning)', bg: 'var(--status-warning-light)', border: 'rgba(217,165,11,0.2)',    dashed: false },
  status_hcc:  { icon: 'solar:eye-scan-linear',              color: 'var(--status-warning)', bg: 'var(--status-warning-light)', border: 'rgba(217,165,11,0.2)',    dashed: false },
  status_role: { icon: 'solar:refresh-circle-linear',        color: 'var(--primary-300)',    bg: 'var(--primary-50)',           border: 'rgba(107,68,168,0.2)',    dashed: false },
  accept:      { icon: 'solar:check-read-linear',            color: 'var(--status-success)', bg: 'var(--status-success-light)', border: 'rgba(0,155,83,0.2)',      dashed: false },
  dismiss:     { icon: 'solar:close-circle-linear',          color: 'var(--status-error)',   bg: 'var(--status-error-light)',   border: 'rgba(215,40,37,0.2)',     dashed: false },
  delete:      { icon: 'solar:trash-bin-trash-linear',       color: 'var(--status-error)',   bg: 'var(--status-error-light)',   border: 'rgba(215,40,37,0.2)',     dashed: false },
  upload:      { icon: 'solar:upload-minimalistic-linear',   color: 'var(--neutral-300)',    bg: 'var(--neutral-0)',            border: 'var(--neutral-150)',      dashed: false },
  create:      { icon: 'solar:add-circle-linear',            color: 'var(--secondary-300)',  bg: 'var(--secondary-100)',        border: 'rgba(244,122,62,0.2)',    dashed: false },
  override:    { icon: 'solar:refresh-square-linear',        color: 'var(--secondary-300)',  bg: 'var(--secondary-100)',        border: 'rgba(244,122,62,0.2)',    dashed: false },
  comment:     { icon: 'solar:chat-round-linear',            color: 'var(--neutral-300)',    bg: 'var(--neutral-0)',            border: 'var(--neutral-150)',      dashed: false },
  assign_coder:{ icon: 'solar:user-plus-rounded-linear',     color: 'var(--neutral-300)',    bg: 'var(--neutral-0)',            border: 'var(--neutral-150)',      dashed: false },
};

// Status-string → CSS pill class. Every timeline that shows an "X → Y"
// transition reads from this single map so the color band is identical.
export const TRANS_BADGE = {
  Accepted:      'pillAccepted',
  Dismissed:     'pillDismissed',
  Deleted:       'pillDeleted',
  None:          'pillNone',
  Open:          'pillOpen',
  Returned:      'pillReturned',
  New:           'pillNew',
  Completed:     'pillCompleted',
  Audited:       'pillAudited',
  'In Progress': 'pillInProgress',
};

/** Small "[avatar] name" chip used inside avatar-transition pills. */
export function AvatarPill({ initials, name }) {
  return (
    <span className={styles.avatarPill}>
      <Avatar variant="staff" size="XS" initials={initials} />
      <span className={styles.avatarName}>{name}</span>
    </span>
  );
}

/**
 * HistoryTimeline — wrapper that lays rows out vertically. Callers still
 * decide how items are grouped (month headers, etc.) upstream; this only
 * takes an already-flattened list of `{ item, isFirst, isLast, key }`.
 */
export function HistoryTimeline({ items = [], renderEntry }) {
  return (
    <div className={styles.wrap}>
      {items.map((it) => renderEntry
        ? renderEntry(it)
        : (
          <HistoryTimelineEntry
            key={it.key}
            item={it.item}
            isFirst={it.isFirst}
            isLast={it.isLast}
          />
        ))}
    </div>
  );
}

/**
 * HistoryTimelineEntry — one row (icon rail + body).
 *
 * Item contract (mirrors HCC's DiagPanel entries):
 *   t         string   — key into ACT_ICON for the default icon config
 *   date, time, by, role, dos — meta line inputs
 *   headline  string   — the primary line under the meta
 *   from, to  string   — status transition pills
 *   tag       string   — outreach tag row
 *   file, fileType — attachment card
 *   fromAvatar, toAvatar — { initials, name } for the avatar-transition row
 *   details   Array    — per-ICD details rendered inside the expandable card
 *   commentBody string — inline paragraph rendered under the headline
 *
 * Slot props:
 *   iconConfig    — override the ACT_ICON lookup (icon, color, bg, border)
 *   singleStatus  — render one pill (no arrow) when there's no from/to pair
 *   onPreviewFile — called when the file card is clicked
 *   detailsContent — JSX rendered inside the expandable card (replaces the
 *                    default HCC per-ICD list when the caller has a
 *                    different payload shape, e.g. HccHistoryDrawer)
 *   showDetailsToggle — force-show or force-hide the Details toggle; when
 *                       unset it appears whenever there's expandable content
 *   headlineExtra — extra JSX rendered after the headline (kept inline with
 *                   the Details toggle)
 *   children      — arbitrary JSX rendered at the end of the body, before
 *                   the details card
 */
export function HistoryTimelineEntry({
  item,
  isFirst,
  isLast,
  iconConfig,
  singleStatus,
  onPreviewFile,
  detailsContent,
  showDetailsToggle,
  headlineExtra,
  children,
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = iconConfig || ACT_ICON[item.t] || ACT_ICON.accept;

  const meta = [
    item.date,
    item.time,
    item.by ? `${item.by}${item.role ? ` (${item.role})` : ''}` : null,
    item.dos ? `DOS (${item.dos})` : null,
    item.patient,
  ].filter(Boolean).join(' • ');

  const hasTransition = item.from && item.to;
  const hasSingleStatus = !hasTransition && singleStatus;
  const hasFile = !!item.file;
  const hasAvatarTransition = item.fromAvatar && item.toAvatar;
  const hasDefaultDetails = Array.isArray(item.details) && item.t !== 'accept' && item.t !== 'comment';
  const canExpand = detailsContent != null || hasDefaultDetails;
  const showToggle = showDetailsToggle == null ? canExpand : showDetailsToggle;

  const preview = (e) => {
    if (e) e.stopPropagation?.();
    onPreviewFile?.(item);
  };

  return (
    <div className={styles.row}>
      <div className={styles.rail}>
        <span className={[styles.connectorTop, isFirst ? styles.connectorTopFirst : ''].join(' ')} />
        <span
          className={[styles.icon, cfg.dashed ? styles.iconDashed : ''].join(' ')}
          style={{ background: cfg.bg, borderColor: cfg.border }}
        >
          <Icon name={cfg.icon} size={14} color={cfg.color} />
        </span>
        <span className={[styles.connectorBottom, isLast ? styles.connectorBottomLast : ''].join(' ')} />
      </div>

      <div className={[styles.body, isFirst ? styles.bodyFirst : '', isLast ? styles.bodyLast : ''].join(' ')}>
        {meta && <div className={styles.meta}>{meta}</div>}
        {(item.headline || showToggle || headlineExtra) && (
          <div className={styles.headlineRow}>
            {item.headline && <span className={styles.headline}>{item.headline}</span>}
            {headlineExtra}
            {showToggle && (
              <button
                type="button"
                className={styles.detailsToggle}
                onClick={() => setExpanded(v => !v)}
              >
                <span className={styles.dot}>•</span>
                <span>Details</span>
                <Icon
                  name={expanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                  size={10}
                  color="var(--neutral-300)"
                />
              </button>
            )}
          </div>
        )}

        {item.commentBody && (
          <div className={styles.commentBody}>{item.commentBody}</div>
        )}
        {item.t === 'comment' && item.details?.[0]?.note && !item.commentBody && (
          <div className={styles.commentBody}>{item.details[0].note}</div>
        )}

        {hasTransition && (
          <div className={styles.transition}>
            <Badge size="S" tone={toneFor(item.from)} label={item.from} />
            <Icon name="solar:arrow-right-linear" size={12} color="var(--neutral-300)" />
            <Badge size="S" tone={toneFor(item.to)} label={item.to} />
          </div>
        )}
        {hasSingleStatus && (
          <div className={styles.transition}>
            <Badge size="S" tone={toneFor(singleStatus)} label={singleStatus} />
          </div>
        )}

        {item.tag && <div className={styles.tag}>{item.tag}</div>}

        {hasFile && (
          <div
            className={styles.attachment}
            role={onPreviewFile ? 'button' : undefined}
            tabIndex={onPreviewFile ? 0 : undefined}
            onClick={onPreviewFile ? preview : undefined}
            onKeyDown={onPreviewFile ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); preview(e); }
            } : undefined}
            title={onPreviewFile ? `Preview ${item.file}` : undefined}
          >
            <span className={styles.fileBubble}>
              <Icon name="solar:file-text-linear" size={14} color="var(--neutral-300)" />
            </span>
            <div className={styles.fileText}>
              <div className={styles.fileName}>{item.file}</div>
              {item.fileType && <div className={styles.fileType}>{item.fileType}</div>}
            </div>
            <button
              type="button"
              className={styles.filePreview}
              aria-label="Preview"
              onClick={onPreviewFile ? preview : undefined}
            >
              <Icon name="solar:eye-linear" size={14} color="var(--neutral-300)" />
            </button>
          </div>
        )}

        {hasAvatarTransition && (
          <div className={styles.avatarTransition}>
            <AvatarPill {...item.fromAvatar} />
            <Icon name="solar:arrow-right-linear" size={12} color="var(--neutral-300)" />
            <AvatarPill {...item.toAvatar} />
          </div>
        )}

        {children}

        {expanded && (detailsContent
          ? <div className={styles.detailsCard}>{detailsContent}</div>
          : hasDefaultDetails && (
            <div className={styles.detailsCard}>
              {item.details.map((d, i) => (
                <div key={i} className={styles.detailRow}>
                  <div className={styles.detailText}>
                    {d.hcc && <div className={styles.detailHcc}>{d.hcc}</div>}
                    {d.icd && <div className={styles.detailIcd}>{d.icd}</div>}
                    {d.reason && <div className={styles.detailReason}>Reason: {d.reason}</div>}
                    {d.note && <div className={styles.detailNote}>Note: {d.note}</div>}
                  </div>
                  {d.from && d.to && (
                    <div className={styles.detailBadges}>
                      <Badge size="S" tone={toneFor(d.from)} label={d.from} />
                      <Icon name="solar:arrow-right-linear" size={12} color="var(--neutral-300)" />
                      <Badge size="S" tone={toneFor(d.to)} label={d.to} />
                    </div>
                  )}
                  {!d.from && !d.to && (
                    <Badge size="S" tone="grey" label="Deleted" />
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export { styles as historyTimelineStyles };
