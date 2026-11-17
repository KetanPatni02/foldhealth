import { serviceClient } from '../_lib/serviceClient.js';
import { requireUser } from '../_lib/requireUser.js';
import { requestContext } from '../_lib/requestContext.js';

/**
 * Sign-in events for the user's Login Activity, logged with the method,
 * device and location read from this request (see _lib/requestContext.js).
 *
 *   POST { event: 'failed', email, password }    → record_sign_in_failure_ctx
 *   POST { event: 'unlock_requested', email }    → request_account_unlock_ctx
 *   POST { event: 'signed_in', method }          signed in (Bearer token)
 *
 * 'failed' carries the password because the database counts a failure only
 * after checking it really is wrong (see account_unlock_link_migration.sql).
 * It is never logged or stored. 'failed' and 'unlock_requested' answer the
 * same whether or not the email has an account. A non-2xx answer tells the
 * sign-in page to fall back to the plain RPC, so nothing goes uncounted
 * before the migration runs.
 */
const SIGN_IN_METHODS = { password: 'Password', google: 'Google SSO' };
const fail = (res, status, message) => res.status(status).json({ error: { message } });

async function handleSignedIn(req, res, admin) {
  const user = await requireUser(req, res);
  if (!user) return;
  const method = SIGN_IN_METHODS[req.body?.method] || 'Password';
  const { data: p } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  const name = p?.full_name?.trim() || user.email;
  const ctx = requestContext(req, method);
  const { error } = await admin.from('audit_logs').insert({
    entity_type: 'UserProfile', entity_id: user.id, entity_name: name, action: 'Signed in',
    user_name: name, category: 'Security',
    details: JSON.stringify({ text: `Signed in with ${method === 'Password' ? 'a password' : 'Google'} · Web`, ...ctx }),
  });
  if (error) throw error;
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!serviceClient) return fail(res, 503, 'Sign-in activity isn\'t configured on the server.');
  const { event, email, password } = req.body || {};
  try {
    if (event === 'signed_in') return await handleSignedIn(req, res, serviceClient);
    if (event === 'failed') {
      const { error } = await serviceClient.rpc('record_sign_in_failure_ctx', {
        p_email: String(email || '').trim(), p_password: String(password || ''), p_ctx: requestContext(req, 'Password'),
      });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    if (event === 'unlock_requested') {
      const { error } = await serviceClient.rpc('request_account_unlock_ctx', {
        p_email: String(email || '').trim(), p_ctx: requestContext(req, 'Sign-in screen'),
      });
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return fail(res, 400, 'Unknown event');
  } catch (err) {
    console.error('[auth-activity]', event, err?.message || err);
    return fail(res, 500, 'Could not record the sign-in activity.');
  }
}
