import { supabase } from '../../lib/supabase';
import { addedChartToRow } from '../../lib/hccAddedChartsMapper';
import { reportPersistFailure } from './reportPersistFailure';

function extOf(filename) {
  const m = /\.([a-z0-9]+)$/i.exec(filename || '');
  return m ? m[1].toLowerCase() : null;
}

/** Push chart bytes to Storage and insert `hcc_added_charts` (fire-and-forget). */
export async function persistHccAddedChart(memberId, doc, file) {
  if (!memberId || !doc) return;
  let pdfUrl = doc.pdf && /^https?:/i.test(doc.pdf) ? doc.pdf : null;
  let storagePath = null;
  try {
    if (file) {
      const path = `${memberId}/${doc.id}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('chart-uploads')
        .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: true });
      if (upErr) {
        reportPersistFailure(`persistHccAddedChart.upload(${doc.id})`, upErr);
      } else {
        storagePath = path;
        pdfUrl = supabase.storage.from('chart-uploads').getPublicUrl(path).data.publicUrl;
      }
    }
    const { error } = await supabase
      .from('hcc_added_charts')
      .insert(addedChartToRow(memberId, { ...doc, pdf: pdfUrl, storagePath }));
    if (error) reportPersistFailure(`persistHccAddedChart.insert(${doc.id})`, error);
  } catch (e) {
    reportPersistFailure(`persistHccAddedChart(${doc.id})`, e || { message: 'unknown' });
  }
}

/** Push program doc bytes to Storage and insert `program_documents` (fire-and-forget). */
export async function persistProgramDocument(doc, file) {
  if (!doc?.id) return;
  let fileUrl = null;
  let storagePath = null;
  try {
    if (file) {
      const path = `${doc.programCode || 'unscoped'}/${doc.patientId || 'unscoped'}/${doc.id}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('program-documents')
        .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: true });
      if (upErr) {
        reportPersistFailure(`persistProgramDocument.upload(${doc.id})`, upErr);
      } else {
        storagePath = path;
        fileUrl = supabase.storage.from('program-documents').getPublicUrl(path).data.publicUrl;
      }
    }
    const { error } = await supabase.from('program_documents').insert({
      id:           doc.id,
      program_code: doc.programCode,
      patient_id:   doc.patientId,
      name:         doc.name,
      type:         doc.type,
      status:       doc.status,
      size_bytes:   doc.sizeBytes,
      updated_by:   doc.updatedBy,
      updated_date: doc.updatedDate,
      file_url:     fileUrl,
      storage_path: storagePath,
      ext:          extOf(file?.name || doc.name),
    });
    if (error) reportPersistFailure(`persistProgramDocument.insert(${doc.id})`, error);
  } catch (e) {
    reportPersistFailure(`persistProgramDocument(${doc.id})`, e || { message: 'unknown' });
  }
}
