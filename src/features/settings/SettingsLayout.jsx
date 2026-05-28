import { SettingsSubNav } from './SettingsSubNav';
import { AgentsTable } from './AgentsTable';
import { MessagesSettings } from './MessagesSettings';
import { EmbeddedComponentsSettings } from './EmbeddedComponentsSettings';
import { ContentSettings } from './ContentSettings';
import { AccountPanel } from './AccountPanel';
import { BillingPanel } from './BillingPanel';
import { useAppStore } from '../../store/useAppStore';
import styles from './SettingsLayout.module.css';

export function SettingsLayout() {
  const settingsNavItem = useAppStore(s => s.settingsNavItem);
  const setSettingsNavItem = useAppStore(s => s.setSettingsNavItem);

  return (
    <div className={styles.layout}>
      <SettingsSubNav activeItem={settingsNavItem} onItemClick={setSettingsNavItem} />
      {settingsNavItem === 'messages' ? (
        <MessagesSettings />
      ) : settingsNavItem === 'embedded-components' ? (
        <EmbeddedComponentsSettings />
      ) : settingsNavItem === 'content' ? (
        <ContentSettings />
      ) : settingsNavItem === 'account' ? (
        <AccountPanel />
      ) : settingsNavItem === 'billing' ? (
        <BillingPanel />
      ) : (
        <AgentsTable />
      )}
    </div>
  );
}
