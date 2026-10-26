import { useState } from 'react';
import { ActionButton } from '../../../../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../../../../components/MenuPopover/MenuPopover';
import { ProfileTable } from '../../../../../components/ProfileTable/ProfileTable';
import { profileCellClass, profileRowClass } from '../../../../../components/ProfileTable/profileTableClasses';
import { Checkbox } from '../../../../../components/ShadcnCheckbox/ShadcnCheckbox';
import styles from './DocumentsTab.module.css';

const COLUMNS = [
  { key: 'select', label: '', showCheckbox: true, width: 36 },
  { key: 'name', label: 'File Name' },
  { key: 'type', label: 'File Type', width: 130 },
  { key: 'updated', label: 'Last Updated', width: 170 },
  { key: 'actions', label: '', width: 116 },
];

const MENU_ITEMS = [
  { key: 'update', label: 'Update', icon: 'solar:pen-linear' },
  { key: 'efax', label: 'Send eFax', icon: 'solar:printer-linear', disabled: true, hint: 'Coming soon' },
  { key: 'email', label: 'Send Email', icon: 'solar:letter-linear' },
  { divider: true },
  { key: 'delete', label: 'Delete', icon: 'solar:trash-bin-trash-linear', danger: true },
];

function RowMenu({ doc, onAction }) {
  const [rect, setRect] = useState(null);
  return (
    <>
      <ActionButton
        icon="solar:menu-dots-linear"
        size="S"
        tooltip="More"
        tooltipLeft
        aria-label={`Actions for ${doc.name}`}
        onClick={e => setRect(e.currentTarget.getBoundingClientRect())}
      />
      {rect && (
        <MenuPopover
          anchorRect={rect}
          align="right"
          width={160}
          ariaLabel={`${doc.name} actions`}
          items={MENU_ITEMS}
          onSelect={(key) => { setRect(null); onAction(key, doc); }}
          onClose={() => setRect(null)}
        />
      )}
    </>
  );
}

const hasFile = d => !!(d.fileUrl || d.file);

/** File Name | File Type | Last Updated, with View, Download and a menu on row hover. */
export function DocumentsTable({ rows, selectedIds, onToggle, onToggleAll, onOpen, onDownload, onAction, emptyLabel }) {
  const selected = new Set(selectedIds);
  return (
    <ProfileTable
      columns={COLUMNS}
      rows={rows}
      selectedIds={selectedIds}
      onSelectAll={onToggleAll}
      emptyState={<span className={styles.muted}>{emptyLabel}</span>}
      renderRow={d => (
        <tr key={d.id} className={`${profileRowClass} ${styles.row}`} onClick={() => onOpen(d)}>
          <td className={`${profileCellClass} ${styles.checkCell}`} onClick={e => e.stopPropagation()}>
            <Checkbox checked={selected.has(d.id)} onCheckedChange={() => onToggle(d.id)} aria-label={`Select ${d.name}`} />
          </td>
          <td className={`${profileCellClass} ${styles.fileName}`} title={d.name}>{d.name}</td>
          <td className={`${profileCellClass} ${styles.muted}`}>{d.type || '-'}</td>
          <td className={profileCellClass}>
            <span className={styles.updated}>
              <span className={styles.muted}>{d.updatedBy || '-'}</span>
              <span className={styles.updatedDate}>{d.updatedDate}</span>
            </span>
          </td>
          <td className={profileCellClass} onClick={e => e.stopPropagation()}>
            <span className={styles.rowActions}>
              <ActionButton icon="solar:eye-linear" size="S" tooltip="View" tooltipLeft onClick={() => onOpen(d)} />
              <span className={styles.divider} aria-hidden="true" />
              <ActionButton icon="solar:download-minimalistic-linear" size="S" tooltip="Download" tooltipLeft disabled={!hasFile(d)} onClick={() => onDownload(d)} />
              <span className={styles.divider} aria-hidden="true" />
              <RowMenu doc={d} onAction={onAction} />
            </span>
          </td>
        </tr>
      )}
    />
  );
}
