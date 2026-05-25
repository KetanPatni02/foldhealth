import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  if (!resend) {
    return res.status(500).json({
      error: {
        message:
          'RESEND_API_KEY is not set. Add it to your Vercel project env vars ' +
          '(Production + Preview + Development) and to .env / .env.local for local dev.',
      },
    });
  }

  const { to, subject, html, fromName } = req.body || {};
  if (!to || !html) {
    return res.status(400).json({ error: { message: 'Missing required fields: to, html' } });
  }

  const defaultFrom = process.env.RESEND_FROM || 'Fold Health <noreply@designedbyalok.com>';
  const from = fromName ? `${fromName} <${defaultFrom.match(/<(.+)>/)?.[1] || defaultFrom}>` : defaultFrom;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: subject || 'Test Email from Fold Health',
      html,
    });
    if (error) {
      return res.status(error.statusCode || 400).json({ error });
    }
    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({
      error: { message: err?.message || 'Unknown error', name: err?.name },
    });
  }
}
