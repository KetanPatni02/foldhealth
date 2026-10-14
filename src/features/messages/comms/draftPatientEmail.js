// Draft the Compose Email message with UnityAI (the server-side Gemini proxy
// at /api/referral-email, in its patient mode). Returns null when UnityAI
// can't be reached, so the caller keeps what's there.
import { apiFetch } from '../../../lib/apiFetch';

/** @returns {Promise<{ subject: string, body: string } | null>} */
export async function draftPatientEmail({ patientName, subject, notes, senderName }) {
  try {
    const res = await apiFetch('/api/referral-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'patient', patientName, subject, notes, senderName }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    return json.email?.body ? json.email : null;
  } catch {
    return null;
  }
}
