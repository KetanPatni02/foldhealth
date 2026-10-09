// Real SMS through textbee.dev: an Android phone running the textbee app
// sends and receives texts on its own SIM, so there is no carrier
// registration and no per-message fee (the phone's plan pays).
//
//   POST /api/comms-sms  { to, message }  → { id }
//   GET  /api/comms-sms                    → { messages: [{ id, from, body, receivedAt }] }
//
// GET is polled by Messages > SMS to pull replies into their threads; it
// needs no public webhook, so it works on localhost too.
//
// Env: TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID (both from the textbee dashboard).

import { requireUser } from './_lib/requireUser.js';

const BASE = 'https://api.textbee.dev/api/v1/gateway/devices';

function config() {
  const key = process.env.TEXTBEE_API_KEY;
  const device = process.env.TEXTBEE_DEVICE_ID;
  return key && device ? { key, device } : null;
}

const NOT_CONNECTED = 'SMS gateway is not connected. Add TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID to the environment.';

export default async function handler(req, res) {
  // Reads every inbound patient text and sends from our line: staff only.
  if (!(await requireUser(req, res))) return;
  const cfg = config();
  if (!cfg) return res.status(503).json({ error: { message: NOT_CONNECTED } });
  const headers = { 'x-api-key': cfg.key, 'Content-Type': 'application/json' };

  if (req.method === 'POST') {
    const { to, message } = req.body || {};
    if (!to || !message) return res.status(400).json({ error: { message: 'Missing required fields: to, message' } });
    try {
      const r = await fetch(`${BASE}/${cfg.device}/send-sms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ recipients: [to], message }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        return res.status(r.status).json({ error: { message: json?.error || json?.message || `Gateway returned ${r.status}` } });
      }
      const id = json?.data?.smsBatchId || json?.data?._id || null;
      return res.status(200).json({ id });
    } catch (err) {
      return res.status(502).json({ error: { message: `Could not reach the SMS gateway: ${err?.message || err}` } });
    }
  }

  if (req.method === 'GET') {
    try {
      const r = await fetch(`${BASE}/${cfg.device}/get-received-sms`, { headers });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(r.status).json({ error: { message: json?.message || `Gateway returned ${r.status}` } });
      const messages = (json?.data || []).map(m => ({
        id: `textbee:${m._id || m.id}`,
        from: m.sender,
        body: m.message,
        receivedAt: m.receivedAt || m.createdAt,
      }));
      return res.status(200).json({ messages });
    } catch (err) {
      return res.status(502).json({ error: { message: `Could not reach the SMS gateway: ${err?.message || err}` } });
    }
  }

  return res.status(405).json({ error: { message: 'Method not allowed' } });
}
