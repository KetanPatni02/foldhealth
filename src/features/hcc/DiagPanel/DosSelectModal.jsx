import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/Button/Button';
import styles from './DosSelectModal.module.css';

/**
 * DosSelectModal — shown when the user accepts an unlinked ICD in sweep mode
 * (e.g. an AI-suggested code with no DOS link yet). Lets them pick a known
 * DOS from the member's list or enter a custom MM/DD/YYYY date.
 *
 * Props:
 *  - open       (boolean)
 *  - icd        ({ code })           ICD being linked.
 *  - action     ('accept'|'comment'|'upload')  Drives the confirm button label.
 *  - dosList    ({ date, label, labelColor? }[])  Available DOSes.
 *  - onConfirm  (fn(dos: string))
 *  - onCancel   (fn)
 */
export function DosSelectModal({
  open,
  icd,
  action = 'accept',
  dosList = [],
  onConfirm,
  onCancel,
}) {
  const [selected, setSelected] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (open) { setSelected(''); setUseCustom(false); setCustom(''); }
  }, [open]);

  if (!icd) return null;

  const valid = useCustom ? custom.trim().length >= 8 : !!selected;
  const label =
    action === 'accept'  ? 'Accept'
  : action === 'comment' ? 'Save Comment'
  :                        'Upload';
  const verb = label.toLowerCase();

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm?.(useCustom ? custom.trim() : selected);
  };

  return (
    <Dialog open={!!open} onOpenChange={(o) => { if (!o) onCancel?.(); }}>
      <DialogContent className={styles.content}>
        <DialogTitle className={styles.title}>Select a Date of Service</DialogTitle>
        <p className={styles.subtitle}>
          Choose the DOS to link <strong>{icd.code}</strong> before {verb}ing.
        </p>

        <div className={styles.options}>
          {dosList.map((d) => {
            const sel = selected === d.date && !useCustom;
            return (
              <button
                key={d.date}
                type="button"
                className={[styles.option, sel ? styles.optionActive : ''].join(' ')}
                onClick={() => { setSelected(d.date); setUseCustom(false); }}
              >
                <span className={[styles.radio, sel ? styles.radioActive : ''].join(' ')}>
                  {sel && <span className={styles.radioDot} />}
                </span>
                <span className={styles.optionText}>
                  <span className={styles.optionDate}>{d.date}</span>
                  {d.label && (
                    <span className={styles.optionLabel} style={{ color: d.labelColor || 'var(--neutral-300)' }}>
                      {d.label}
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          <div className={[styles.option, useCustom ? styles.optionActive : ''].join(' ')}>
            <button
              type="button"
              className={styles.customToggle}
              onClick={() => { setUseCustom(true); setSelected(''); }}
            >
              <span className={[styles.radio, useCustom ? styles.radioActive : ''].join(' ')}>
                {useCustom && <span className={styles.radioDot} />}
              </span>
              <span className={styles.optionText}>
                <span className={styles.optionDate}>Custom Date</span>
              </span>
            </button>
            {useCustom && (
              <input
                autoFocus
                type="text"
                placeholder="MM/DD/YYYY"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className={styles.customInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && valid) handleConfirm();
                  if (e.key === 'Escape') onCancel?.();
                }}
              />
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="M" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="M" disabled={!valid} onClick={handleConfirm}>
            {label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
