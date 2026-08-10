const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);

function extOf(str) {
  if (!str) return '';
  const clean = String(str).split(/[?#]/)[0];
  const m = clean.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}

export function resolveFileKind({ src, name, ext }) {
  const e = (ext || '').toLowerCase() || extOf(name) || (src && !src.startsWith('blob:') ? extOf(src) : '');
  if (IMAGE_EXTS.has(e)) return 'image';
  if (e === 'docx') return 'docx';
  if (e === 'pdf' || e === '') return 'pdf';
  return 'other';
}
