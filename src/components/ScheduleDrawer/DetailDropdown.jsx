import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import styles from './ScheduleDrawer.module.css';

export function DetailDropdown({ value, placeholder, icon, options, onSelect, renderItem }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const resolvedIcon = (() => {
    if (!value) return icon;
    const match = options.find(o => o.label === value);
    return match?.icon || icon;
  })();

  if (value) {
    return (
      <div style={{ position: 'relative' }}>
        <button ref={btnRef} className={styles.detailValue} onClick={() => setOpen(v => !v)} style={{ cursor: 'pointer' }}>
          <Icon name={resolvedIcon} size={16} color="var(--neutral-300)" /> {value}
        </button>
        {open && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
            <div className={styles.simpleDropdown} style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }} onClick={e => e.stopPropagation()}>
              {options.map(opt => (
                <button key={opt.label} className={styles.simpleDropItem} onClick={() => { onSelect(opt.label); setOpen(false); }}>
                  {renderItem ? renderItem(opt) : opt.label}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }
  return (
    <div style={{ position: 'relative' }}>
      <button ref={btnRef} className={styles.detailValuePlaceholder} onClick={() => setOpen(v => !v)}><Icon name={icon} size={16} color="var(--neutral-200)" /> {placeholder}</button>
      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div className={styles.simpleDropdown} style={{ position: 'fixed', top: btnRef.current?.getBoundingClientRect().bottom + 4, left: btnRef.current?.getBoundingClientRect().left, zIndex: 9999 }} onClick={e => e.stopPropagation()}>
            {options.map(opt => (
              <button key={opt.label} className={styles.simpleDropItem} onClick={() => { onSelect(opt.label); setOpen(false); }}>
                {renderItem ? renderItem(opt) : opt.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
