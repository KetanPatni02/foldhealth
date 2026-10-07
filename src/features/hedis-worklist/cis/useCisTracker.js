const pad = (n) => String(n).padStart(2, '0');
/** Date → YYYY-MM-DD (DatePicker value). */
export const toIso = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '');
/** YYYY-MM-DD → MM/DD/YYYY (patient_immunizations.date_administered). */
export const isoToMdy = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${m}/${d}/${y}` : '';
};
