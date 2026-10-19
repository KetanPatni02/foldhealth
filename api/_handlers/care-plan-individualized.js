/**
 * POST /api/care-plan-individualized
 *
 * Individualized Plan AI. The client sends the patient's numbered facts
 * (conditions, lab trends, recent events, assessments, barriers), the
 * published templates and a compact library catalog; Gemini picks the best
 * templates and drafts a tailored GBI set, each item citing facts.
 * normalizeIndividualizedDraft keeps only what's grounded in those inputs.
 * GOOGLE_AI_API_KEY stays server-side.
 *
 * Body: { facts, templates, catalog, programName }
 * Returns: { draft } or { error: { message } }
 */

import { geminiGenerateContent } from '../_lib/googleGemini.js';
import { requireUser } from '../_lib/requireUser.js';
import {
  INDIVIDUALIZED_SCHEMA,
  buildIndividualizedPrompt,
  normalizeIndividualizedDraft,
} from '../../src/features/patient/right-panel/tabs/care-programs/care-plan/lib/individualizedPlan.js';

const asList = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) return res.status(500).json({ error: { message: 'AI drafting is not set up on this deployment (GOOGLE_AI_API_KEY is missing).' } });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const facts = asList(body.facts, 80).filter(f => f && typeof f.id === 'string' && typeof f.text === 'string');
  if (!facts.length) {
    return res.status(400).json({ error: { message: 'There’s nothing on this patient’s record to plan from yet (conditions, labs, events, assessments or barriers).' } });
  }
  const templates = asList(body.templates, 150);
  const catalog = {
    goals: asList(body.catalog?.goals, 400),
    interventions: asList(body.catalog?.interventions, 400),
    barriers: asList(body.catalog?.barriers, 400),
  };

  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: buildIndividualizedPrompt({ facts, templates, catalog, programName: String(body.programName || '').slice(0, 100) }) }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: INDIVIDUALIZED_SCHEMA,
      thinkingConfig: { thinkingLevel: 'low' },
    },
  };

  try {
    const { response: upstream, model } = await geminiGenerateContent({
      apiKey: key, requestBody, logTag: 'care-plan-individualized', timeoutMs: 30000, deadlineMs: 75000,
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('[care-plan-individualized] gemini error', upstream.status, model, detail.slice(0, 400));
      return res.status(502).json({ error: { message: [503, 504, 429].includes(upstream.status)
        ? 'The AI service is busy right now. Please try again in a moment.'
        : 'Could not draft the plan. Please try again.' } });
    }
    const json = await upstream.json();
    const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    let parsed;
    try { parsed = JSON.parse(text); } catch {
      console.error('[care-plan-individualized] non-JSON:', text.slice(0, 500));
      return res.status(502).json({ error: { message: 'The AI returned an unreadable plan. Please try again.' } });
    }
    const draft = normalizeIndividualizedDraft(parsed, { facts, templates, catalog });
    if (!draft) return res.status(422).json({ error: { message: 'Could not draft goals grounded in this patient’s record. Add conditions or recent labs and try again.' } });
    return res.status(200).json({ draft });
  } catch (err) {
    console.error('[care-plan-individualized]', err?.message || err);
    return res.status(502).json({ error: { message: 'Could not reach the AI service. Please try again.' } });
  }
}
