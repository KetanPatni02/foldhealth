import { Select } from '../../../components/Select/Select';
import { Link } from '../../../components/Link/Link';
import { AddIconMinimalist } from '../../../components/Icon/AddIconMinimalist';
import styles from './CommsDrawers.module.css';

const onKey = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };

/**
 * Send To made voluntary: closed, it's a grey "+ Add member contacts" link and the
 * message goes to the member alone; opened, it's the Recipients picker with
 * the member already in it, and "Remove" goes back to the member alone.
 * Everything but open/onOpen/onRemove is passed to the Select.
 *
 * @param {boolean}  props.open
 * @param {() => void} props.onOpen
 * @param {() => void} props.onRemove  – put the pick back to the member and close
 */
export function OptInRecipients({ open, onOpen, onRemove, ...select }) {
  if (!open) {
    return (
      <span className={styles.addContacts}>
        <Link variant="secondary" className={styles.addContactsLink} role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKey(onOpen)}>
          <AddIconMinimalist size={12} color="currentColor" />
          Add member contacts
        </Link>
      </span>
    );
  }
  return (
    <Select
      defaultOpen
      labelAction={(
        <Link variant="secondary" className={styles.removeLink} role="button" tabIndex={0} onClick={onRemove} onKeyDown={onKey(onRemove)}>
          Remove
        </Link>
      )}
      label="Recipients"
      required
      multiple
      checkboxes
      badges
      searchable
      searchPlaceholder="Search by name"
      {...select}
    />
  );
}
