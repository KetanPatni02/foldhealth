/**
 * POST /api/pcp-outreach-split
 *
 * PCP Outreach: one call, email or visit with a PCP office about several of
 * its patients. Drafts one entry per SELECTED patient with only that
 * patient's part. The model never picks patients: it matches only against
 * the selected ones (name plus DOB or Member ID), flags low-confidence
 * matches with the purpose and any DOS mentioned, and lists patients it heard
 * but the user didn't select. The suggestion for a flagged part, record
 * matching and "No discussion found" are decided in _lib/pcpSplit.js.
 *
 * Body: { pcpName, text: { transcript?, email?, notes? }, dosContext?,
 *         patients: [{ key, name, dob, memberId, records: { hccs, icds, dos } }] }
 * Returns: { drafts, unassigned, mentionedNotSelected } (see buildSplit)
 */

import { requireUser } from '../_lib/requireUser.js';
import { bodyWithinLimit } from '../_lib/limits.js';
import { aiBusy, aiConfigured, generateJson } from '../_lib/aiJson.js';
import { buildSplit } from '../_lib/pcpSplit.js';

const ATTEMPT_TIMEOUT_MS = 30000;
const MAX_TEXT = 40000;
const MAX_PATIENTS = 40;

const REF = {
  type: 'object',
  properties: { type: { type: 'string', enum: ['HCC', 'ICD', 'DOS'] }, id: { type: 'string' } },
  required: ['type', 'id'],
};
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    drafts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          patientKey: { type: 'string' },
          summary: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'low'] },
          flagReason: { type: 'string' },
          purpose: { type: 'string' },
          mentionedDos: { type: 'string' },
          actions: {
            type: 'array',
            items: { type: 'object', properties: { text: { type: 'string' }, refs: { type: 'array', items: REF } }, required: ['text', 'refs'] },
          },
        },
        required: ['patientKey', 'summary', 'confidence', 'actions'],
      },
    },
    unassigned: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, purpose: { type: 'string' }, mentionedDos: { type: 'string' } },
        required: ['text'],
      },
    },
    mentionedNotSelected: {
      type: 'array',
      items: { type: 'object', properties: { name: { type: 'string' }, memberId: { type: 'string' } }, required: ['name'] },
    },
  },
  required: ['drafts', 'unassigned', 'mentionedNotSelected'],
};

const clip = (s) => String(s || '').slice(0, MAX_TEXT);

function buildPrompt({ pcpName = 'the PCP office', text = {}, patients = [], dosContext = true }) {
  const roster = patients.map(p => ({
    patientKey: String(p.key),
    name: p.name,
    dob: p.dob || null,
    memberId: p.memberId || null,
    hccs: p.records?.hccs || [],
    icds: p.records?.icds || [],
    ...(dosContext ? { openDos: p.records?.dos || [] } : {}),
  }));
  return [
    `A risk adjustment team member had one outreach with ${pcpName} about several patients.`,
    'Split it into one draft per patient in the roster below.',
    '',
    'Rules:',
    '- Only use patients from the roster. Never add a patient. Match a mention to a roster',
    '  patient by name plus DOB or Member ID. Patients are often referred to by Member ID.',
    '- Each draft holds ONLY that patient\'s part: never mention other patients in it.',
    '- summary: 1 to 3 plain sentences on what was discussed or agreed for that patient.',
    `- actions: each concrete action for that patient, with refs to every HCC, ICD${dosContext ? ' and DOS (MM/DD/YYYY)' : ''} it mentions.`,
    '- If a match is uncertain (first name only, two similar names, no DOB or Member ID), set',
    '  confidence "low", say why in flagReason, give the purpose of that part (for example',
    '  "document retrieval") and any DOS mentioned in mentionedDos.',
    '- A roster patient nothing was said about: leave them out of drafts.',
    '- Content you cannot tie to any roster patient goes in unassigned (with purpose and any DOS).',
    '- Patients mentioned who are NOT in the roster go in mentionedNotSelected (name, Member ID if said).',
    '- Use only what the conversation says. Never invent.',
    '',
    'Roster (JSON):',
    JSON.stringify(roster),
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
    console.error('[pcp-outreach-split] no AI key is set');
    return res.status(500).json({ error: { message: 'AI drafting is not set up on this deployment.' } });
  }
  if (!bodyWithinLimit(req, res, 400 * 1024)) return;
  const body = req.body && typeof req.body === 'object' ? req.body : null;
  const patients = Array.isArray(body?.patients) ? body.patients.slice(0, MAX_PATIENTS) : [];
  const text = body?.text || {};
  if (!patients.length) return res.status(400).json({ error: { message: 'Select at least one patient' } });
  if (!text.transcript && !text.email && !text.notes) return res.status(400).json({ error: { message: 'Nothing to split' } });

  try {
    const dosContext = body.dosContext !== false;
    const ai = await generateJson({
      prompt: buildPrompt({ ...body, patients, dosContext }),
      schema: RESPONSE_SCHEMA,
      name: 'pcp_outreach_split',
      temperature: 0.1,
      logTag: 'pcp-outreach-split',
      timeoutMs: ATTEMPT_TIMEOUT_MS,
      deadlineMs: ATTEMPT_TIMEOUT_MS * 2,
    });
    if (!ai.ok) {
      const msg = aiBusy(ai.status) ? 'The AI service is busy right now.' : `AI service returned ${ai.status}.`;
      return res.status(502).json({ error: { message: msg } });
    }
    return res.status(200).json(buildSplit(ai.data, patients, { allowDos: dosContext }));
  } catch (err) {
    console.error('[pcp-outreach-split] failed', err?.message || err);
    return res.status(500).json({ error: { message: 'Drafting failed' } });
  }
}
