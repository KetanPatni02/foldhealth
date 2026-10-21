/* eslint-disable no-restricted-syntax -- email block data: sizes are px in the
   rendered email HTML (as in headerFooterLibrary.js), not app styles. */
/**
 * Account emails built in the email builder (Settings → Content → Emails,
 * category "Account Security"). Each is a campaigns row with a `system_key`
 * that api/_lib/securityEmails.js looks up when it sends that email, so
 * editing the template in the builder changes what users receive:
 *
 *   unlock_link        an admin unlocked the account: User ID + set-password link
 *   password_changed   the password was set or changed
 *   account_activated  the new password was set after an unlock
 *   signup_approved    an admin approved a Pending sign-up
 *
 * The server fills the Account tokens ({{set_password_link}}, {{user_id}},
 * {{sign_in_link}}, {{event_time}}) plus {{full_name}} and {{first_name}}.
 * Without a template (or before the migration runs) the built-in email in
 * securityEmails.js is sent instead. Colors are literal hex: this is email
 * HTML, not app CSS.
 */
import { renderEmailHtml } from './patchEmailHtml';

const BRAND = '#8C5AE2';
const TEXT = '#3A485F';
const MUTED = '#6F7A90';
const pad = (top, bottom) => ({ top, bottom, left: 32, right: 32 });

const header = {
  type: 'Container',
  data: {
    role: 'header',
    style: { backgroundColor: '#F2EEFE', padding: { top: 0, bottom: 0, left: 0, right: 0 } },
    props: { childrenIds: ['acct-brand'] },
  },
};
const brand = {
  type: 'Heading',
  data: {
    props: { text: 'Fold Health', level: 'h3' },
    style: { color: BRAND, fontSize: 18, fontWeight: 'bold', textAlign: 'left', padding: pad(20, 20) },
  },
};
const footer = {
  type: 'Container',
  data: {
    role: 'footer',
    style: { backgroundColor: '#F6F7F8', padding: { top: 0, bottom: 0, left: 0, right: 0 } },
    props: { childrenIds: ['acct-footer-text'] },
  },
};
const footerText = {
  type: 'Text',
  data: {
    props: { text: '© {{current_year}} Fold Health. This is an account email; you can’t unsubscribe from it.' },
    style: { color: MUTED, fontSize: 12, textAlign: 'center', lineHeight: 1.5, padding: pad(16, 16) },
  },
};

const heading = (text) => ({
  type: 'Heading',
  data: {
    props: { text, level: 'h2' },
    style: { color: '#16181D', fontSize: 22, fontWeight: 'bold', textAlign: 'left', padding: pad(28, 8) },
  },
});
const text = (value, { muted = false, bottom = 12 } = {}) => ({
  type: 'Text',
  data: {
    props: { text: value },
    style: { color: muted ? MUTED : TEXT, fontSize: muted ? 13 : 14, textAlign: 'left', lineHeight: 1.5, padding: pad(0, bottom) },
  },
});
const button = (label, url) => ({
  type: 'Button',
  data: {
    props: { text: label, url, size: 'medium', buttonStyle: 'rounded', buttonBackgroundColor: BRAND, buttonTextColor: '#FFFFFF' },
    style: { textAlign: 'left', padding: pad(8, 20) },
  },
});

// Header, the body blocks in order, then the footer.
function documentOf(body) {
  const ids = body.map((_, i) => `acct-body-${i + 1}`);
  return {
    root: {
      type: 'EmailLayout',
      data: {
        backdropColor: '#F6F7F8',
        canvasColor: '#FFFFFF',
        textColor: TEXT,
        fontFamily: 'MODERN_SANS',
        childrenIds: ['acct-header', ...ids, 'acct-footer'],
      },
    },
    'acct-header': header,
    'acct-brand': brand,
    ...Object.fromEntries(body.map((block, i) => [ids[i], block])),
    'acct-footer': footer,
    'acct-footer-text': footerText,
  };
}

const NOT_YOU = text('If this wasn’t you, contact your clinic or administrator.', { muted: true, bottom: 28 });

export const ACCOUNT_EMAIL_TEMPLATES = [
  {
    systemKey: 'unlock_link',
    name: 'Account: Unlock Account',
    description: 'Sent when an admin unlocks an account: the User ID and a one-time link to set a new password.',
    subject: 'Your Fold Health account was unlocked',
    doc: documentOf([
      heading('Set a new password to sign in'),
      text('Hi {{first_name}}, your administrator unlocked your Fold Health account on {{event_time}}.'),
      text('Your User ID: {{user_id}}'),
      text('Your old password no longer works. Set a new one with the button below. The link works once and expires in 24 hours.'),
      button('Set a new password', '{{set_password_link}}'),
      NOT_YOU,
    ]),
  },
  {
    systemKey: 'password_changed',
    name: 'Account: Password Set',
    description: 'Sent when a user sets or changes their password.',
    subject: 'Your Fold Health password was set',
    doc: documentOf([
      heading('Your password was set'),
      text('Hi {{first_name}}, the password for your Fold Health account was set on {{event_time}}.'),
      text('You’ve been signed out everywhere. Sign in again with your User ID ({{user_id}}) and your new password.'),
      button('Sign in', '{{sign_in_link}}'),
      NOT_YOU,
    ]),
  },
  {
    systemKey: 'account_activated',
    name: 'Account: Account Activated',
    description: 'Sent when a user sets their new password after an admin unlocked the account.',
    subject: 'Your Fold Health account is active again',
    doc: documentOf([
      heading('Account activated successfully'),
      text('Hi {{first_name}}, you set a new password on {{event_time}}, and your Fold Health account is active again.'),
      text('Sign in with your User ID ({{user_id}}) and your new password.'),
      button('Sign in', '{{sign_in_link}}'),
      NOT_YOU,
    ]),
  },
  {
    systemKey: 'signup_approved',
    name: 'Account: Sign-up Approved',
    description: 'Sent when an admin approves a Pending sign-up request.',
    subject: 'Your Fold Health access was approved',
    doc: documentOf([
      heading('Your access was approved'),
      text('Hi {{first_name}}, your request to join Fold Health was approved on {{event_time}}.'),
      text('Sign in with your User ID ({{user_id}}) and the password you chose when you signed up.'),
      button('Sign in to Fold Health', '{{sign_in_link}}'),
      text('If you didn’t ask for access, contact your clinic or administrator.', { muted: true, bottom: 28 }),
    ]),
  },
];

/**
 * The HTML the server sends for an account email: no marketing compliance
 * footer, tokens left in for the server to fill. Stored next to the
 * template (email_html) whenever it's saved, because the builder's renderer
 * only runs in the browser and the seed.
 */
export const accountEmailHtml = (doc) => renderEmailHtml(doc, { theme: 'light', compliance: null });

/** campaigns row for scripts/seed.js. */
export const accountEmailTemplateToRow = (t) => ({
  system_key: t.systemKey,
  name: t.name,
  description: t.description,
  channel: 'email',
  section: 'running',
  category: 'Account Security',
  subject_line: t.subject,
  email_template: t.doc,
  email_html: accountEmailHtml(t.doc),
});
