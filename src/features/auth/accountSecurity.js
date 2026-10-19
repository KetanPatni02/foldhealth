// Account lockout on the sign-in screen. The real count and lock live in the
// database (supabase/account_lockout_migration.sql and
// account_unlock_link_migration.sql); this file reads its answers, reports
// failures, asks an administrator to unlock, and talks to the unlock API.
import { supabase } from '../../lib/supabase';

export const MAX_FAILED_ATTEMPTS = 5;

// Codes returned when a sign-in is refused: by the access-token hook (free
// plan), or the optional Password Verification Hook (paid plan).
export const AUTH_REFUSAL = {
  paused: 'ACCOUNT_PAUSED',
  resetRequired: 'PASSWORD_RESET_REQUIRED',
};

/** 'paused' | 'resetRequired' | 'invalid' | 'unverified' | 'other' */
export function classifySignInError(message = '') {
  if (message.includes(AUTH_REFUSAL.paused)) return 'paused';
  if (message.includes(AUTH_REFUSAL.resetRequired)) return 'resetRequired';
  if (/invalid login credentials/i.test(message)) return 'invalid';
  if (/email not confirmed/i.test(message)) return 'unverified';
  return 'other';
}

// Consecutive failures in this browser, per email. The pause screen also
// shows at the 5th local failure, so an address with no account pauses the
// same way a real one does and the screen doesn't reveal which exist.
const KEY = 'fold.signinFailures';
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const write = (v) => { try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked */ } };
const norm = (email) => String(email || '').trim().toLowerCase();

export const failedSignIns = (email) => read()[norm(email)] || 0;

export function noteFailedSignIn(email) {
  const all = read();
  const n = (all[norm(email)] || 0) + 1;
  all[norm(email)] = n;
  write(all);
  return n;
}
export function clearFailedSignIns(email) {
  const all = read();
  delete all[norm(email)];
  write(all);
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch {
    return { ok: false, message: 'We couldn\'t reach Fold Health. Check your connection and try again.' };
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: json?.error?.message || 'Something went wrong. Try again.', code: json?.error?.code };
  return { ok: true, ...json };
}

/** Emails a 6-digit code. Answers the same whether or not the account exists. */
export const requestResetCode = (email) => post('/api/password-reset', { action: 'request', email: String(email || '').trim() });

export const verifyResetCode = ({ email, code, password }) =>
  post('/api/password-reset', { action: 'verify', email: String(email || '').trim(), code, password });

// Database bookkeeping for the sign-in page. They answer the same whether or
// not the email has an account, and a missing function (migration not run)
// is ignored. The failure report carries the password because the database
// only counts it after checking it really is wrong, so nobody can lock an
// account by reporting failures they didn't make. Then any "account locked"
// email that report queued goes out.
export function reportFailedSignIn(email, password) {
  supabase.rpc('record_sign_in_failure', { p_email: String(email || '').trim(), p_password: password || '' })
    .then(() => flushSecurityEmails(), () => {});
}
export function reportSignInSuccess() {
  supabase.rpc('record_sign_in_success').then(() => {}, () => {});
}

/** Asks the practice administrators to unlock this account (in-app + email). */
export async function requestAccountUnlock(email) {
  const { error } = await supabase.rpc('request_account_unlock', { p_email: String(email || '').trim() });
  flushSecurityEmails();
  return !error || /function|schema cache|does not exist/i.test(error.message || '')
    ? { ok: true }
    : { ok: false, message: 'We couldn\'t send the request. Try again in a moment.' };
}

/** The administrator's emailed unlock link: who it's for, then set the password. */
export const inspectUnlockLink = (token) => post('/api/account-unlock', { action: 'inspect', token });
export const completeUnlockLink = ({ token, password }) => post('/api/account-unlock', { action: 'complete', token, password });

/** Sends any security emails the database queued (lock, unlock, password changed). */
export function flushSecurityEmails() {
  fetch('/api/security-email-dispatch', { method: 'POST' }).catch(() => {});
}
