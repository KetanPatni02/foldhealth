import { Icon } from '../../../components/Icon/Icon';
import { SmsIcon } from '../../../components/Icon/SmsIcon';
import { MissedCallIcon } from '../../../components/Icon/MissedCallIcon';
import { Avatar } from '../../../components/Avatar/Avatar';
import { Badge } from '../../../components/Badge/Badge';
import msgStyles from '../../messages/MessagesView.module.css';
import styles from './CommsTab.module.css';

const CONVERSATIONS = [
  {
    id: 1, type: 'group', name: 'Care for Annette Brave',
    preview: [{ text: '@Rio', highlight: true }, { text: ' he is having some stomach aches lately.' }],
    time: 'Now', unread: 3,
  },
  {
    id: 2, type: 'chat', name: 'Dr. Robert Langdon',
    preview: [{ text: "You: Sure thing, I'll have a look today. They're looking great!" }],
    time: 'Now', unread: 2,
  },
  {
    id: 3, type: 'chat', name: 'Juanita Douglas Jr.',
    preview: [{ text: '@Rio', highlight: true }, { text: ' absolutely. Have a read of this and we can talk more in our session.' }],
    time: '12:30pm', unread: 2,
  },
  {
    id: 4, type: 'sms', name: 'Kristen Fay',
    preview: [{ text: "Patient's appointment booked successful" }],
    time: 'Saturday', unread: 1,
  },
  {
    id: 5, type: 'missed', name: 'Dr. Robert Langdon',
    preview: [{ text: 'Missed Call' }],
    time: 'Friday', unread: 0,
  },
  {
    id: 6, type: 'missed', name: 'Dr. Robert Langdon',
    preview: [{ text: 'Missed Call' }],
    time: 'Friday', unread: 0,
  },
  {
    id: 7, type: 'missed', name: 'Dr. Robert Langdon',
    preview: [{ text: 'Missed Call' }],
    time: 'Friday', unread: 0,
  },
];

function ConvAvatar({ type }) {
  const isMissed = type === 'missed';
  const backgroundColor = isMissed ? 'var(--status-error-light)' : 'var(--primary-50)';
  const borderColor     = isMissed ? 'rgba(215, 40, 37, 0.3)'   : 'var(--primary-200)';

  const icon =
    type === 'group'  ? <Icon name="solar:users-group-rounded-linear" size={20} color="var(--primary-300)" /> :
    type === 'chat'   ? <Icon name="solar:chat-round-linear"          size={20} color="var(--primary-300)" /> :
    type === 'sms'    ? <SmsIcon    size={20} color="var(--primary-300)" /> :
    type === 'missed' ? <MissedCallIcon size={20} color="var(--status-error)" /> : null;

  return (
    <Avatar
      variant="generic"
      size="36px"
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      icon={icon}
    />
  );
}

export function CommsTab() {
  return (
    <div className={msgStyles.convList}>
      {CONVERSATIONS.map(conv => (
        <div key={conv.id} className={msgStyles.convItem}>
          <ConvAvatar type={conv.type} />
          <div className={msgStyles.convInfo}>
            <div className={msgStyles.convNameRow}>
              <div className={msgStyles.convName}>{conv.name}</div>
              <div className={msgStyles.convTime}>{conv.time}</div>
            </div>
            <div className={msgStyles.convPreviewRow}>
              <div className={msgStyles.convPreview}>
                {conv.preview.map((part, i) =>
                  part.highlight
                    ? <span key={i} className={styles.mention}>{part.text}</span>
                    : <span key={i}>{part.text}</span>
                )}
              </div>
              {conv.unread > 0 && (
                <Badge variant="notification" label={conv.unread} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
