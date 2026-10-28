import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '../Input/Input';
import { Button } from '../Button/Button';
import styles from './RenamePopover.module.css';

const GAP = 8;
const EDGE = 8;

/**
 * Name something in place, from a pencil beside its title: a labelled
 * field with Cancel and Save, in a panel under the trigger. Enter saves,
 * Escape or a click outside cancels. Saving an empty name is allowed (the
 * caller decides what that means, e.g. "go back to the default").
 *
 * @param {{ current: HTMLElement }} props.anchorRef  – the panel opens under this
 * @param {{ current: HTMLElement }} [props.triggerRef] – the button that toggles it, when
 *   that isn't the anchor (e.g. a pencil beside the title it renames); a click on it
 *   doesn't count as outside
 * @param {string}   props.label
 * @param {string}   [props.value]
 * @param {string}   [props.placeholder]
 * @param {number}   [props.maxLength]
 * @param {number}   [props.width=400]
 * @param {(name: string) => void | Promise<void>} props.onSave – trimmed name
 * @param {() => void} props.onClose
 */
export function RenamePopover({ anchorRef, triggerRef, label, value = '', placeholder, maxLength, width = 400, onSave, onClose }) {
  const panelRef = useRef(null);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const a = anchorRef.current?.getBoundingClientRect();
    if (!a) return;
    const w = Math.min(width, window.innerWidth - EDGE * 2);
    setPos({ top: a.bottom + GAP, left: Math.max(EDGE, Math.min(a.left, window.innerWidth - w - EDGE)), width: w });
  }, [anchorRef, width]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => {
      const inside = [panelRef, anchorRef, triggerRef].some(r => r?.current?.contains(e.target));
      if (!inside) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [anchorRef, triggerRef, onClose]);

  const save = async () => {
    setSaving(true);
    try { await onSave(draft.replace(/\s+/g, ' ').trim()); onClose(); } finally { setSaving(false); }
  };

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      className={styles.panel}
      style={pos || { visibility: 'hidden' }}
    >
      <Input
        label={label}
        value={draft}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); save(); } }}
      />
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={saving} onClick={save}>Save</Button>
      </div>
    </div>,
    document.body,
  );
}
