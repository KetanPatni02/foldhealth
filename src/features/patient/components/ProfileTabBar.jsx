import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { OverflowTabStrip } from '../../../components/TabStrip/OverflowTabStrip';
import { PROFILE_TABS } from '../data/programActivityMock';
import styles from './ProfileTabBar.module.css';

const TAB_ITEMS = PROFILE_TABS.map(tab => ({ key: tab, label: tab }));

export function ProfileTabBar({ activeTab, onTabChange, leftCollapsed = false, onToggleLeft }) {
  return (
    <div className={styles.tabBar}>
      <ActionButton
        icon="solar:sidebar-minimalistic-linear"
        size="S"
        tooltip={leftCollapsed ? 'Expand panel' : 'Collapse panel'}
        className={[leftCollapsed ? styles.sidebarFlipped : '', styles.sidebarToggle].filter(Boolean).join(' ')}
        onClick={onToggleLeft}
      />
      <span className={styles.divider} />
      <div className={styles.tabsArea}>
        <OverflowTabStrip
          items={TAB_ITEMS}
          activeKey={activeTab}
          onChange={onTabChange}
        />
      </div>
    </div>
  );
}
