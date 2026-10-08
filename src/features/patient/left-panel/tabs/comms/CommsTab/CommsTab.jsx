import { Icon } from '../../../../../../components/Icon/Icon';
import { SmsIcon } from '../../../../../../components/Icon/SmsIcon';
import { MissedCallIcon } from '../../../../../../components/Icon/MissedCallIcon';
import { Avatar } from '../../../../../../components/Avatar/Avatar';
import { Badge } from '../../../../../../components/Badge/Badge';
import { useAppStore } from '../../../../../../store/useAppStore';
import { useCommsConversations } from '../../../../../messages/comms/useComms';
import { CommsListEmpty } from '../../../../../messages/comms/CommsEmptyState';
import { isMissedCall } from '../../../../../messages/comms/commsUtils';
import { formatTime } from '../../../../../messages/messageUtils';
import msgStyles from '../../../../../messages/MessagesView.module.css';

function ConvAvatar({ conversation }) {
  const missed = isMissedCall(conversation);
  const icon =
    missed ? <MissedCallIcon size={20} color="var(--status-error)" /> :
    conversation.channel === 'sms' ? <SmsIcon size={20} color="var(--primary-300)" /> :
    conversation.channel === 'call' ? <Icon name="solar:phone-calling-linear" size={20} color="var(--primary-300)" /> :
    conversation.channel === 'email' ? <Icon name="solar:letter-linear" size={20} color="var(--primary-300)" /> :
    <Icon name="solar:users-group-rounded-linear" size={20} color="var(--primary-300)" />;

  return (
    <Avatar
      variant="generic"
      size="36px"
      backgroundColor={missed ? 'var(--status-error-light)' : 'var(--primary-50)'}
      borderColor={missed ? 'color-mix(in srgb, var(--status-error) 30%, transparent)' : 'var(--primary-200)'}
      icon={icon}
    />
  );
}

/**
 * The patient's conversations on every channel (Comms), newest first.
 * Opening one goes to it in Comms.
 */
export function CommsTab({ patient }) {
  const { conversations, loading } = useCommsConversations();
  const goToComms = useAppStore(s => s.goToComms);

  const id = patient?.id != null ? String(patient.id) : null;
  const mine = conversations.filter(c => (id && c.patient_id === id) || (!c.patient_id && patient?.name && c.patient_name === patient.name));

  if (!loading && mine.length === 0) return <CommsListEmpty viewKey="all" />;

  return (
    <div className={msgStyles.convList}>
      {mine.map(c => (
        <button
          type="button"
          key={c.id}
          className={msgStyles.convItem}
          onClick={() => goToComms({ channel: c.channel, conversationId: c.id })}
        >
          <ConvAvatar conversation={c} />
          <div className={msgStyles.convInfo}>
            <div className={msgStyles.convNameRow}>
              <div className={[msgStyles.convName, c.unread_count ? '' : msgStyles.muted].join(' ')}>
                {c.channel === 'chat' ? (c.group_name || `Care for ${c.patient_name}`) : c.channel === 'email' ? (c.subject || 'Email') : c.patient_name}
              </div>
              <div className={msgStyles.convTime}>{formatTime(c.last_message_at)}</div>
            </div>
            <div className={msgStyles.convPreviewRow}>
              <div className={msgStyles.convPreview}>{c.last_preview || 'No messages yet'}</div>
              {c.unread_count > 0 && <Badge variant="notification" label={c.unread_count} />}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
