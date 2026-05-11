import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { to, subject, html } = await req.json();

  if (!to || !html) {
    return Response.json({ error: 'Missing required fields: to, html' }, { status: 400 });
  }

  const { data, error } = await resend.emails.send({
    from: 'Fold Health <noreply@designedbyalok.com>',
    to,
    subject: subject || 'Test Email from Fold Health',
    html,
  });

  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  return Response.json({ data });
}

export const config = { path: '/api/send-test-email' };
