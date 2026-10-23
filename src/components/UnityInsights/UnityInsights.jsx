import { AiInsightIcon } from '../Icon/AiInsightIcon';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import { Icon } from '../Icon/Icon';
import styles from './UnityInsights.module.css';

/**
 * Unity insights: the AI layer a card carries under its own content (the
 * Reports pattern, Figma Reports 31:35360).
 *
 *  - UnityInsightStrip: one purple line with the star-shine icon, the card's
 *    headline insight. Pass `onToggle` to make it the switch for the
 *    sections below it.
 *  - UnityInsightHeader: a section title row ("Recommendations:") with its
 *    icon and "Powered by Unity" on the right.
 *  - UnityRecommendation: a row with a title and description on the left
 *    and its actions in a cell on the right.
 *
 * Wrap them in UnityInsights so they share one frame under the card body.
 */
export function UnityInsights({ children }) {
  return <div className={styles.insights}>{children}</div>;
}

/**
 * @param {React.ReactNode} props.children – the insight sentence
 * @param {() => void} [props.onToggle] – makes the strip a disclosure button
 * @param {boolean} [props.expanded]
 */
export function UnityInsightStrip({ children, onToggle, expanded = false }) {
  const content = (
    <>
      <Icon name="solar:star-shine-linear" size={16} color="var(--primary-300)" />
      <span className={styles.stripText}>{children}</span>
      {onToggle && (
        <DownChevronIcon
          size={12}
          color="var(--primary-300)"
          style={expanded ? { transform: 'rotate(180deg)' } : undefined}
        />
      )}
    </>
  );
  if (!onToggle) return <div className={styles.strip}>{content}</div>;
  return (
    <button type="button" className={`${styles.strip} ${styles.stripButton}`} aria-expanded={expanded} onClick={onToggle}>
      {content}
    </button>
  );
}

/**
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.icon] – defaults to the lightbulb with sparkles
 * @param {string|null} [props.poweredBy='Powered by Unity']
 */
export function UnityInsightHeader({ title, icon, poweredBy = 'Powered by Unity' }) {
  return (
    <div className={styles.header}>
      <span className={styles.headerIcon}>{icon ?? <AiInsightIcon size={24} />}</span>
      <span className={styles.headerTitle}>{title}</span>
      {poweredBy && <span className={styles.poweredBy}>{poweredBy}</span>}
    </div>
  );
}

/**
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.actions] – buttons for the right-hand cell
 * @param {React.ReactNode} [props.aside] – shown after the title (a "New" badge)
 */
export function UnityRecommendation({ title, description, actions, aside }) {
  return (
    <div className={styles.recommendation}>
      <div className={styles.recText}>
        <span className={styles.recTitleRow}>
          <span className={styles.recTitle}>{title}</span>
          {aside}
        </span>
        {description && <span className={styles.recDescription}>{description}</span>}
      </div>
      {actions && <div className={styles.recActions}>{actions}</div>}
    </div>
  );
}
