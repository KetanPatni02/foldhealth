export function getBadgeText(val) {
  if (val >= 80) return 'High';
  if (val >= 40) return 'Medium';
  return 'Low';
}
