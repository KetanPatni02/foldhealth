import { Resend } from 'resend';

// POST /api/send-test-email
// Body: { to, subject?, html, fromName?, fromEmail? }
// Env:  RESEND_API_KEY (required)
//       RESEND_FROM    (optional, default "Fold Health <noreply@designedbyalok.com>")
//                      Use a verified-domain address from your Resend dashboard.
//
// Responses pass Resend's error object through verbatim so the frontend can
// show useful messages like "Domain is not verified" instead of a generic
// "send failed". Always returns JSON.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: {
        message:
          'RESEND_API_KEY is not set. Add it to your Vercel project env vars ' +
          '(Production + Preview + Development) and to .env / .env.local for local dev.',
      },
    });
  }

  const { to, subject, html, fromName, fromEmail } = req.body || {};
  if (!to || !html) {
    return res.status(400).json({ error: { message: 'Missing required fields: to, html' } });
  }

  // Build the From address. Priority:
  //  1. Explicit fromName + fromEmail from the request body (caller passes
  //     the campaign's sender/send-from selection)
  //  2. RESEND_FROM env var (your verified default)
  //  3. The legacy hard-coded default — kept so existing deploys don't break
  let from;
  if (fromEmail) {
    from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  } else {
    from = process.env.RESEND_FROM || 'Fold Health <noreply@designedbyalok.com>';
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: subject || 'Test Email from Fold Health',
      html,
    });
    if (error) {
      const status = error.statusCode || 400;
      return res.status(status).json({ error });
    }
    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({
      error: { message: err?.message || 'Unknown error', name: err?.name },
    });
  }
}
