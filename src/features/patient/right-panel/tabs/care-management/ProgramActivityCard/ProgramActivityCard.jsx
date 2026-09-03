import { useState } from 'react';
import { Icon } from '../../../../../../components/Icon/Icon';
import { Badge } from '../../../../../../components/Badge/Badge';
import { Avatar } from '../../../../../../components/Avatar/Avatar';
import { TimelineItem } from '../TimelineItem/TimelineItem.jsx';
import styles from './ProgramActivityCard.module.css';

/** Count badge on the timeline spine for a multi-activity program group. */
function SpineCount({ count, isLast, isFirst }) {
  return (
    <div className={styles.spineCol}>
      {isFirst ? <span className={styles.spineLine} /> : null}
      <Avatar variant="others" initials={String(count)} size="XS" className={styles.spineAvatar} />
      <span className={isLast ? styles.spineLineEnd : styles.spineLineGrow} />
    </div>
  );
}

/** Collapsed stacked cards — summary on top, two activity peeks beneath. */
function ActivityStack({ entry, isLast, isFirst }) {
  const [expanded, setExpanded] = useState(false);
  const peekItems = entry.items.slice(0, 2);

  if (expanded) {
    return (
      <div className={styles.entry}>
        <SpineCount count={entry.count} isLast={isLast} isFirst={isFirst} />
        <div className={styles.entryBody}>
          <div className={styles.expandedList}>
            {entry.items.map((item, idx) => (
              <TimelineItem
                key={item.id}
                item={item}
                programCode={entry.programCode}
                spine
                isFirst={idx === 0}
                isLast={idx === entry.items.length - 1}
              />
            ))}
          </div>
          <button type="button" className={`${styles.seeAll} ${styles.seeAllButton}`} onClick={() => setExpanded(false)} aria-expanded>
            <Icon name="solar:alt-arrow-down-linear" size={14} color="var(--primary-300)" />
            Hide activities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.entry}>
      <SpineCount count={entry.count} isLast={isLast} isFirst={isFirst} />
      <div className={styles.entryBody}>
        <button type="button" className={styles.stackButton} onClick={() => setExpanded(true)} aria-expanded={false}>
          <div className={styles.stack}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryText}>
                <span className={styles.programTitle}>{entry.programName}</span>
                <span className={styles.summaryMeta}>
                  {entry.count} {entry.count === 1 ? 'Activity' : 'Activities'} • {entry.userCount} {entry.userCount === 1 ? 'User' : 'Users'}
                </span>
              </div>
              <Badge tone="primary" size="XS" label={entry.programCode} />
            </div>
            {peekItems.map((item, i) => (
              <div
                key={item.id}
                className={styles.peekLayer}
                style={{ zIndex: 2 - i, '--peek-inset': `${(i + 1) * 8}px` }}
              >
                <div className={styles.peekCard}>
                  <TimelineItem
                    item={item}
                    programCode={entry.programCode}
                    showDate
                    peek
                    isLast={i === peekItems.length - 1}
                  />
                </div>
              </div>
            ))}
          </div>
          <span className={styles.seeAll}>
            <Icon name="solar:alt-arrow-right-linear" size={14} color="var(--primary-300)" />
            See all activities
          </span>
        </button>
      </div>
    </div>
  );
}

/** Single activity on a day — full row with icon spine (no stack). */
function ActivitySingle({ entry, isLast, isFirst }) {
  return (
    <div className={styles.entry}>
      <TimelineItem
        item={entry.items[0]}
        programCode={entry.programCode}
        spine
        isFirst={isFirst}
        isLast={isLast}
      />
    </div>
  );
}

/**
 * One calendar day in the Program Activity Log — date column on the left,
 * program stacks / single rows on the right (Figma 108:119415).
 */
export function ProgramActivityDay({ day }) {
  return (
    <div className={styles.day}>
      <div className={styles.dateCol}>
        <span className={styles.date}>{day.date}</span>
        <Badge tone="grey" size="XS" label={day.day} />
      </div>
      <div className={styles.dayEntries}>
        {day.entries.map((entry, i) => {
          const isLast = i === day.entries.length - 1;
          const isFirst = i === 0;
          if (entry.type === 'group') {
            return <ActivityStack key={entry.key} entry={entry} isLast={isLast} isFirst={isFirst} />;
          }
          return <ActivitySingle key={entry.key} entry={entry} isLast={isLast} isFirst={isFirst} />;
        })}
      </div>
    </div>
  );
}

/** @deprecated Use ProgramActivityDay */
export function ProgramActivityCard({ card }) {
  const day = {
    date: card.date,
    day: card.day,
    entries: [{
      ...card,
      type: card.count > 1 ? 'group' : 'single',
      key: card.key,
      items: card.items,
    }],
  };
  return <ProgramActivityDay day={day} />;
}
