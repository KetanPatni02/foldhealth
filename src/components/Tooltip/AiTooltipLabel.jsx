import { Icon } from '../Icon/Icon';
import styles from './AiTooltipLabel.module.css';

/**
 * AiTooltipLabel (Figma 621:36368): the content for a tooltip explaining
 * something Unity AI did: a ✦ title in the AI gradient, then a plain
 * explanation. Use as a `<Tooltip variant="card">` label.
 *
 * @param {string} props.title
 * @param {React.ReactNode} props.children – the explanation
 */
export function AiTooltipLabel({ title, children }) {
  return (
    <span className={styles.root}>
      <span className={styles.head}>
        <Icon name="custom:ai" size={12} />
        <span className={styles.title}>{title}</span>
      </span>
      <span className={styles.body}>{children}</span>
    </span>
  );
}
