import { useState } from 'react';
import { FilterChip } from '../FilterChip/FilterChip';
import { RadioListPopover } from '../RadioListPopover/RadioListPopover';
import { DateRangePopover } from '../DateRangePopover/DateRangePopover';
import { DATE_PRESETS, fmtDay } from './dateRangePresets';

// The presets, plus Custom, which opens the two-month range calendar the
// worklists use.
function DateRangeFilterPopover({ anchorRect, onClose, preset, range, onPick }) {
  const [custom, setCustom] = useState(false);
  if (custom) {
    return (
      <DateRangePopover
        anchorRect={anchorRect}
        label="Custom range"
        selected={range}
        onChange={next => onPick(next.length === 2 ? 'Custom' : null, next.length === 2 ? next : [])}
        onClose={onClose}
      />
    );
  }
  return (
    <RadioListPopover
      anchorRect={anchorRect}
      label="Date Range"
      options={[...DATE_PRESETS, 'Custom']}
      selected={preset ? [preset] : []}
      onChange={(next) => {
        if (next[0] === 'Custom') { setCustom(true); return; }
        onPick(next[0] || null, []);
        onClose();
      }}
      onClose={onClose}
    />
  );
}

/**
 * Date Range filter for activity / history feeds: the shared FilterChip whose popover
 * offers presets (Today … This month) or a Custom two-month range. Filter
 * entries with `inDatePreset(preset, range)` from ./dateRangePresets.
 *
 * @param {string|null} props.preset – a DATE_PRESETS value, 'Custom', or null
 * @param {string[]}    props.range  – [fromISO, toISO] when preset is Custom
 * @param {function}    props.onChange – (preset, range) => void
 * @param {string}      [props.label='Date Range']
 */
export function DateRangeFilter({ preset, range = [], onChange, label = 'Date Range' }) {
  return (
    <FilterChip
      label={label}
      active={!!preset}
      activeSummary={preset === 'Custom' ? `${fmtDay(range[0])} – ${fmtDay(range[1])}` : preset || undefined}
      onClear={() => onChange(null, [])}
      renderPopover={({ anchorRect, onClose }) => (
        <DateRangeFilterPopover anchorRect={anchorRect} onClose={onClose} preset={preset} range={range} onPick={onChange} />
      )}
    />
  );
}
