/** Supabase row mappers for Settings → Content (forms) and clinical notes. */

export function formRowToJs(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || null,
    category: row.category || null,
    formType: row.form_type || 'Other',
    status: row.status || 'draft',
    schema: row.schema,
    scoring: row.scoring,
    settings: row.settings || {},
    responseCount: row.response_count || 0,
    updatedAt: row.updated_at || null,
    updatedBy: row.updated_by || null,
    updatedByName: row.updated_by_profile?.full_name || null,
  };
}

export function clinicalNoteRowToJs(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    hedisMemberId: row.hedis_member_id,
    gapCodes: row.gap_codes || [],
    formType: row.form_type || 'cbp_visit_note',
    formId: row.form_id ?? null,
    status: row.status,
    payload: row.payload || {},
    pdfFilename: row.pdf_filename || null,
    pdfDataUrl: row.pdf_data_url || null,
    reviewTaskId: row.review_task_id || null,
    authorId: row.author_id || null,
    authorName: row.author_name || null,
    reviewerId: row.reviewer_id || null,
    reviewerName: row.reviewer_name || null,
    signedById: row.signed_by_id || null,
    signedByName: row.signed_by_name || null,
    signedAt: row.signed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    originKind: row.origin_kind || null,
    originRef: row.origin_ref || null,
  };
}

export function clinicalNoteVersionRowToJs(row) {
  return {
    id: row.id,
    noteId: row.note_id,
    version: row.version,
    status: row.status,
    payload: row.payload || {},
    pdfFilename: row.pdf_filename || null,
    pdfDataUrl: row.pdf_data_url || null,
    authorId: row.author_id || null,
    authorName: row.author_name || null,
    reviewerId: row.reviewer_id || null,
    reviewerName: row.reviewer_name || null,
    signedById: row.signed_by_id || null,
    signedByName: row.signed_by_name || null,
    signedAt: row.signed_at || null,
    createdAt: row.created_at || null,
  };
}
