// The template every Compose Email starts with (Figma Communications
// 1:24088): a Fold Care header, the message, the sender's signature and the
// "Need help?" footer. Email clients need inline styles and literal colors,
// so this is plain HTML rather than tokens.
//
// The editable message sits in <td data-fold-body>, so "Generate Email" and
// a reply can replace just that part.

const esc = (s) => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const DEFAULT_TEMPLATE_ID = 'fold-default';
export const DEFAULT_SUBJECT = 'Important Update About Your Health';

export const textToHtml = (text) => esc(text).split(/\n{2,}/)
  .map(p => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`).join('');

export function defaultBodyText(firstName) {
  return [
    `Dear ${firstName || '{{first_name}}'},`,
    'We hope this message finds you well. We wanted to share a quick update from your care team.',
    'If you have any questions, just reply to this email or call us, and we will be glad to help.',
  ].join('\n\n');
}

export function defaultEmailHtml({ bodyHtml, sender = {} } = {}) {
  const signature = [
    sender.name && `<div style="font-weight:600;color:#7C3AED">${esc(sender.name)}</div>`,
    sender.role && `<div>${esc(sender.role)}</div>`,
    sender.email && `<div style="color:#6F7A90">${esc(sender.email)}</div>`,
  ].filter(Boolean).join('');
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F3FF;font-family:Inter,Arial,sans-serif;color:#3A485F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3FF"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden">
<tr><td align="center" style="padding:36px 32px 28px;background:linear-gradient(180deg,#EDE5FF 0%,#FFFFFF 100%)">
  <div style="font-size:30px;line-height:1;color:#8C5AE2">&#10010;</div>
  <h1 style="margin:14px 0 8px;font-size:24px;line-height:1.25;color:#7C3AED;font-weight:700">Welcome to Fold Care</h1>
  <p style="margin:0;font-size:14px;line-height:1.5;color:#8C5AE2">Taking care of your health is a big step, and we&rsquo;re here to make it easier for you.</p>
</td></tr>
<tr><td data-fold-body style="padding:24px 32px 8px;font-size:14px;line-height:1.6;color:#3A485F">${bodyHtml || textToHtml(defaultBodyText())}</td></tr>
${signature ? `<tr><td style="padding:0 32px 24px;font-size:13px;line-height:1.5;color:#3A485F">--<br>${signature}</td></tr>` : ''}
<tr><td align="center" style="padding:28px 32px;background:#F8F6FF">
  <div style="font-size:12px;letter-spacing:0.12em;color:#8C5AE2">FROM TEAM</div>
  <div style="margin:6px 0 14px;font-size:18px;color:#8C5AE2;font-weight:600">Foldhealth</div>
  <div style="font-size:15px;font-weight:600;color:#3A485F">Need Help?</div>
  <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:#6F7A90">If you have any questions or need assistance, our support team is here for you.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}
