import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Icon } from '../../components/Icon/Icon';
import { MissedCallIcon } from '../../components/Icon/MissedCallIcon';
import { TopBar } from '../../components/TopBar/TopBar';
import { Button } from '../../components/Button/Button';
import { SideNav } from '../../components/SideNav/SideNav';
import { useAppStore } from '../../store/useAppStore';
import { ChatArea } from './ChatArea';
import { ConversationListPanel } from './ConversationListPanel';
import { NewChatModal } from './NewChatModal';
import { getDisplayName } from './messageUtils';
import styles from './MessagesView.module.css';

const INBOX_ITEMS = [
  { id: 'assigned',    icon: 'solar:user-check-linear',         label: 'Assigned to me' },
  { id: 'mentions',   icon: 'solar:mention-square-linear',      label: 'Mentions' },
  { id: 'others',     icon: 'solar:users-group-rounded-linear', label: 'Assigned to Others' },
  { id: 'unassigned', icon: 'solar:user-cross-linear',          label: 'Unassigned' },
  { id: 'missed',     icon: 'solar:call-missed-linear',         label: 'Missed Calls', isCustomIcon: true },
  { id: 'starred',    icon: 'solar:star-linear',                label: 'Starred' },
  { id: 'archived',   icon: 'solar:archive-linear',             label: 'Archived' },
];

const CHANNEL_ITEMS = [
  { id: 'all',      icon: 'solar:chat-round-call-linear', label: 'All Conversations' },
  { id: 'chat',     icon: 'solar:chat-round-linear',      label: 'Chat' },
  { id: 'sms',      icon: 'solar:chat-square-linear',     label: 'SMS' },
  { id: 'calls',    icon: 'solar:phone-calling-linear',   label: 'Calls' },
  { id: 'email',    icon: 'solar:letter-linear',          label: 'Email' },
  { id: 'efax',     icon: 'solar:printer-linear',         label: 'E-fax' },
  { id: 'internal', icon: 'solar:user-speak-linear',      label: 'Internal Chat' },
];

