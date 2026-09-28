/**
 * An email template as the frame for a one-off message (e.g. Send Report by
 * email): the template's header on top, the message and signature in the
 * middle, the template's footer at the bottom. The template's own body is
 * left out, since the message replaces it.
 */
import { renderEmailHtml } from './patchEmailHtml';
import { applyMergeTags } from './mergeTags';

const escapeHtml = (t) => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** The template's header and footer blocks (by their role), if it has them. */
export function templateParts(doc) {
  const ids = doc?.root?.data?.childrenIds || [];
  return {
    headerId: ids.find(id => doc[id]?.data?.role === 'header') || null,
    footerId: ids.find(id => doc[id]?.data?.role === 'footer') || null,
  };
}

// The template with only `childrenIds` at its root, as full email HTML. No
// compliance footer (a one-to-one email) and merge tags filled from `ctx`
// (unknown ones fall back, e.g. "there").
function render(doc, childrenIds, extraBlocks = {}, ctx = {}) {
  const next = { ...doc, ...extraBlocks, root: { ...doc.root, data: { ...doc.root.data, childrenIds, preheader: '' } } };
  return applyMergeTags(renderEmailHtml(next, { wrapperPadding: '0', theme: 'light', compliance: null }), ctx);
}

/** Just the template's header, for a preview above the message box. */
export function templateHeaderHtml(doc) {
  const { headerId } = templateParts(doc);
  return headerId ? render(doc, [headerId]) : '';
}

/** Plain text as email HTML: escaped, line breaks kept. */
export function textToEmailHtml(text) {
  return escapeHtml(text || '').replace(/\n/g, '<br>');
}

/**
 * The email to send: the template's header, then `message` (plain text,
 * with the signature already in it), then the template's footer.
 *
 * @returns {string} A full HTML email
 */
export function composeTemplateEmail(doc, message) {
  const { headerId, footerId } = templateParts(doc);
  const bodyId = 'report-message';
  const body = {
    [bodyId]: {
      type: 'RawHtml',
      data: {
        props: { html: `<div style="font-size:14px;line-height:1.5;color:#3A485F">${textToEmailHtml(message)}</div>` },
        style: { padding: { top: 24, bottom: 24, left: 24, right: 24 } },
      },
    },
  };
  return render(doc, [headerId, bodyId, footerId].filter(Boolean), body);
}
