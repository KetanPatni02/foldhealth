import { FilterChip } from '../FilterChip/FilterChip';

export function SingleSelectFilter({ label, def, options, current, onSet, onClear }) {
  const valueByLabel = new Map(options.map(o => [o.label, o.value]));
  const labelByValue = new Map(options.map(o => [o.value, o.label]));
  const stringOptions = options.map(o => o.label);
  const selected = current != null && labelByValue.has(current)
    ? [labelByValue.get(current)]
    : [];
  const handleChange = (nextLabels) => {
    if (!nextLabels || nextLabels.length === 0) {
      onClear();
      return;
    }
    const selectedSet = new Set(selected);
    const pick = nextLabels.find(l => !selectedSet.has(l)) || nextLabels[nextLabels.length - 1];
    const nextValue = valueByLabel.get(pick);
    if (nextValue == null) return;
    onSet(nextValue);
  };
  return (
    <FilterChip
      label={label}
      options={stringOptions}
      selected={selected}
      onChange={handleChange}
      searchable={!!def.optionsFromData || !!def.searchable}
    />
  );
}
