import { Icon } from '../../../../components/Icon/Icon';
import { Avatar } from '../../../../components/Avatar/Avatar';
import { ActionButton } from '../../../../components/ActionButton/ActionButton';
import styles from './UserProfileBanner.module.css';

/**
 * UserProfileBanner — the warm-gradient header used by the View + Edit user
 * drawers. Renders the avatar, name (with a verified check when active),
 * email, and the Call / Chat / Meet / More action cluster on the right.
 *
 * Callers own the action handlers so the same banner can drive different
 * side effects from each drawer.
 *
 * Props
 * -----
 *  - user     { initials, name, email, status } — display data.
 *  - onCall / onChat / onMeet / onMore  — optional click handlers per action.
 */
export function UserProfileBanner({ user, onCall, onChat, onMeet, onMore }) {
  const isActive = user.status === 'Active';
  return (
    <div className={styles.banner}>
      <Avatar variant="staff" size="L" initials={user.initials} />
      <div className={styles.info}>
        <div className={styles.name}>
          {user.name}
          {isActive && <Icon name="solar:verified-check-bold" size={16} color="#009B53" />}
        </div>
        <span className={styles.email}>{user.email}</span>
      </div>
      <div className={styles.actions}>
        <div className={styles.actionItem}>
          <ActionButton icon="solar:phone-calling-rounded-linear" size="L" tooltip="Call" onClick={onCall} />
          <span className={styles.actionLabel}>Call</span>
        </div>
        <span className={styles.divider} />
        <div className={styles.actionItem}>
          <ActionButton icon="solar:chat-round-line-linear" size="L" tooltip="Chat" onClick={onChat} />
          <span className={styles.actionLabel}>Chat</span>
        </div>
        <span className={styles.divider} />
        <div className={styles.actionItem}>
          <ActionButton icon="solar:videocamera-record-linear" size="L" tooltip="Meet" onClick={onMeet} />
          <span className={styles.actionLabel}>Meet</span>
        </div>
        <span className={styles.divider} />
        <ActionButton icon="solar:menu-dots-bold" size="L" tooltip="More" onClick={onMore} />
      </div>
    </div>
  );
}
