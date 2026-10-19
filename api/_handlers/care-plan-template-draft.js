/**
 * POST /api/care-plan-template-draft
 *
 * Drafts a care plan template from a plain-English description via Gemini.
 * The client sends the description and a compact catalog of the care plan
 * library; the answer is checked against that catalog (normalizeTemplateDraft)
 * so every library reference is real. GOOGLE_AI_API_KEY stays server-side.
 *
 * Body: { description: string, catalog: { goals, interventions, barriers } }
 * Returns: { draft } or { error: { message } }
 */

import { geminiGenerateContent } from '../_lib/googleGemini.js';
import { requireUser } from '../_lib/requireUser.js';
import {
  TEMPLATE_DESCRIPTION_MAX,
  TEMPLATE_DRAFT_SCHEMA,
  buildTemplateDraftPrompt,
  normalizeTemplateDraft,
} from '../../src/features/settings/care-plan-library/lib/aiTemplateDraft.js';

const asList = (v) => (Array.isArray(v) ? v : []);

export default async function handler(req, res) {
  if (!(await requireUser(req, res))) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  const key = process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: { message: 'AI drafting is not set up on this deployment (GOOGLE_AI_API_KEY is missing).' } });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length < 10) {
    return res.status(400).json({ error: { message: 'Describe the template in a sentence or two.' } });
  }
  if (description.length > TEMPLATE_DESCRIPTION_MAX) {
    return res.status(400).json({ error: { message: `Keep the description under ${TEMPLATE_DESCRIPTION_MAX} characters.` } });
  }
  const catalog = {
    goals: asList(body.catalog?.goals),
    interventions: asList(body.catalog?.interventions),
    barriers: asList(body.catalog?.barriers),
  };

  const requestBody = {
    contents: [{ role: 'user', parts: [{ text: buildTemplateDraftPrompt(description, catalog) }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: TEMPLATE_DRAFT_SCHEMA,
      // Matching a description to the catalog needs little reasoning; low
      // thinking roughly halves the wait.
      thinkingConfig: { thinkingLevel: 'low' },
    },
  };

  try {
    const { response: upstream, model } = await geminiGenerateContent({
      apiKey: key,
      requestBody,
      logTag: 'care-plan-template-draft',
      // A stalled call fails over instead of leaving the editor waiting; a
      // busy model's quick 503 falls through to the next, within a minute.
      timeoutMs: 25000,
      deadlineMs: 60000,
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error('[care-plan-template-draft] gemini error', upstream.status, model, detail.slice(0, 400));
      const message = [503, 504, 429].includes(upstream.status)
        ? 'The AI service is busy right now. Please try again in a moment.'
        : 'Could not draft the template. Please try again.';
      return res.status(502).json({ error: { message } });
    }

    const json = await upstream.json();
    const text = json?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('[care-plan-template-draft] non-JSON:', text.slice(0, 500));
      return res.status(502).json({ error: { message: 'The AI returned an unreadable draft. Please try again.' } });
    }

    const draft = normalizeTemplateDraft(parsed, catalog);
    if (!draft) {
      return res.status(422).json({ error: { message: 'Could not draft goals from that description. Try adding the condition or focus.' } });
    }
    return res.status(200).json({ draft });
  } catch (err) {
    console.error('[care-plan-template-draft]', err?.message || err);
    return res.status(502).json({ error: { message: 'Could not reach the AI service. Please try again.' } });
  }
}
