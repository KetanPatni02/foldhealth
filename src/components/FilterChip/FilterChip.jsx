import { useState } from 'react';
import { DownChevronIcon } from '../Icon/DownChevronIcon';
import { CheckboxListPopover } from '../CheckboxListPopover/CheckboxListPopover';
import { RadioListPopover } from '../RadioListPopover/RadioListPopover';
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
export function FilterChip({
  label,
  popoverLabel,
  options,
  selected = [],
  onChange,
  singleSelect = false,
  size = 'M',
  // Passthrough to CheckboxListPopover — enables the in-popover search box for
  // long option lists (e.g. Assignee, IPA, HP Code).
  searchable = false,
  // Extended API for filters whose popover isn't a plain list — the caller
  // decides when the chip counts as "active", what to summarize on the
  // pill, how to clear, and renders the popover body itself. When set, the
  // options/selected/onChange trio is ignored and the chip becomes a thin
  // trigger for the custom popover. See TimeFilter for the reference case.
  renderPopover,
  active: activeProp,
  // Optional override for the pill's right-hand value text. Falls back to the
  // built-in summarize() (first two values joined, or "X +N"). Used by the
  // shared FilterChipBar to format date ranges (mm/dd–mm/dd) and decade
  // ranges (X–Y) without re-implementing the whole chip.
  activeSummary,
  onClear,
}) {
  const [rect, setRect] = useState(null);
  const custom = typeof renderPopover === 'function';
  const active = custom ? !!activeProp : selected.length > 0;
  const summary = activeSummary != null
    ? parseActiveSummary(activeSummary)
    : (custom ? { text: '' } : summarize(selected));

  const handleClear = (e) => {
    e.stopPropagation();
    if (custom) onClear?.();
    else onChange([]);
  };

  const iconSize = size === 'S' ? 14 : 16;

  return (
    <>
      <button
        type="button"
        className={[styles.chip, active ? styles.chipActive : '', size === 'S' ? styles.sizeS : ''].filter(Boolean).join(' ')}
        onClick={(e) => setRect(rect ? null : e.currentTarget.getBoundingClientRect())}
      >
        <span className={styles.chipLabel}>{label}</span>
        {active ? (
          <>
            <span className={styles.divider} aria-hidden="true">:</span>
            <span className={styles.chipValue}>{summary.text}</span>
            {summary.extra != null && (
              <span className={styles.chipExtra}>+{summary.extra}</span>
            )}
            <span
              className={styles.clearIcon}
              role="button"
              aria-label={`Clear ${label} filter`}
              onClick={handleClear}
            >
              <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12.495 4.49501C12.7683 4.22164 12.7683 3.77842 12.495 3.50506C12.2216 3.23169 11.7784 3.23169 11.505 3.50506L12 4.00003L12.495 4.49501ZM3.50506 11.505C3.23169 11.7784 3.23169 12.2216 3.50506 12.495C3.77843 12.7683 4.22164 12.7683 4.49501 12.495L4.00003 12L3.50506 11.505ZM4.49497 3.50503C4.22161 3.23166 3.77839 3.23166 3.50503 3.50503C3.23166 3.77839 3.23166 4.22161 3.50503 4.49497L4 4L4.49497 3.50503ZM11.505 12.4949C11.7784 12.7683 12.2216 12.7683 12.4949 12.4949C12.7683 12.2216 12.7683 11.7784 12.4949 11.505L12 12L11.505 12.4949ZM12 4.00003L11.505 3.50506L7.50504 7.50504L8.00002 8.00002L8.49499 8.49499L12.495 4.49501L12 4.00003ZM8.00002 8.00002L7.50504 7.50504L3.50506 11.505L4.00003 12L4.49501 12.495L8.49499 8.49499L8.00002 8.00002ZM4 4L3.50503 4.49497L7.50504 8.49499L8.00002 8.00002L8.49499 7.50504L4.49497 3.50503L4 4ZM8.00002 8.00002L7.50504 8.49499L11.505 12.4949L12 12L12.4949 11.505L8.49499 7.50504L8.00002 8.00002Z" fill="var(--primary-300)" />
              </svg>
            </span>
          </>
        ) : (
          <DownChevronIcon size={iconSize} />
        )}
      </button>
      {rect && (custom
        ? renderPopover({ anchorRect: rect, onClose: () => setRect(null) })
        : singleSelect ? (
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
            searchable={searchable}
          />
        ))}
    </>
  );
}

function summarize(vals) {
  if (vals.length > 2) return { text: vals[0], extra: vals.length - 1 };
  return { text: vals.join(', ') };
}

// Split a caller-provided activeSummary string into `{ text, extra }` so a
// trailing " +N" always renders as the same badge treatment the built-in
// summarize() produces. Anything without a numeric trailer stays a plain
// text summary (e.g. date ranges like "03/12 – 03/19").
function parseActiveSummary(s) {
  if (typeof s !== 'string') return { text: s };
  const m = s.match(/^(.*\S)\s+\+(\d+)$/);
  return m ? { text: m[1], extra: Number(m[2]) } : { text: s };
}
