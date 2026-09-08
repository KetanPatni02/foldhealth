import { Fragment } from 'react';
import { Icon } from '../Icon/Icon';
import { Badge } from '../Badge/Badge';
import { Link } from '../Link/Link';
import { ActionButton } from '../ActionButton/ActionButton';
import styles from './AuditDetailCard.module.css';

/**
 * AuditDetailCard — the expandable detail card behind a history timeline's
 * "View Details". A bordered card of titled sections, each with an optional
 * caption, trailing badges, a from → to pair and a free-text body.
 *
 * @param {Array<string>} [props.header]  Attribution lines, joined with dots.
 * @param {Array} props.sections
 *   { id, title, titleAction: {label, onClick}, caption,
 *     badges: [{label, tone, icon}], change: {from, to}, body }
 * @param {() => void} [props.onOpen]  Renders the corner action when supplied.
 * @param {string} [props.openTooltip]
 */
export function AuditDetailCard({ header, sections, onOpen, openTooltip = 'Open' }) {
  if (!sections?.length) return null;
  return (
    <div className={styles.card}>
      <div className={styles.inner}>
        {header?.length > 0 && (
          <div className={styles.header}>
            {header.map((part, i) => (
              <Fragment key={i}>
                {i > 0 && <span>•</span>}
                <span>{part}</span>
              </Fragment>
            ))}
          </div>
        )}

        {sections.map((s, i) => (
          <div key={s.id ?? i} className={styles.section}>
            {s.title && (
              <div className={styles.titleRow}>
                <span className={styles.sectionTitle}>{s.title}</span>
                {s.titleAction && (
                  <Link onClick={s.titleAction.onClick}>{s.titleAction.label}</Link>
                )}
              </div>
            )}
            {s.body && <span className={styles.sectionBody}>{s.body}</span>}
            {(s.caption || s.badges?.length || s.change) && (
              <div className={styles.caption}>
                {s.caption && <span>{s.caption}</span>}
                {s.badges?.map((b, bi) => (
                  <Badge key={bi} tone={b.tone || 'grey'} size="S" icon={b.icon} label={b.label} />
                ))}
                {s.change && (
                  <>
                    <Badge tone={s.change.fromTone || 'grey'} size="S" label={s.change.from} />
                    <Icon name="solar:arrow-right-linear" size={16} color="var(--neutral-200)" />
                    <Badge tone={s.change.toTone || 'grey'} size="S" label={s.change.to} />
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {onOpen && (
        <div className={styles.actionCol}>
          <ActionButton
            icon="solar:arrow-right-up-linear"
            size="S"
            tooltip={openTooltip}
            onClick={onOpen}
          />
        </div>
      )}
    </div>
  );
}
