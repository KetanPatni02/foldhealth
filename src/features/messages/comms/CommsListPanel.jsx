import { useState } from 'react';
import { Icon } from '../../../components/Icon/Icon';
import { FilterChip } from '../../../components/FilterChip/FilterChip';
import { BulkBar } from '../../../components/BulkBar/BulkBar';
import { Checkbox } from '../../../components/ShadcnCheckbox/ShadcnCheckbox';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Toggle } from '../../../components/Toggle/Toggle';
import { SearchBar } from '../../../components/SearchBar/SearchBar';
import boneStyles from '../../../components/TableSkeleton/TableSkeleton.module.css';
import listStyles from '../MessagesView.module.css';
import { formatTime } from '../messageUtils';
import { CHANNEL_META, initialsOf, isMissedCall } from './commsUtils';
import { CommsListEmpty } from './CommsEmptyState';
import { CommsListHeader } from './CommsListHeader';
import { updateConversation, markConversationRead } from './commsRepo';
import styles from './Comms.module.css';

const CHANNEL_FILTER = { Chat: 'chat', SMS: 'sms', Calls: 'call', Email: 'email' };
const ACTIVITY_FILTER = { Today: 1, 'Last 7 days': 7, 'Last 30 days': 30 };

/**
 * The middle column of Comms for Chat / SMS / Calls / All: the header
 * (collapse the nav, title and count, search, bulk select, filter), tabs,
 * and the conversations.
 */
