// Maps manually-uploaded HCC chart documents between the JS doc shape
// (see chartDocs.makeUploadedChartDoc) and the `hcc_added_charts` DB row.

/** JS doc → snake_case DB row for insert. */
export function addedChartToRow(memberId, doc) {
  const httpPdf = doc.pdf && /^https?:/i.test(doc.pdf) ? doc.pdf : null;
  return {
    id: doc.id,
    hcc_member_id: memberId,
    caption: doc.caption ?? null,
    doc_type: doc.t ?? null,
    file_name: doc.n ?? null,
    date_added: doc.dateAdded ?? null,
    added_by: doc.addedBy ?? null,
    meta: doc.meta ?? null,
    status: doc.status ?? 'Pending',
    pdf_url: httpPdf,
    storage_path: doc.storagePath ?? null,
  };
}

/** DB row → JS doc for the chart list. */
export function rowToAddedChart(row) {
  return {
    id: row.id,
    n: row.file_name,
    caption: row.caption || row.file_name,
    t: row.doc_type,
    pdf: row.pdf_url || undefined,
    dateAdded: row.date_added,
    addedBy: row.added_by,
    meta: row.meta,
    status: row.status || 'Pending',
  };
}
