import { supabase } from '../../lib/supabase';

const BUCKET = 'email-assets';

export async function uploadImage(file) {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
