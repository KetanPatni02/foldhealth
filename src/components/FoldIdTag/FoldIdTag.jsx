import { useEffect, useRef, useState } from 'react';
import { Tooltip } from '../Tooltip/Tooltip';
import { copyFoldId, formatFoldId } from '../../lib/foldId';

const COPIED_LABEL_MS = 1500;

/**
 * FoldIdTag — the clickable "#10070" span shown on every worklist row.
 * Hover shows "Click to copy Fold ID"; clicking copies it and swaps the
 * tooltip to "Copied: #10070" for a beat instead of firing a toast, so the
 * confirmation sits right where the user is already looking.
 *
 * `display`/`label` let ApcmBillingRow reuse this for its payer member id
 * (not a Fold ID) with different copy — everything else just passes `id`.
 */
export function FoldIdTag({ id, display, label = 'Click to copy Fold ID', className, showToast }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const shown = display ?? formatFoldId(id);

  const handleClick = (e) => {
    e.stopPropagation();
    if (id == null || id === '') return;
    copyFoldId(id).then(ok => {
      if (!ok) {
        showToast?.('Could not copy to clipboard');
        return;
      }
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), COPIED_LABEL_MS);
    });
  };

  return (
    <Tooltip label={copied ? `Copied: ${shown}` : label}>
      <span className={className} onClick={handleClick}>
        {shown}
      </span>
    </Tooltip>
  );
}