export function CommsListPanel({
  channel,
  viewKey,
  title,
  showArchived = false,
  conversations,
  loading,
  selectedId,
  onSelect,
  footer,
  navCollapsed,
  onToggleNav,
}) {
  const meta = { ...CHANNEL_META[channel], ...(title ? { title } : {}) };
  const [tab, setTab] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [channels, setChannels] = useState([]);
  const [activity, setActivity] = useState([]);
  // The cutoff is fixed when the filter is picked, not recomputed each render.
  const [activityCutoff, setActivityCutoff] = useState(0);
  const [bulk, setBulk] = useState(false);
  const [picked, setPicked] = useState([]);
  const mixed = channel === 'all';

  const tabs = channel === 'call'
    ? [{ key: 'all', label: 'All' }, { key: 'unanswered', label: 'Unanswered' }, { key: 'pinned', label: 'Pinned' }]
    : [{ key: 'all', label: 'All' }, { key: 'unread', label: 'Unread' }, { key: 'pinned', label: 'Pinned' }];

  const q = query.trim().toLowerCase();
  const list = conversations.filter((c) => {
    if (!!c.archived !== showArchived) return false;
    if (tab === 'unread' && !c.unread_count) return false;
    if (tab === 'unanswered' && !isMissedCall(c)) return false;
    if (tab === 'pinned' && !c.pinned) return false;
    if (channels.length && !channels.some(k => CHANNEL_FILTER[k] === c.channel)) return false;
    if (activityCutoff && new Date(c.last_message_at).getTime() < activityCutoff) return false;
    if (!q) return true;
    return `${c.patient_name} ${c.group_name || ''} ${c.last_preview} ${c.patient_phone || ''}`.toLowerCase().includes(q);
  });

  const unread = conversations.filter(c => !!c.archived === showArchived && c.unread_count > 0).length;
  const missed = conversations.filter(c => !!c.archived === showArchived && isMissedCall(c)).length;
  const sub = channel === 'call'
    ? (missed ? `${missed} Missed Call${missed === 1 ? '' : 's'}` : '')
    : (unread ? `${unread} unread ${meta.noun}${unread === 1 || meta.noun === 'SMS' ? '' : 's'}` : '');

  return (
    <div className={listStyles.convPanel}>
      <CommsListHeader
        title={meta.title}
        sub={sub}
        navCollapsed={navCollapsed}
        onToggleNav={onToggleNav}
        searchActive={searchOpen}
        onSearch={() => { setSearchOpen(v => !v); setQuery(''); }}
        bulkActive={bulk}
        onBulk={() => { setBulk(v => !v); setPicked([]); }}
        filterActive={filterOpen || channels.length > 0 || activity.length > 0}
        onFilter={() => setFilterOpen(v => !v)}
      />

      <div className={listStyles.convTabs}>
        <Toggle items={tabs} active={tab} onChange={setTab} size="S" />
      </div>

      {filterOpen && (
        <div className={styles.filterRow}>
          {mixed && <FilterChip label="Channel" options={Object.keys(CHANNEL_FILTER)} selected={channels} onChange={setChannels} />}
          <FilterChip label="Last Activity" singleSelect options={Object.keys(ACTIVITY_FILTER)} selected={activity} onChange={(v) => { setActivity(v); setActivityCutoff(v.length ? Date.now() - ACTIVITY_FILTER[v[0]] * 86400000 : 0); }} />
        </div>
      )}

      {searchOpen && (
        <div className={styles.listSearch}>
          <SearchBar
            placeholder={`Search ${meta.title.toLowerCase()}`}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onClose={() => { setSearchOpen(false); setQuery(''); }}
          />
        </div>
      )}

      <div className={listStyles.convList}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={listStyles.convItem} aria-hidden>
              <span className={`${boneStyles.bone} ${styles.boneAvatar}`} />
              <div className={listStyles.convInfo}>
                <span className={`${boneStyles.bone} ${styles.boneLine}`} />
                <span className={`${boneStyles.bone} ${styles.boneLineShort}`} />
              </div>
            </div>
          ))
        ) : list.length === 0 ? (
          <CommsListEmpty
            viewKey={viewKey}
            label={q ? 'No conversations match your search' : tab === 'all' ? undefined : `No ${tabs.find(t => t.key === tab)?.label} Conversations`}
          />
        ) : list.map(c => (
          <button
            type="button"
            key={c.id}
            aria-current={selectedId === c.id ? 'true' : undefined}
            className={[listStyles.convItem, selectedId === c.id ? listStyles.selected : ''].join(' ')}
            onClick={() => (bulk
              ? setPicked(p => (p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id]))
              : onSelect(c))}
          >
            {bulk && (
              <span className={styles.rowCheck}>
                <Checkbox checked={picked.includes(c.id)} tabIndex={-1} aria-label={`Select ${c.patient_name}`} />
              </span>
            )}
            {c.channel === 'call' ? (
              <span className={[styles.callAvatar, isMissedCall(c) ? styles.callAvatarMissed : ''].join(' ')}>
                <Icon name={isMissedCall(c) ? 'solar:end-call-rounded-linear' : 'solar:phone-calling-linear'} size={18} />
              </span>
            ) : (
              <Avatar variant="patient" size={36} initials={initialsOf(c.patient_name)} />
            )}
            <div className={listStyles.convInfo}>
              <div className={listStyles.convNameRow}>
                <div className={[listStyles.convName, c.unread_count ? '' : listStyles.muted].join(' ')}>
                  {c.patient_name || 'Unknown'}
                </div>
                {channel === 'all' && <Icon name={CHANNEL_META[c.channel]?.icon} size={12} color="var(--neutral-300)" />}
                <div className={listStyles.convTime}>{formatTime(c.last_message_at)}</div>
              </div>
              <div className={listStyles.convPreviewRow}>
                <div className={[listStyles.convPreview, isMissedCall(c) ? styles.previewMissed : ''].join(' ')}>
                  {c.last_preview || (c.subject ? c.subject : 'No messages yet')}
                </div>
                {c.unread_count > 0 && <span className={listStyles.convUnread}>{c.unread_count}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>

      {footer}

      {bulk && (
        <BulkBar
          selectedIds={picked}
          onClear={() => setPicked([])}
          noun={picked.length === 1 ? 'Conversation' : 'Conversations'}
          actions={[
            { label: 'Mark as Read', icon: 'solar:check-read-linear', variant: 'secondary', onClick: (ids) => { ids.forEach(id => markConversationRead(conversations.find(c => c.id === id))); setPicked([]); } },
            { label: 'Pin', icon: 'solar:pin-linear', variant: 'secondary', onClick: (ids) => { ids.forEach(id => updateConversation(id, { pinned: true })); setPicked([]); } },
            { label: showArchived ? 'Unarchive' : 'Archive', icon: 'solar:archive-linear', variant: 'primary', onClick: (ids) => { ids.forEach(id => updateConversation(id, { archived: !showArchived })); setPicked([]); } },
          ]}
        />
      )}
    </div>
  );
}
