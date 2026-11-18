import { useState } from 'react';
import { ActionButton } from '../../../components/ActionButton/ActionButton';
import { MenuPopover } from '../../../components/MenuPopover/MenuPopover';
import { CIS_ANTIGEN_STATUS } from './cisRules';

/**
 * A vaccine's ⋯ menu: Mark Immune (Hep A, Hep B, MMR, VZV) or Undo Immune.
 * Renders nothing when there's no action. Stops its clicks from reaching the
 * row it sits in (the tab's rows toggle open on click).
 *
 * @param {object}   props
 * @param {object}   props.antigen      – evaluateCis() antigen
 * @param {function} [props.onMark]     – ('immune', antigen) => void
 * @param {function} [props.onUndoMark] – (antigen) => void
 * @param {string}   [props.className]     – the parent's hover-reveal class
 * @param {string}   [props.openClassName] – keeps it shown while the menu is open
 */
export function VaccineMenu({ antigen, onMark, onUndoMark, className = '', openClassName = '' }) {
  const [rect, setRect] = useState(null);
  const items = [];
  if (antigen.immuneMark && onUndoMark) items.push({ key: 'undo-immune', icon: 'solar:undo-left-linear', label: 'Undo Immune' });
  else if (onMark && antigen.canMarkImmune && antigen.status !== CIS_ANTIGEN_STATUS.seriesComplete) {
    items.push({ key: 'immune', icon: 'solar:shield-check-linear', label: 'Mark Immune' });
  }
  if (!items.length) return null;
  const stop = (e) => e.stopPropagation();
  return (
    <span onClick={stop} onKeyDown={stop} className={`${className} ${rect ? openClassName : ''}`}>
      <ActionButton
        icon="solar:menu-dots-linear"
        size="sm"
        tooltip="More actions"
        tooltipLeft
        onClick={(e) => setRect(rect ? null : e.currentTarget.getBoundingClientRect())}
      />
      {rect && (
        <MenuPopover
          anchorRect={rect}
          items={items}
          onSelect={(key) => {
            setRect(null);
            if (key === 'immune') onMark('immune', antigen);
            else onUndoMark(antigen);
          }}
          onClose={() => setRect(null)}
          ariaLabel={`${antigen.label} actions`}
          width={200}
        />
      )}
    </span>
  );
}
