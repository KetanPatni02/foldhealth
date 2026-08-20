import { Icon } from '../../components/Icon/Icon';
import styles from './HomeView.module.css';

export function HomeWidgetEmpty({ icon, title, description }) {
  return (
    <div className={styles.widgetEmpty}>
      <div className={styles.widgetEmptyIcon} aria-hidden="true">
        <Icon name={icon} size={22} color="var(--primary-300)" />
      </div>
      <p className={styles.widgetEmptyTitle}>{title}</p>
      <p className={styles.widgetEmptyDesc}>{description}</p>
    </div>
  );
}
