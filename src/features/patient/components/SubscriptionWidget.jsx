import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Badge } from '../../../components/Badge/Badge';
import styles from './SubscriptionWidget.module.css';

export function SubscriptionWidget() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <button className={styles.titleBtn} onClick={() => setCollapsed(v => !v)}>
          <Icon
            name={collapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-down-linear'}
            size={13}
            color="var(--neutral-400)"
          />
          <span className={styles.title}>Subscription</span>
        </button>
      </div>

      {!collapsed && (
        <div className={styles.body}>
          <div className={styles.item}>
            <Avatar
              variant="generic"
              size="32px"
              backgroundColor="var(--neutral-50)"
              borderColor="var(--neutral-100)"
              icon={<Icon name="solar:shield-linear" size={16} color="var(--neutral-300)" />}
            />

            <div className={styles.itemContent}>
              <span className={styles.itemTitle}>Daily Subscription</span>
              <span className={styles.itemMeta}>
                Feb 11, 2025 - Mar 11, 2026{' '}
                <span className={styles.expiry}>(Expires in an hour)</span>
              </span>
            </div>

            <div className={styles.itemRight}>
              <Badge variant="toc-enrolled" label="Active" />
              <span className={styles.priceText}>$10/Day</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
