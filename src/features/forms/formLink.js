/**
 * Shareable in-app link to a form's fill view (#/f/{id}). Recipients open it
 * inside the app (logged-in). Absolute so it can be copied to clipboard / chat.
 */
export function formShareLink(id) {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/f/${id}`;
}

/** Extract a form id from a share link (or hash), or null. */
export function formIdFromLink(link) {
  const m = String(link || '').match(/#\/f\/([^/?#]+)/);
  return m ? m[1] : null;
}
