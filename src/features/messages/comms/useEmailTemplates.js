import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { renderPreviewHtml } from '../../email-builder/renderEmail';
import { DEFAULT_TEMPLATE_ID, DEFAULT_SUBJECT, defaultEmailHtml } from './defaultEmailTemplate';

export const GENERAL_CATEGORY = 'General';

/**
 * Email templates for Compose Email's Template Category / Template List: the
 * Fold Care default (under General) plus Content → Emails templates. Each
 * `render()` returns the template's HTML for this recipient; the message is
 * put into it separately (see withBody).
 */
export function useEmailTemplates(recipient, sender) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let alive = true;
    supabase.from('campaigns')
      .select('id, name, category, subject_line, email_template')
      .eq('channel', 'email')
      .not('email_template', 'is', null)
      .order('name', { ascending: true })
      .limit(100)
      .then(({ data }) => { if (alive) setRows(data || []); });
    return () => { alive = false; };
  }, []);

  return useMemo(() => [
    { id: DEFAULT_TEMPLATE_ID, name: 'Fold Care', category: GENERAL_CATEGORY, subject: DEFAULT_SUBJECT, render: () => defaultEmailHtml({ sender }) },
    ...(rows || []).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category || GENERAL_CATEGORY,
      subject: t.subject_line || t.name,
      render: () => renderPreviewHtml(t.email_template, { recipient, wrapperPadding: '0' }),
    })),
  ], [rows, recipient, sender]);
}

/** The template with the message in its body slot (or at the top when it has none). */
export function withBody(templateHtml, bodyHtml) {
  const d = new DOMParser().parseFromString(templateHtml || '', 'text/html');
  const slot = d.querySelector('[data-fold-body]');
  if (slot) slot.innerHTML = bodyHtml;
  else d.body.insertAdjacentHTML('afterbegin', `<div style="padding:24px 32px">${bodyHtml}</div>`);
  return `<!doctype html>\n${d.documentElement.outerHTML}`;
}
