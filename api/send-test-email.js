import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const { to, subject, html } = req.body || {};

  if (!to || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, html' });
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: 'Fold Health <onboarding@resend.dev>',
      to,
      subject: subject || 'Test Email from Fold Health',
      html,
    });

    if (error) return res.status(400).json({ error });
    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
