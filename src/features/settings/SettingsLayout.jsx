import { SettingsSubNav } from './SettingsSubNav';
import { AgentsTable } from './agents/AgentsTable';
import { MessagesSettings } from './messages/MessagesSettings';
import { EmbeddedComponentsSettings } from './embedded-components/EmbeddedComponentsSettings';
import { ContentSettings } from './content/ContentSettings';
import { AccountPanel } from './account/AccountPanel';
import { BillingPanel } from './billing/BillingPanel';
import { MemberLeadsPanel } from './member-leads/MemberLeadsPanel';
import { CarePlanLibraryPanel } from './care-plan-library/CarePlanLibraryPanel';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import styles from './SettingsLayout.module.css';

// Nav items without a built panel yet. Rendering AgentsTable for these (the
// old fall-through) both showed the wrong screen and fired its Supabase
// queries; a static placeholder costs nothing.
const IMPLEMENTED = new Set([
  'agents', 'member/leads', 'messages', 'embedded-components',
  'content', 'care-plan-library', 'billing', 'account',
]);

function ComingSoonPanel({ label }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Icon name="solar:inbox-linear" size={40} color="var(--neutral-200)" />
        <div style={{ fontSize: 'var(--font-base)', fontWeight: 500, color: 'var(--neutral-300)', marginTop: '0.5rem' }}>{label}</div>
        <div style={{ fontSize: 'var(--font-md)', color: 'var(--neutral-200)', marginTop: 4 }}>Coming soon</div>
      </div>
    </div>
  );
}

export function SettingsLayout() {
  const settingsNavItem = useAppStore(s => s.settingsNavItem);
  const setSettingsNavItem = useAppStore(s => s.setSettingsNavItem);

  if (!IMPLEMENTED.has(settingsNavItem)) {
    const label = settingsNavItem.charAt(0).toUpperCase() + settingsNavItem.slice(1);
    return (
      <div className={styles.layout}>
        <SettingsSubNav activeItem={settingsNavItem} onItemClick={setSettingsNavItem} />
        <ComingSoonPanel label={label} />
      </div>
    );
  }

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
      ) : settingsNavItem === 'member/leads' ? (
        <MemberLeadsPanel />
      ) : settingsNavItem === 'care-plan-library' ? (
        <CarePlanLibraryPanel />
      ) : (
        <AgentsTable />
      )}
    </div>
  );
}
