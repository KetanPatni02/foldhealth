import { Icon } from '../Icon/Icon';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import { TruncatedText } from '../TruncatedText/TruncatedText';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../Collapsible/Collapsible';
import styles from './CollapsibleSection.module.css';

/**
 * CollapsibleSection: a bordered accordion card: an icon + title header that
 * folds the body away. Built on `Collapsible`, so it takes the same
 * `open` / `defaultOpen` / `onOpenChange`.
 *
 * First built for the Create Insurance Plan form's sections, and moved here so
 * other forms (the PAMI/Hx Social History drawer) share one implementation.
 *
 * @param {object}   props
 * @param {string}   [props.icon]           – Icon name, shown in primary-300
 * @param {string}   props.title
 * @param {node}     [props.subtitle]       – Second line under the title, shown while collapsed
 * @param {node}     [props.meta]           – Right side of the header, e.g. a count or badge
 * @param {boolean}  [props.open]
 * @param {boolean}  [props.defaultOpen=true]
 * @param {(open: boolean) => void} [props.onOpenChange]
 * @param {boolean}  [props.flush=false]   – Body without padding, for rows that draw their own dividers
 * @param {node}     props.children         – The section body
 */
export function CollapsibleSection({ icon, title, subtitle, meta, open, defaultOpen = true, onOpenChange, flush = false, children }) {
  return (
    <Collapsible className={styles.card} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className={styles.header}>
        {icon && <Icon name={icon} size={16} color="var(--primary-300)" />}
        {subtitle ? (
          // With a subtitle the chevron rides beside the title, so the two
          // lines read as one heading and the right edge stays for `meta`.
          <span className={styles.titleBlock}>
            <span className={styles.titleRow}>
              <span className={styles.titleText}>{title}</span>
              <DownChevronIcon size={12} color="var(--neutral-300)" className={styles.chevron} />
            </span>
            {typeof subtitle === 'string'
              ? <TruncatedText text={subtitle} className={styles.subtitle} maxWidth={420} />
              : <span className={styles.subtitle}>{subtitle}</span>}
          </span>
        ) : (
          <span className={styles.title}>{title}</span>
        )}
        {meta != null && <span className={styles.meta}>{meta}</span>}
        {!subtitle && <DownChevronIcon size={12} color="var(--neutral-300)" className={styles.chevron} />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
