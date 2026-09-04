import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../../../../../components/Icon/Icon';
import { Badge } from '../../../../../../../components/Badge/Badge';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import styles from './CarePlanLinkedPreview.module.css';

/** Total linked items across the three link kinds (care program is context). */
export function linkedTotal(data) {
  if (!data) return 0;
  return (data.goals?.length || 0) + (data.interventions?.length || 0)
    + (data.barriers?.length || 0) + (data.automations?.length || 0);
}

function Row({ icon, iconColor = 'var(--neutral-400)', label }) {
  return (
    <div className={styles.row}>
      <Icon name={icon} size={16} color={iconColor} className={styles.rowIcon} />
      <span className={styles.rowLabel}>{label}</span>
    </div>
  );
}

/** Portal-rendered hover card previewing a goal's linked items (Figma SNP-Story 2632:112808). */
function LinkedItemsPopover({ anchorRect, data, onMouseEnter, onMouseLeave }) {
  const total = linkedTotal(data);
  const width = 320;
  // Right-aligned to the trigger and clamped to the viewport. A trigger in the
  // lower half of the screen flips the card above it, so a long list isn't
  // pushed off the bottom.
  const above = anchorRect.bottom > window.innerHeight / 2;
  const vertical = above
    ? { bottom: Math.min(window.innerHeight - anchorRect.top + 6, window.innerHeight - 12) }
    : { top: Math.min(anchorRect.bottom + 6, window.innerHeight - 12) };
  const left = Math.max(12, Math.min(anchorRect.right - width, window.innerWidth - width - 12));
  const programs = data.programs || [];
  return createPortal(
    <div
      className={styles.card}
      style={{ ...vertical, left, width }}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={styles.head}>
        <Badge tone="grey" size="S" label={String(total)} />
        <span className={styles.headText}>Linked Items</span>
      </div>
      {programs.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Care Program</span>
          <div className={styles.badges}>
            {programs.map(p => <Badge key={p} tone="grey" size="S" label={p} />)}
          </div>
        </div>
      )}
      {data.goals?.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>{data.goals.length === 1 ? 'Goal' : 'Goals'}</span>
          {data.goals.map(g => (
            <Row key={g.id} icon={g.icon || 'solar:flag-linear'} label={g.title} />
          ))}
        </div>
      )}
      {data.interventions?.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Interventions</span>
          {data.interventions.map(i => (
            <Row key={i.id} icon={i.icon || 'solar:clipboard-list-linear'} label={i.title} />
          ))}
        </div>
      )}
      {data.barriers?.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Barriers</span>
          {data.barriers.map(b => (
            <Row key={b.id} icon="custom:barrier" label={b.title} />
          ))}
        </div>
      )}
      {data.automations?.length > 0 && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Automation</span>
          {data.automations.map(a => (
            <Row key={a.id} icon="solar:bolt-linear" iconColor="var(--neutral-300)" label={a.title} />
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

/**
 * Link affordance for a GBI row: an ActionButton badged with the number of
 * linked interventions/barriers/automations. Hovering previews them — the
 * preview is the whole affordance, so the button doesn't open anything.
 */
export function GbiLinkButton({ data, size = 'S' }) {
  const total = linkedTotal(data);
  const [rect, setRect] = useState(null);
  const wrapRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  useEffect(() => () => {
    clearTimeout(openTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }, []);

  const open = () => {
    if (total === 0) return;
    clearTimeout(closeTimerRef.current);
    clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(() => {
      if (wrapRef.current) setRect(wrapRef.current.getBoundingClientRect());
    }, 120);
  };
  // Delayed close lets the cursor bridge the small gap between trigger
  // and card, and lets users park inside the card to scroll a long list.
  // Any mouseenter on the wrap or the card cancels the pending close.
  const scheduleClose = () => {
    clearTimeout(openTimerRef.current);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setRect(null), 150);
  };
  const cancelClose = () => clearTimeout(closeTimerRef.current);

  return (
    <span
      ref={wrapRef}
      className={styles.wrap}
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
      onClick={e => e.stopPropagation()}
    >
      <ActionButton
        icon="custom:link"
        size={size}
        count={total > 0 ? String(total) : undefined}
        iconColor={total > 0 ? 'var(--neutral-300)' : 'var(--neutral-200)'}
        tooltip={total === 0 ? 'No linked items' : undefined}
        aria-label={`${total} linked items`}
      />
      {rect && (
        <LinkedItemsPopover
          anchorRect={rect}
          data={data}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        />
      )}
    </span>
  );
}
