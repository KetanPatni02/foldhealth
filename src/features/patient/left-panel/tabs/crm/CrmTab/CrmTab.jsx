import { useEffect, useMemo, useState } from 'react';
import { ActivityLog } from '../../../../../../components/ActivityLog/ActivityLog';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { Avatar } from '../../../../../../components/Avatar/Avatar';
import { Icon } from '../../../../../../components/Icon/Icon';
import { SubTabs } from '../../../../../../components/SubTabs/SubTabs';
import { TimelineSkeleton } from '../../../../../../components/TimelineSkeleton/TimelineSkeleton';
import { useAppStore } from '../../../../../../store/useAppStore';
import { CRM_CHANNELS, CRM_STATUS_COLOR } from '../../../../data/crmActivity';
import styles from './CrmTab.module.css';

const EMPTY = [];

// All, then a tab per communication channel, each with its colour dot.
const FILTER_TABS = [
  { key: 'all', label: 'All' },
  ...Object.entries(CRM_CHANNELS)
    .filter(([, c]) => c.filter)
    .map(([key, c]) => ({
      key,
      label: (
        <span className={styles.tabLabel}>
          <span className={styles.dot} style={{ background: c.color }} aria-hidden="true" />
          {c.label}
        </span>
      ),
    })),
];

const pad = (n) => String(n).padStart(2, '0');
const monthLabel = (d) => d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

/** The channel's icon on its own tint, the rail tile Figma shows. */
function ChannelTile({ channel }) {
  const c = CRM_CHANNELS[channel] || CRM_CHANNELS.chat;
  return (
    <Avatar
      variant="icon"
      size={24}
      backgroundColor={c.tint}
      borderColor={c.color}
      icon={<Icon name={c.icon} size={14} color={c.color} />}
    />
  );
}

/** Activity → ActivityLog entries, newest first, with a header per month. */
function toEntries(list) {
  const out = [];
  let month = null;
  [...list]
    .sort((a, b) => (b.occurredAt || '').localeCompare(a.occurredAt || ''))
    .forEach((a) => {
      const d = new Date(a.occurredAt);
      const label = monthLabel(d);
      if (label !== month) { out.push({ t: 'group', label }); month = label; }
      out.push({
        // The outreach body is a meta line, a title and a coloured outcome,
        // with View more for a note: what every CRM entry needs.
        t: 'outreach',
        avatar: <ChannelTile channel={a.channel} />,
        date: `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
        time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        by: a.performedBy,
        title: a.title,
        outcome: a.status || undefined,
        outcomeColor: CRM_STATUS_COLOR[a.status],
        note: a.note,
      });
    });
  return out;
}

/**
 * CRM Activity (Figma P360 Revamp 727:261699): every communication with the
 * patient, newest first by month, on the shared ActivityLog. Tabs narrow it
 * to one channel (Chat, Call, Email, SMS, eFax); visits, assessments and
 * tasks show under All.
 *
 * @param {string} props.patientId
 */
export function CrmTab({ patientId }) {
  const activities = useAppStore(s => (patientId ? s.patientCrmActivities[patientId] : null)) || EMPTY;
  const loadedFor = useAppStore(s => (patientId ? s.patientCrmActivitiesLoadedFor[patientId] : false));
  const fetchPatientCrmActivities = useAppStore(s => s.fetchPatientCrmActivities);
  const [channel, setChannel] = useState('all');

  useEffect(() => {
    if (patientId) fetchPatientCrmActivities(patientId);
  }, [patientId, fetchPatientCrmActivities]);

  const entries = useMemo(
    () => toEntries(channel === 'all' ? activities : activities.filter(a => a.channel === channel)),
    [activities, channel],
  );
  const loading = !!patientId && !loadedFor;
  const channelLabel = CRM_CHANNELS[channel]?.label;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <SubTabs tabs={FILTER_TABS} activeKey={channel} onChange={setChannel} />
        <ActionButton icon="custom:filter" size="S" tooltip="Filter" tooltipLeft />
      </div>
      {loading
        ? <TimelineSkeleton rows={5} />
        : (
          <ActivityLog
            entries={entries}
            emptyLabel={channelLabel ? `No ${channelLabel} activity yet.` : 'No communication recorded yet.'}
          />
        )}
    </div>
  );
}
