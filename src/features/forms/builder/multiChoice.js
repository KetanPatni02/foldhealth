/**
 * Ticks or unticks `value` in a tick-all-that-apply answer.
 *
 * An option marked `exclusive` (e.g. "No one (I live alone)") rules out the
 * rest: ticking it clears every other tick, and ticking any other option
 * clears it.
 *
 * @param {string[]} selected – The current answer
 * @param {Array<{value: string, exclusive?: boolean}>} options
 * @param {string}   value    – The option clicked
 * @returns {string[]}
 */
export function toggleMultiChoice(selected, options, value) {
  if (selected.includes(value)) return selected.filter(v => v !== value);
  if (options.find(o => o.value === value)?.exclusive) return [value];
  const exclusive = new Set(options.filter(o => o.exclusive).map(o => o.value));
  return [...selected.filter(v => !exclusive.has(v)), value];
}
