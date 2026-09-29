import { useMemo } from 'react';
import { Drawer } from '../../components/Drawer/Drawer';
import { Avatar } from '../../components/Avatar/Avatar';
import { useAppStore } from '../../store/useAppStore';
import { NewButton, RecordsBody } from './OooRecordsParts';
import { useOooRecords } from './useOooRecords';
import { useOooRecordActions } from './useOooRecordActions';
import { useAllOooRecords } from './useAllOooRecords';
import { initialsOf, recordsFor, sortRecords } from './oooUtils';
import styles from './ooo.module.css';

/**
 * Preferences → Out of Office: the signed-in user's own records
 * (Figma Eventus 17406:144193 empty, 17406:144716 with a record).
 */
export function OooPreferencesSection() {
  const me = useAppStore(s => s.currentUserProfile);
  const { records, loading } = useOooRecords();
  const mine = useMemo(() => sortRecords(recordsFor(records, me?.name)), [records, me?.name]);
  const actions = useOooRecordActions({ user: me ? { id: me.id, name: me.name, email: me.email } : undefined });
  return (
    <>
      <div className={styles.prefHeader}>
        <h3 className={styles.prefTitle}>Out of Office Records</h3>
        <span className={styles.prefTools}>
          <NewButton onClick={actions.openNew} />
        </span>
      </div>
      <div className={styles.prefBody}>
        <RecordsBody loading={loading || !me} records={mine} emptyLabel="No Out of Office Records for this user" actions={actions} />
      </div>
      {actions.elements}
    </>
  );
}

/**
 * One user's records, opened from Settings → Calendar → User availability
 * or Settings → Account → Users (Figma Eventus 17386:130583).
 *
 * @param {object}   props
 * @param {object}   props.user – { id?, name, email?, role? }
 * @param {function} props.onClose
 */
export function OooUserRecordsDrawer({ user, onClose }) {
  const { records, loading } = useOooRecords();
  const theirs = useMemo(() => sortRecords(recordsFor(records, user.name)), [records, user.name]);
  const actions = useOooRecordActions({ user });
  return (
    <Drawer
      title="Out of Office Records"
      width={640}
      onClose={onClose}
      noCloseDivider
      headerRight={<><NewButton onClick={actions.openNew} /><span className={styles.headerDivider} aria-hidden="true" /></>}
    >
      <div className={styles.drawerBody}>
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>For Provider:</span>
          <div className={styles.providerCard}>
            <Avatar variant="staff" size="M" initials={initialsOf(user.name)} userName={user.name} />
            <span className={styles.userText}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userSub}>{user.role || user.email || 'Provider'}</span>
            </span>
          </div>
        </div>
        <RecordsBody loading={loading} records={theirs} emptyLabel="No Out of Office Records for this user" actions={actions} />
      </div>
      {actions.elements}
    </Drawer>
  );
}

/**
 * Everyone's records in a drawer, from a month-view "Providers Out of
 * Office" link, with that day's records highlighted (Figma Eventus
 * 17507:108921). Settings → Calendar → OOO Records shows the same list.
 *
 * @param {object}   props
 * @param {string}   [props.highlightDate] – ISO date
 * @param {function} props.onClose
 */
export function OooAllRecordsDrawer({ highlightDate, onClose }) {
  const all = useAllOooRecords({ highlightDate });
  return (
    <Drawer
      title="Out of Office Records"
      width={1100}
      onClose={onClose}
      headerRight={<>{all.tools}<span className={styles.headerDivider} aria-hidden="true" /></>}
      banner={all.filterRow || undefined}
      noCloseDivider
      bodyClassName={styles.flushBody}
    >
      {all.body}
      {all.elements}
    </Drawer>
  );
}
