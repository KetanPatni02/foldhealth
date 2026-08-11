import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../../../../../../components/Icon/Icon';
import { DownChevronIcon } from '../../../../../../components/Icon/DownChevronIcon';
import { SmsIcon } from '../../../../../../components/Icon/SmsIcon';
import { TYPE_OPTIONS } from './OutreachTab.utils';
import styles from './OutreachTab.module.css';

export function FieldDropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <div ref={triggerRef} className={styles.fieldDropdownWrap}>
      <button
        type="button"
        className={`${styles.fieldDropdownTrigger} ${!value ? styles.fieldDropdownPlaceholder : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className={styles.fieldDropdownValue}>{value || placeholder}</span>
        <DownChevronIcon size={12} color="var(--neutral-300)" />
      </button>

      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div
            className={styles.fieldDropdownMenu}
            style={{ top: rect ? rect.bottom + 4 : 0, left: rect ? rect.left : 0, minWidth: rect ? rect.width : 160 }}
            onClick={e => e.stopPropagation()}
          >
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                className={`${styles.fieldDropdownItem} ${value === opt ? styles.fieldDropdownItemSelected : ''}`}
                onClick={() => { onChange(opt); setOpen(false); }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function TypeDropdown({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const selected = TYPE_OPTIONS.find(o => o.label === value) || TYPE_OPTIONS[0];
  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <div ref={triggerRef} className={styles.typeDropdownWrap}>
      <button
        type="button"
        className={`${styles.typeDropdownTrigger} ${disabled ? styles.typeDropdownTriggerDisabled : ''}`}
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
      >
        {selected.isSms
          ? <SmsIcon size={14} color="var(--neutral-400)" />
          : <Icon name={selected.icon} size={14} color="var(--neutral-400)"
              style={selected.flip ? { transform: 'scaleX(-1)' } : undefined} />
        }
        <span className={styles.typeDropdownValue}>{selected.label}</span>
        <DownChevronIcon size={12} color="var(--neutral-300)" />
      </button>

      {open && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)}>
          <div
            className={styles.typeDropdownMenu}
            style={{ top: rect ? rect.bottom + 4 : 0, left: rect ? rect.left : 0 }}
            onClick={e => e.stopPropagation()}
          >
            {TYPE_OPTIONS.map(opt => {
              const isSelected = value === opt.label;
              const iconColor = isSelected ? 'var(--primary-300)' : 'var(--neutral-400)';
              return (
                <button
                  key={opt.label}
                  type="button"
                  className={`${styles.typeDropdownItem} ${isSelected ? styles.typeDropdownItemSelected : ''}`}
                  onClick={() => { onChange(opt.label); setOpen(false); }}
                >
                  {opt.isSms
                    ? <SmsIcon size={14} color={iconColor} />
                    : <Icon name={opt.icon} size={14} color={iconColor}
                        style={opt.flip ? { transform: 'scaleX(-1)' } : undefined} />
                  }
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
