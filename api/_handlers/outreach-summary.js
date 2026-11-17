/**
 * POST /api/outreach-summary
 *
 * The AI summary for one patient-level outreach (HCC Patient Outreach): a
 * short call summary and the patient actions discussed or agreed, each with
 * the HCCs, ICDs and DOSs it mentions. Whether a mention matches one of the
 * patient's records is decided server-side (_lib/outreachMatch.js), never by
 * the model. Built from the conversation only.
 *
 * Body: { patientName, text: { transcript?, email?, notes? },
 *         records: { hccs: string[], icds: string[], dos: string[] }, dosContext?: boolean }
 * Returns: { callSummary: string, patientActions: [{ text, refs: [{ type, id, matched }] }] }
 */

import { requireUser } from '../_lib/requireUser.js';
import { bodyWithinLimit } from '../_lib/limits.js';
import { aiBusy, aiConfigured, generateJson } from '../_lib/aiJson.js';
import { matchActions } from '../_lib/outreachMatch.js';

const ATTEMPT_TIMEOUT_MS = 20000;
const MAX_TEXT = 20000;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    callSummary: { type: 'string' },
    patientActions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          refs: {
            type: 'array',
            items: {
              type: 'object',
              properties: { type: { type: 'string', enum: ['HCC', 'ICD', 'DOS'] }, id: { type: 'string' } },
              required: ['type', 'id'],
            },
          },
        },
        required: ['text', 'refs'],
      },
    },
  },
  required: ['callSummary', 'patientActions'],
};

const clip = (s) => String(s || '').slice(0, MAX_TEXT);

function buildPrompt({ patientName = 'the patient', text = {}, records = {}, dosContext = true }) {
  return [
    'You summarize an outreach (a call, email or visit) between a risk adjustment',
    `team and a PCP office or member, about ${patientName}.`,
    '',
    'Return:',
    '- callSummary: 2 to 4 plain sentences on what was discussed and agreed.',
    '- patientActions: each concrete action discussed or agreed for this patient',
    '  (for example "Office will fax the 08/26 visit note"). For each, list in refs',
    `  every HCC, ICD${dosContext ? ' and date of service (DOS)' : ''} it mentions, as said in the conversation:`,
    '  HCC as "HCC 18", ICD as "E11.9", DOS as MM/DD/YYYY.',
    '',
    'Rules:',
    '- Use only what the conversation says. Never invent actions, codes or dates.',
    '- List a mentioned code or date even if it is not in the patient records below.',
    '- If nothing patient-specific was discussed, return an empty patientActions.',
    '- Plain language. No headings, no bullet characters.',
    '',
    'Patient records (for context only):',
    JSON.stringify({ hccs: records.hccs || [], icds: records.icds || [], ...(dosContext ? { dos: records.dos || [] } : {}) }),
    '',
    'Conversation:',
    text.transcript ? `Call transcript:\n${clip(text.transcript)}` : '',
    text.email ? `Email:\n${clip(text.email)}` : '',
    text.notes ? `Notes:\n${clip(text.notes)}` : '',
  ].filter(line => line !== '').join('\n');
}

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });
  if (!aiConfigured()) {
    console.error('[outreach-summary] no AI key is set');
    return res.status(500).json({ error: { message: 'AI summaries are not set up on this deployment.' } });
  }
  if (!bodyWithinLimit(req, res, 120 * 1024)) return;
  const body = req.body && typeof req.body === 'object' ? req.body : null;
  const text = body?.text || {};
  if (!text.transcript && !text.email && !text.notes) {
    return res.status(400).json({ error: { message: 'Nothing to summarize' } });
  }

  try {
    const ai = await generateJson({
      prompt: buildPrompt(body),
      schema: RESPONSE_SCHEMA,
      name: 'outreach_summary',
      temperature: 0.2,
      logTag: 'outreach-summary',
      timeoutMs: ATTEMPT_TIMEOUT_MS,
      deadlineMs: ATTEMPT_TIMEOUT_MS * 2,
    });
    if (!ai.ok) {
      const msg = aiBusy(ai.status) ? 'The AI service is busy right now.' : `AI service returned ${ai.status}.`;
      return res.status(502).json({ error: { message: msg } });
    }
    const dosContext = body.dosContext !== false;
    return res.status(200).json({
      callSummary: typeof ai.data?.callSummary === 'string' ? ai.data.callSummary.trim() : '',
      patientActions: matchActions(ai.data?.patientActions, body.records, { allowDos: dosContext }),
    });
  } catch (err) {
    console.error('[outreach-summary] failed', err?.message || err);
    return res.status(500).json({ error: { message: 'Summary failed' } });
  }
}
