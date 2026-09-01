import { useMemo, useState } from 'react';
import { Icon } from '../../../../../../../components/Icon/Icon';
import { ActionButton } from '../../../../../../../components/ActionButton/ActionButton';
import { WorklistShell } from '../../../../../../../components/WorklistShell/WorklistShell';
import { DownChevronIcon } from '../../../../../../../components/Icon/DownChevronIcon';
import { useTableSort } from '../../../../../../../components/HeaderCell/useTableSort';
import {
  BARRIER_COLUMNS,
  withSelectColumn,
  GbiCheckboxCell,
  LinkChip,
  GbiStatusButton,
  isClosedBarrier,
  GBI_COL_WIDTH,
} from './carePlanTableShared';
import styles from './carePlanTables.module.css';

function BarrierRow({
  barrier: b,
  bulkMode,
  selectedIds,
  canEdit,
  onToggleSelect,
  onLinkOwner,
  onStatusMenu,
  onRowMenu,
  linkCount,
}) {
  return (
    <tr key={b.id} className={`${styles.row} ${styles.barrierRow}`}>
      {bulkMode && (
        <GbiCheckboxCell
          checked={selectedIds.includes(b.id)}
          onToggle={() => onToggleSelect(b.id)}
          label={`Select ${b.title}`}
          disabled={!canEdit}
        />
      )}
      <td className={styles.barrierNameTd}>
        <div className={styles.barrierNameCell}>
          <span className={styles.barrierIcon}>
            <Icon name="custom:barrier" size={16} color="var(--neutral-400)" />
          </span>
          <span className={styles.barrierTitle}>{b.title}</span>
          <span
            className={`${styles.linkChipWrap} ${canEdit ? styles.linkChipClickable : ''}`}
            onClick={() => canEdit && onLinkOwner({ kind: 'barrier', item: b })}
          >
            <LinkChip count={linkCount(b.id)} />
          </span>
        </div>
      </td>
      <td className={styles.barrierStatusTd} onClick={e => e.stopPropagation()}>
        <GbiStatusButton
          value={b.status}
          disabled={!canEdit}
          onOpen={rect => onStatusMenu({ kind: 'barrier', item: b, rect })}
        />
      </td>
      <td className={styles.actionsTd} onClick={e => e.stopPropagation()}>
        <ActionButton
          icon="solar:menu-dots-linear"
          size="S"
          tooltip="More"
          tooltipBelow
          tooltipLeft
          disabled={!canEdit}
          onClick={(e) => onRowMenu({ kind: 'barrier-menu', item: b, rect: e.currentTarget.getBoundingClientRect() })}
        />
      </td>
    </tr>
  );
}

export function CarePlanBarriersTable({
  rows,
  canEdit,
  bulkMode,
  selectedIds,
  onSelectAll,
  onToggleSelect,
  onLinkOwner,
  onStatusMenu,
  onRowMenu,
  linkCount,
  emptyState,
}) {
  const [closedOpen, setClosedOpen] = useState(false);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(rows, 'title', 'asc');

  const { openRows, closedRows } = useMemo(() => {
    const open = [];
    const closed = [];
    for (const row of sorted) {
      if (isClosedBarrier(row.status)) closed.push(row);
      else open.push(row);
    }
    return { openRows: open, closedRows: closed };
  }, [sorted]);

  return (
    <div className={styles.tableWrap}>
      <WorklistShell
        embedded
        embeddedNoScroll
        header={null}
        hideBulkBar
        columns={withSelectColumn(BARRIER_COLUMNS, bulkMode)}
        rows={openRows}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={requestSort}
        selectedIds={selectedIds}
        onSelectAll={onSelectAll}
        minTableWidth={0}
        emptyState={openRows.length === 0 && closedRows.length === 0 ? emptyState : null}
        renderRow={(b) => (
          <BarrierRow
            barrier={b}
            bulkMode={bulkMode}
            selectedIds={selectedIds}
            canEdit={canEdit}
            onToggleSelect={onToggleSelect}
            onLinkOwner={onLinkOwner}
            onStatusMenu={onStatusMenu}
            onRowMenu={onRowMenu}
            linkCount={linkCount}
          />
        )}
      />
      {closedRows.length > 0 && (
        <div className={styles.closedBarriers}>
          <button
            type="button"
            className={styles.closedBarriersToggle}
            onClick={() => setClosedOpen(v => !v)}
            aria-expanded={closedOpen}
          >
            <DownChevronIcon
              size={6}
              color="var(--neutral-300)"
              className={`${styles.closedBarriersChevron} ${closedOpen ? '' : styles.closedBarriersChevronClosed}`}
            />
            <span className={styles.closedBarriersLabel}>Closed Barriers</span>
          </button>
          {closedOpen && (
            <table className={styles.closedBarriersTable}>
              <colgroup>
                <col />
                <col style={{ width: GBI_COL_WIDTH.status }} />
                <col style={{ width: GBI_COL_WIDTH.actions }} />
              </colgroup>
              <tbody>
                {closedRows.map(b => (
                  <BarrierRow
                    key={b.id}
                    barrier={b}
                    bulkMode={bulkMode}
                    selectedIds={selectedIds}
                    canEdit={canEdit}
                    onToggleSelect={onToggleSelect}
                    onLinkOwner={onLinkOwner}
                    onStatusMenu={onStatusMenu}
                    onRowMenu={onRowMenu}
                    linkCount={linkCount}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
