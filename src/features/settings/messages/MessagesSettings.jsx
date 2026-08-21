import { useEffect, useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { SectionTitleBar } from '../../../components/SectionTitleBar/SectionTitleBar';
import { ChatSettingsPanel } from './ChatSettingsPanel';
import { useAppStore } from '../../../store/useAppStore';
import styles from '../agents/AgentsTable.module.css';

const TAB_MAP = {
  'inboxes': 'Inboxes',
  'template-responses': 'Template Responses',
  'chat-settings': 'Chat Settings',
  'efax': 'eFax',
};
const TAB_KEYS = Object.keys(TAB_MAP);
const TABS = TAB_KEYS.map(key => ({ key, label: TAB_MAP[key] }));

export function MessagesSettings() {
  const messageTab = useAppStore(s => s.messageTab) || 'chat-settings';
  const setMessageTab = useAppStore(s => s.setMessageTab);
  const setChatGroupDetailId = useAppStore(s => s.setChatGroupDetailId);
  const fetchChatGroups = useAppStore(s => s.fetchChatGroups);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const activeTabLabel = TAB_MAP[messageTab] || 'Chat Settings';
  const isChatSettings = messageTab === 'chat-settings';

  // Chat groups back the Chat Settings tab only — placeholder tabs
  // (Inboxes / Template Responses / eFax) must not trigger the query, and
  // repeat visits reuse the store copy.
  const chatGroupsFetched = useAppStore(s => s.chatGroupsFetched);
  const chatGroupsLoading = useAppStore(s => s.chatGroupsLoading);
  useEffect(() => {
    if (!isChatSettings || chatGroupsFetched || chatGroupsLoading) return;
    fetchChatGroups();
  }, [isChatSettings, chatGroupsFetched, chatGroupsLoading, fetchChatGroups]);

  return (
    <div className={styles.wrapper}>
      <SectionTitleBar
        tabs={TABS}
        activeTab={messageTab}
        onTabChange={setMessageTab}
        actions={isChatSettings ? ['search'] : []}
        searchPlaceholder="Search groups…"
        searchValue={chatSearchQuery}
        onSearchChange={setChatSearchQuery}
        primaryActionLabel={isChatSettings ? 'Add/Update Group' : undefined}
        onPrimaryAction={() => setChatGroupDetailId('new')}
      />

      <div className={styles.tableWrap}>
        {isChatSettings ? (
          <ChatSettingsPanel searchQuery={chatSearchQuery} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <Icon name="solar:inbox-linear" size={40} color="var(--neutral-200)" />
              <div style={{ fontSize: 'var(--font-base)', fontWeight: 500, color: 'var(--neutral-300)', marginTop: '0.5rem' }}>{activeTabLabel}</div>
              <div style={{ fontSize: 'var(--font-md)', color: 'var(--neutral-200)', marginTop: 4 }}>Coming soon</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
