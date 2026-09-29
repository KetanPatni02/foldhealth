/** "MM/DD/YYYY, HH:MM" (24h, or "h:mm AM/PM") → { date: "MM/DD/YYYY", hour, minute }. */
export function parsePickerValue(v) {
  if (!v) return { date: null, hour: 0, minute: 0 };
  const [datePart, timePart = ''] = v.split(', ');
  const match24 = timePart.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) return { date: datePart, hour: parseInt(match24[1]), minute: parseInt(match24[2]) };
  const match12 = timePart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1]);
    const ap = match12[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return { date: datePart, hour: h, minute: parseInt(match12[2]) };
  }
  return { date: datePart, hour: 0, minute: 0 };
}
