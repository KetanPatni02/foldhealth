// Email and SMS bodies for Send Education and Send Assessment. Email clients
// need inline styles and literal colors, so these are plain HTML strings.

import { defaultEmailHtml, textToHtml } from './defaultEmailTemplate';

const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const firstNameOf = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';

/** A card for one education item: title, summary and a Read button. */
export function educationBlock(item) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border:1px solid #E9ECF1;border-radius:12px">
<tr><td style="padding:16px 18px;font-family:Inter,Arial,sans-serif">
  <div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#8C5AE2">${esc(item.category || 'Health education')}</div>
  <div style="margin:6px 0 6px;font-size:16px;font-weight:600;color:#16181D">${esc(item.title)}</div>
  <div style="font-size:14px;line-height:1.5;color:#3A485F">${esc(item.summary)}</div>
  <a href="${esc(item.url)}" style="display:inline-block;margin-top:12px;padding:9px 16px;border-radius:6px;background:#8C5AE2;color:#FFFFFF;font-size:14px;text-decoration:none">Read more</a>
</td></tr></table>`;
}

/** One button per form, each opening the form to fill in. */
export function formsBlock(forms) {
  return forms.map(f => `<a href="${esc(f.url)}" style="display:block;margin:0 0 10px;padding:12px 16px;border:1px solid #D7C0FF;border-radius:8px;background:#F5F0FF;color:#7C3AED;font-size:14px;font-weight:600;text-decoration:none;font-family:Inter,Arial,sans-serif">${esc(f.name)} &rarr;</a>`).join('');
}

/**
 * Put `blockHtml` into a template: the Fold Care default gets it in its
 * message slot after `introText`; any other template gets it at the top of
 * the email body.
 */
export function composeWithTemplate({ templateHtml, introText, blockHtml, sender }) {
  const body = `${textToHtml(introText)}${blockHtml}`;
  if (!templateHtml) return defaultEmailHtml({ bodyHtml: body, sender });
  const open = templateHtml.match(/<body[^>]*>/i);
  const intro = `<div style="padding:24px 32px;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:1.6;color:#3A485F">${body}</div>`;
  return open ? templateHtml.replace(open[0], `${open[0]}${intro}`) : `${intro}${templateHtml}`;
}

export const educationSms = (first, item) =>
  `Hi ${first}, your care team shared "${item.title}" with you: ${item.url}`;

export const assessmentSms = (first, forms) =>
  `Hi ${first}, please fill in ${forms.length === 1 ? 'this form' : 'these forms'} to help us provide better care: ${forms.map(f => `${f.name}: ${f.url}`).join(' ')}`;
