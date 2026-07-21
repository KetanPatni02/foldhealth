import { useState } from 'react';
import { Icon } from '../Icon/Icon';
import { CheckboxListPopover } from '../Popover/CheckboxListPopover';
import { RadioListPopover } from '../Popover/RadioListPopover';
import styles from './FilterChip.module.css';

/**
 * FilterChip — a labelled filter chip that opens a multi-select popover, the
 * same pattern used by the worklist filter bar. Idle it shows "Label ⌄"; once
 * values are picked it shows "Label | value(s) ✕". The ✕ clears the filter.
 *
 * @param {object}   props
 * @param {string}   props.label
 * @param {string}   [props.popoverLabel] – Header shown INSIDE the popover.
 *                                          Defaults to `label`. Use when the
 *                                          chip trigger text and the popover
 *                                          header should differ (e.g. chip
 *                                          "Documents Available" → popover
 *                                          "Select No. of Documents").
 * @param {string[]} props.options       – available values
 * @param {string[]} [props.selected]    – currently-selected values
 * @param {function} props.onChange      – (string[]) => void
 * @param {boolean}  [props.singleSelect]– Use RadioListPopover instead of the
 *                                         checkbox popover; onChange still
 *                                         receives a (0- or 1-element) array
 *                                         so callers don't need a second
 *                                         shape. Popover auto-closes on pick.
 */
export function FilterChip({ label, popoverLabel, options, selected = [], onChange, singleSelect = false }) {
  const [rect, setRect] = useState(null);
  const active = selected.length > 0;

  return (
    <>
      <button
        type="button"
        className={[styles.chip, active ? styles.chipActive : ''].filter(Boolean).join(' ')}
        onClick={(e) => setRect(rect ? null : e.currentTarget.getBoundingClientRect())}
      >
        <span className={styles.chipLabel}>{label}</span>
        {active ? (
          <>
            <span className={styles.divider} aria-hidden="true">|</span>
            <span className={styles.chipValue}>{summarize(selected)}</span>
            <span
              className={styles.clearIcon}
              role="button"
              aria-label={`Clear ${label} filter`}
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
            >
              <Icon name="solar:close-circle-linear" size={12} color="var(--primary-300)" />
            </span>
          </>
        ) : (
          <Icon name="solar:alt-arrow-down-linear" size={11} color="var(--neutral-300)" />
        )}
      </button>
      {rect && (singleSelect ? (
        <RadioListPopover
          anchorRect={rect}
          label={popoverLabel || label}
          options={options}
          selected={selected}
          onChange={(next) => { onChange(next); setRect(null); }}
          onClose={() => setRect(null)}
        />
      ) : (
        <CheckboxListPopover
          anchorRect={rect}
          label={popoverLabel || label}
          options={options}
          selected={selected}
          onChange={onChange}
          onClose={() => setRect(null)}
        />
      ))}
    </>
  );
}

function summarize(vals) {
  return vals.length > 2 ? `${vals[0]} +${vals.length - 1}` : vals.join(', ');
}
