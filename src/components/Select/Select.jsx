import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './Select.module.css';

/**
 * Fold Health Select — controlled single-select dropdown that matches
 * <Input>'s design tokens (height 32, border, radius, focus ring). Used in
 * builders that need a styled dropdown without pulling in shadcn/radix.
 *
 * Props:
 *  - options    [{ value: string, label: string, disabled?: boolean }]
 *  - value      (string)
 *  - onChange   (value) => void
 *  - placeholder (string)
 *  - disabled   (boolean)
 *  - variant    'default' | 'error'
 *  - className  (string)
 *  - id         (string)        — passes through to the trigger button
 *  - menuAlign  'left' | 'right' — popover horizontal anchor (defaults left)
 */
export function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  variant = 'default',
  className,
  id,
  menuAlign = 'left',
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const keyHandler = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={wrapRef} className={[styles.wrap, className || ''].filter(Boolean).join(' ')}>
      <button
        id={id}
        type="button"
        className={[
          styles.trigger,
          variant === 'error' ? styles.triggerError : '',
          !selected ? styles.triggerPlaceholder : '',
        ].filter(Boolean).join(' ')}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span className={styles.triggerLabel} style={selected?.style}>
          {selected?.label ?? placeholder}
        </span>
        <Icon
          name="solar:alt-arrow-down-linear"
          size={12}
          color="var(--neutral-300)"
          className={open ? styles.chevronOpen : styles.chevron}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className={[styles.menu, menuAlign === 'right' ? styles.menuRight : ''].filter(Boolean).join(' ')}
        >
          {options.map(opt => {
            const isActive = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isActive}
                aria-disabled={opt.disabled || undefined}
                tabIndex={opt.disabled ? -1 : 0}
                className={[
                  styles.item,
                  isActive ? styles.itemActive : '',
                  opt.disabled ? styles.itemDisabled : '',
                ].filter(Boolean).join(' ')}
                style={opt.style}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
                {isActive && (
                  <Icon name="solar:check-read-linear" size={14} color="var(--primary-300)" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
