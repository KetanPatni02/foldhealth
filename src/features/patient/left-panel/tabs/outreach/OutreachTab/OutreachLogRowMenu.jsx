import { useRef, useState } from 'react';
import { ActionButton } from '../../../../../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../../../../../components/MenuPopover/MenuPopover';
import styles from './OutreachTab.module.css';

/**
 * An outreach log's overflow menu: Edit / Delete, then any `extraActions`
 * the host adds ([{ key, label, icon, onSelect(log) }], e.g. Download PDF).
 */
export function LogRowMenu({ log, onEdit, onDelete, extraActions = [] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  // A locked call (e.g. a pharmacy verification) is one fixed record: it
  // keeps only the host's extra actions.
  const editable = !log.locked;
  const items = [
    ...(onEdit && editable ? [{ key: 'edit', icon: 'solar:pen-2-linear', label: 'Edit' }] : []),
    ...extraActions.map(a => ({ key: a.key, icon: a.icon, label: a.label })),
    ...(onDelete && editable ? [{ key: 'delete', icon: 'solar:trash-bin-trash-linear', label: 'Delete', danger: true }] : []),
  ];
  if (!items.length) return null;
  return (
    <span className={styles.logRowMenuWrap}>
      <ActionButton
        ref={btnRef}
        icon="solar:menu-dots-linear"
        size="sm"
        tooltip="More actions"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
      />
      {open && (
        <MenuPopover
          anchorRef={btnRef}
          items={items}
          onSelect={(key) => {
            const extra = extraActions.find(a => a.key === key);
            if (extra) extra.onSelect(log);
            else if (key === 'edit') onEdit(log);
            else onDelete(log);
          }}
          onClose={() => setOpen(false)}
          width={extraActions.length ? 'auto' : 140}
          ariaLabel="Log actions"
        />
      )}
    </span>
  );
}
