import { useMemo } from 'react';
import { WorklistShell } from '../../components/WorklistShell/WorklistShell';
import { Avatar } from '../../components/Avatar/Avatar';
import { Badge } from '../../components/Badge/Badge';
import { ActionButton } from '../../components/ActionButton/ActionButton';
import { Icon } from '../../components/Icon/Icon';
import { useAppStore } from '../../store/useAppStore';
import { canDelete, canEdit, formatDateTime, initialsOf, oooStatus, recordsOnDate, STATUS_TONE } from './oooUtils';
import styles from './OooRecordsTable.module.css';

// In a drawer: fixed widths, dates stacked, Reason takes the rest. On the
// full page: the row shared out in proportion, with room for the dates on
// one line (the table scrolls sideways below its minimum width).
const columnsFor = (wide, showUser) => [
  ...(showUser ? [{ key: 'user', label: 'User', sticky: 'left', left: 0, width: wide ? '22%' : 280 }] : []),
  { key: 'dates', label: 'Dates', width: wide ? '30%' : 200 },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status', width: wide ? '15%' : 140 },
  { key: 'actions', label: 'Actions', sticky: 'right', width: 104 },
];

/**
 * Out of Office records in the shared WorklistShell table: Dates, Reason,
 * Status and Actions, with a sticky User column when it lists several
 * users. Past records are read-only; an ongoing one can be edited but not
 * deleted.
 *
 * @param {object}   props
 * @param {object[]} props.records
 * @param {boolean}  [props.showUser]      – Add the User column
 * @param {boolean}  [props.oneLineDates]  – Room for the dates on one line (full-page table)
 * @param {string}   [props.highlightDate] – ISO date; rows out that day are tinted and outlined
 * @param {boolean}  [props.loading]
 * @param {React.ReactNode} [props.emptyState]
 * @param {boolean}  [props.embedded]      – Grow with the content inside a scrolling parent
 * @param {object}   [props.pagination]    – { page, perPage, totalItems, onPageChange, onPageSizeChange }
 * @param {function} props.onEdit          – (record) => void
 * @param {function} props.onDelete        – (record) => void
 */
export function OooRecordsTable({ records, showUser = false, oneLineDates = false, highlightDate, loading, emptyState, embedded = false, pagination, onEdit, onDelete }) {
  const columns = useMemo(() => columnsFor(oneLineDates, showUser), [showUser, oneLineDates]);
  const highlighted = new Set(highlightDate ? recordsOnDate(records, highlightDate).map(r => r.id) : []);
  const now = new Date();
  // Records saved without an email (seeded, or picked by name) take it from
  // the staff profiles, so every row reads name over email.
  const taskProfiles = useAppStore(s => s.taskProfiles);
  const emailOf = useMemo(() => {
    const byName = new Map((taskProfiles || []).filter(p => p.email).map(p => [String(p.name || '').trim().toLowerCase(), p.email]));
    return (r) => r.userEmail || byName.get(String(r.userName || '').trim().toLowerCase()) || '';
  }, [taskProfiles]);

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
                {emailOf(r) && <span className={styles.userSub}>{emailOf(r)}</span>}
              </span>
            </span>
          </td>
        )}
        <td className={`${styles.td} ${styles.dates}`}>
          {formatDateTime(r.startAt)} -
          {oneLineDates ? ' ' : <br />}
          {formatDateTime(r.endAt)}
        </td>
        <td className={`${styles.td} ${styles.reason}`}>{r.reason || '–'}</td>
        <td className={styles.td}><Badge tone={STATUS_TONE[status]} size="M" label={status} /></td>
        <td className={`${styles.td} ${styles.stickyRight}`}>
          <span className={styles.actionsCell}>
            {/* Both glyphs at 16px (Solar's pen fills its frame, so the trash
                at the default 20px read bigger). Tooltips open leftward, as
                the column sits at the table's right edge; a disabled action
                says why. */}
            <ActionButton
              size="L"
              tooltip={editable ? 'Edit' : 'Past records can\'t be edited'}
              tooltipLeft
              state={editable ? 'active' : 'disabled'}
              aria-label="Edit Out of Office record"
              onClick={() => editable && onEdit(r)}
            >
              <Icon name="solar:pen-linear" size={16} color={editable ? 'var(--neutral-300)' : 'var(--neutral-150)'} />
            </ActionButton>
            <span className={styles.actionDivider} aria-hidden="true" />
            <ActionButton
              size="L"
              tooltip={deletable ? 'Delete' : status === 'Ongoing' ? 'Ongoing records can\'t be deleted' : 'Past records can\'t be deleted'}
              tooltipLeft
              state={deletable ? 'active' : 'disabled'}
              aria-label="Delete Out of Office record"
              onClick={() => deletable && onDelete(r)}
            >
              <Icon name="solar:trash-bin-minimalistic-linear" size={16} color={deletable ? 'var(--neutral-300)' : 'var(--neutral-150)'} />
            </ActionButton>
          </span>
        </td>
      </tr>
    );
  };

  return (
    // The wrapper only sets the first column's left inset (header and cells).
    // With no records, only the empty state shows (no column headers).
    <div className={[embedded ? styles.wrapEmbedded : styles.wrap, !loading && !records?.length ? styles.empty : ''].filter(Boolean).join(' ')}>
    <WorklistShell
      header={null}
      columns={columns}
      rows={records}
      renderRow={renderRow}
      loading={loading}
      emptyState={emptyState}
      embedded={embedded}
      minTableWidth={oneLineDates ? 1100 : showUser ? 900 : 560}
      page={pagination?.page}
      perPage={pagination?.perPage}
      totalItems={pagination?.totalItems}
      onPageChange={pagination?.onPageChange}
      onPageSizeChange={pagination?.onPageSizeChange}
    />
    </div>
  );
}
