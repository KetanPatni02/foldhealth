import { ActionButton } from '../../../../components/ActionButton/ActionButton';
import { OverflowTabStrip } from '../../../../components/TabStrip/OverflowTabStrip';
import { PROFILE_TABS } from '../../data/programActivityMock';
import { SidebarCollapseHint } from './SidebarCollapseHint';
import styles from './ProfileTabBar.module.css';

const TAB_ITEMS = PROFILE_TABS.map(tab => ({ key: tab, label: tab }));

export function ProfileTabBar({ activeTab, onTabChange, leftCollapsed = false, onToggleLeft }) {
  return (
    <div className={styles.tabBar}>
      <SidebarCollapseHint enabled={!leftCollapsed}>
        <ActionButton
          icon="solar:sidebar-minimalistic-linear"
          size="S"
          active
          aria-label={leftCollapsed ? 'Expand panel' : 'Collapse panel'}
          className={[leftCollapsed ? styles.sidebarFlipped : '', styles.sidebarToggle].filter(Boolean).join(' ')}
          onClick={onToggleLeft}
        />
      </SidebarCollapseHint>
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