export function MessagesView() {
  const setMessagesUnreadCount = useAppStore(s => s.setMessagesUnreadCount);
  const pendingChatUserEmail = useAppStore(s => s.pendingChatUserEmail);
  const setPendingChatUserEmail = useAppStore(s => s.setPendingChatUserEmail);

  const [currentUser, setCurrentUser]     = useState(null);
  const [profiles, setProfiles]           = useState({});
  const [allProfiles, setAllProfiles]     = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [filterTab, setFilterTab]         = useState('all');
  const [activeChannel, setActiveChannel] = useState('chat');
  const [searchQuery, setSearchQuery]     = useState('');
  const [showNewChat, setShowNewChat]     = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [convRefreshKey, setConvRefreshKey] = useState(0);
  const [showSearch, setShowSearch]       = useState(false);
  const newChatRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (user) setCurrentUser(user);
    });
  }, []);

  const refreshProfiles = useCallback(() => {
    supabase.from('profiles').select('*').then(({ data, error }) => {
      if (error) {
        console.warn('[MessagesView] profiles fetch failed — chat names will show as "Unknown" and New Chat list will be empty.', error);
        return;
      }
      setAllProfiles(data || []);
      const map = {};
      (data || []).forEach(p => { map[p.id] = p; });
      setProfiles(map);
    });
  }, []);

  useEffect(() => { refreshProfiles(); }, [refreshProfiles]);

  useEffect(() => {
    const ch = supabase
      .channel('profiles-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refreshProfiles)
      .subscribe();
    return () => ch.unsubscribe();
  }, [refreshProfiles]);

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (!data) return;

    const convMap = {};
    data.forEach(msg => {
      const otherId = msg.sender_id === currentUser.id ? msg.recipient_id : msg.sender_id;
      if (!convMap[otherId]) {
        convMap[otherId] = { userId: otherId, lastMessage: msg.content, lastTime: msg.created_at, unreadCount: 0 };
      }
      if (msg.recipient_id === currentUser.id && !msg.read_at) {
        convMap[otherId].unreadCount++;
      }
    });

    const convList = Object.values(convMap).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    setConversations(convList);

    const total = convList.reduce((sum, c) => sum + c.unreadCount, 0);
    setMessagesUnreadCount(total);
  }, [currentUser, setMessagesUnreadCount]);

  useEffect(() => {
    if (currentUser) loadConversations();
  }, [currentUser, loadConversations, convRefreshKey]);

  useEffect(() => {
    if (!currentUser) return;
    const ch = supabase
      .channel('msg-inbox')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `recipient_id=eq.${currentUser.id}`,
      }, () => setConvRefreshKey(k => k + 1))
      .subscribe();
    return () => ch.unsubscribe();
  }, [currentUser]);

  const handleConversationUpdate = useCallback(() => setConvRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!pendingChatUserEmail || !allProfiles.length) return;
    const match = allProfiles.find(p => p.email === pendingChatUserEmail);
    if (match) {
      setProfiles(prev => ({ ...prev, [match.id]: match }));
      setSelectedUserId(match.id);
      setShowNewChat(false);
      setNewChatSearch('');
      setActiveChannel('chat');
    }
    setPendingChatUserEmail(null);
  }, [pendingChatUserEmail, allProfiles, setPendingChatUserEmail]);

  useEffect(() => {
    if (!showNewChat) return;
    const handler = (e) => {
      if (newChatRef.current && !newChatRef.current.contains(e.target)) {
        setShowNewChat(false);
        setNewChatSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNewChat]);

  const showConversations = ['all', 'chat', 'internal'].includes(activeChannel);

  const filteredConversations = conversations.filter(conv => {
    if (filterTab === 'unread' && conv.unreadCount === 0) return false;
    if (!searchQuery) return true;
    const profile = profiles[conv.userId];
    const q = searchQuery.toLowerCase();
    return getDisplayName(profile).toLowerCase().includes(q) || (profile?.email || '').toLowerCase().includes(q);
  });

  const filteredNewUsers = allProfiles.filter(p => {
    if (p.id === currentUser?.id) return false;
    if (!newChatSearch) return true;
    const q = newChatSearch.toLowerCase();
    return getDisplayName(p).toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const selectedProfile = selectedUserId ? profiles[selectedUserId] : null;

  const openConversation = (userId) => {
    setSelectedUserId(userId);
    setShowNewChat(false);
    setNewChatSearch('');
  };

  const closeNewChat = () => {
    setShowNewChat(false);
    setNewChatSearch('');
  };

  return (
    <div className={styles.page}>
      <TopBar />

      <div className={styles.panels}>
        <SideNav
          width={200}
          header={
            <Button
              variant="primary"
              size="L"
              leadingIcon="solar:add-circle-bold"
              fullWidth
              onClick={() => setShowNewChat(true)}
            >
              Create New
            </Button>
          }
          sections={[
            {
              key: 'inbox',
              label: 'Inbox',
              items: INBOX_ITEMS.map(item => ({
                key: item.id,
                label: item.label,
                icon: item.isCustomIcon ? undefined : item.icon,
                iconElement: item.isCustomIcon
                  ? <MissedCallIcon size={16} color={activeChannel === item.id ? 'var(--primary-300)' : 'var(--neutral-300)'} />
                  : undefined,
                count: item.badge ?? undefined,
              })),
            },
            {
              key: 'channels',
              label: 'Channels',
              items: CHANNEL_ITEMS.map(item => ({
                key: item.id,
                label: item.label,
                icon: item.icon,
                count: ['all', 'chat', 'internal'].includes(item.id) && totalUnread > 0 ? totalUnread : undefined,
              })),
            },
          ]}
          activeKey={activeChannel}
          onSelect={setActiveChannel}
        />

        <ConversationListPanel
          activeChannel={activeChannel}
          showConversations={showConversations}
          totalUnread={totalUnread}
          showSearch={showSearch}
          searchQuery={searchQuery}
          filterTab={filterTab}
          filteredConversations={filteredConversations}
          profiles={profiles}
          selectedUserId={selectedUserId}
          onShowNewChat={() => setShowNewChat(true)}
          onToggleSearch={() => { setShowSearch(v => !v); if (showSearch) setSearchQuery(''); }}
          onSearchChange={setSearchQuery}
          onClearSearch={() => { setSearchQuery(''); setShowSearch(false); }}
          onFilterTabChange={setFilterTab}
          onSelectConversation={openConversation}
        />

        {showConversations && selectedUserId && selectedProfile && currentUser ? (
          <ChatArea
            key={selectedUserId}
            currentUser={currentUser}
            otherUser={selectedProfile}
            onConversationUpdate={handleConversationUpdate}
          />
        ) : (
          <div className={styles.chatPanel}>
            <div className={styles.noConvPlaceholder}>
              <div className={styles.noConvIcon}>
                <Icon name="solar:chat-round-linear" size={32} />
              </div>
              <div className={styles.noConvText}>Select a conversation or start a new one</div>
              <Button variant="primary" size="L" leadingIcon="solar:pen-new-square-linear" onClick={() => setShowNewChat(true)}>
                New Message
              </Button>
            </div>
          </div>
        )}
      </div>

      {showNewChat && (
        <NewChatModal
          modalRef={newChatRef}
          newChatSearch={newChatSearch}
          filteredNewUsers={filteredNewUsers}
          onSearchChange={setNewChatSearch}
          onClose={closeNewChat}
          onSelectUser={(p) => {
            setProfiles(prev => ({ ...prev, [p.id]: p }));
            openConversation(p.id);
            setActiveChannel('chat');
          }}
        />
      )}
    </div>
  );
}
