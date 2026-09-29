import { useMemo } from 'react';
import { WorklistShell } from '../../components/WorklistShell/WorklistShell';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Icon } from '../../components/Icon/Icon';
import { canDelete, canEdit, formatDateTime, initialsOf, oooStatus, recordsOnDate, STATUS_TONE } from './oooUtils';
import styles from './OooRecordsTable.module.css';

const USER_COL = { key: 'user', label: 'User Name', sticky: 'left', left: 0, width: 260 };
const COLUMNS = [
  // Dates and Status are fixed; Reason takes the rest of the row.
  { key: 'dates', label: 'Dates', width: 200 },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status', width: 120 },
  { key: 'actions', label: 'Actions', sticky: 'right', width: 96 },
];

/**
 * Out of Office records in the shared WorklistShell table: Dates, Reason,
 * Status and Actions, with a sticky User Name column when it lists several
 * users. Past records are read-only; an ongoing one can be edited but not
 * deleted.
 *
 * @param {object}   props
 * @param {object[]} props.records
 * @param {boolean}  [props.showUser]      – Add the User Name column
 * @param {string}   [props.highlightDate] – ISO date; rows out that day are tinted and outlined
 * @param {boolean}  [props.loading]
 * @param {React.ReactNode} [props.emptyState]
 * @param {boolean}  [props.embedded]      – Grow with the content inside a scrolling parent
 * @param {object}   [props.pagination]    – { page, perPage, totalItems, onPageChange, onPageSizeChange }
 * @param {function} props.onEdit          – (record) => void
 * @param {function} props.onDelete        – (record) => void
 */
export function OooRecordsTable({ records, showUser = false, highlightDate, loading, emptyState, embedded = false, pagination, onEdit, onDelete }) {
  const columns = useMemo(() => (showUser ? [USER_COL, ...COLUMNS] : COLUMNS), [showUser]);
  const highlighted = new Set(highlightDate ? recordsOnDate(records, highlightDate).map(r => r.id) : []);
  const now = new Date();

  const renderRow = (r) => {
    const status = oooStatus(r, now);
    const editable = canEdit(r, now);
    const deletable = canDelete(r, now);
    return (
      <tr key={r.id} className={[styles.row, highlighted.has(r.id) ? styles.rowHighlight : ''].filter(Boolean).join(' ')}>
        {showUser && (
          <td className={`${styles.membersTd} ${styles.stickyLeft}`} style={{ left: 0 }}>
            <span className={styles.userCell}>
              <Avatar variant="staff" size="M" initials={initialsOf(r.userName)} ooo={null} />
              <span className={styles.userText}>
                <span className={styles.userName}>{r.userName}</span>
                {r.userEmail && <span className={styles.userSub}>{r.userEmail}</span>}
              </span>
            </span>
          </td>
        )}
        <td className={`${styles.td} ${styles.dates}`}>
          {formatDateTime(r.startAt)} -
          <br />
          {formatDateTime(r.endAt)}
        </td>
        <td className={`${styles.td} ${styles.reason}`}>{r.reason || '–'}</td>
        <td className={styles.td}><Badge tone={STATUS_TONE[status]} size="M" label={status} /></td>
        <td className={`${styles.td} ${styles.stickyRight}`}>
          <span className={styles.actionsCell}>
            {/* Solar's pen fills its whole frame, so at the trash's 20px it
                looks bigger; 16px matches the trash glyph. */}
            <ActionButton
              size="L"
              tooltip={editable ? 'Edit' : 'Past records can\'t be edited'}
              state={editable ? 'active' : 'disabled'}
              aria-label="Edit Out of Office record"
              onClick={() => editable && onEdit(r)}
            >
              <Icon name="solar:pen-linear" size={16} color={editable ? 'var(--neutral-300)' : 'var(--neutral-150)'} />
            </ActionButton>
            <span className={styles.actionDivider} aria-hidden="true" />
            <ActionButton
              icon="solar:trash-bin-minimalistic-linear"
              size="L"
              tooltip={deletable ? 'Delete' : status === 'Ongoing' ? 'An ongoing record can\'t be deleted' : 'Past records can\'t be deleted'}
              tooltipLeft
              state={deletable ? 'active' : 'disabled'}
              aria-label="Delete Out of Office record"
              onClick={() => deletable && onDelete(r)}
            />
          </span>
        </td>
      </tr>
    );
  };

  return (
    // The wrapper only sets the first column's left inset (header and cells).
    <div className={embedded ? styles.wrapEmbedded : styles.wrap}>
    <WorklistShell
      header={null}
      columns={columns}
      rows={records}
      renderRow={renderRow}
      loading={loading}
      emptyState={emptyState}
      embedded={embedded}
      minTableWidth={showUser ? 900 : 560}
      page={pagination?.page}
      perPage={pagination?.perPage}
      totalItems={pagination?.totalItems}
      onPageChange={pagination?.onPageChange}
      onPageSizeChange={pagination?.onPageSizeChange}
    />
    </div>
  );
}
