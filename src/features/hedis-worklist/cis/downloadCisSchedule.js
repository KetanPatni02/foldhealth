/**
 * Download the CIS-CMB10 schedule PDF. jsPDF loads on first download only.
 *
 * @param {{ member: object, result: object, notes?: object, startedOn?: Date }} params
 */
export async function downloadCisSchedule(params) {
  const { generateCisSchedulePdf } = await import('./generateCisSchedulePdf');
  const { blob, filename } = generateCisSchedulePdf(params);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
