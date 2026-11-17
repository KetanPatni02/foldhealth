import { apiFetch } from '../../../lib/apiFetch';
import { getOpenIcdsForMember } from '../data/icds';

/** The patient's open HCCs, ICDs and DOSs, as the summary matches against. */
export function patientRecords(member, { dosContext = true } = {}) {
  const icds = member?.name ? getOpenIcdsForMember(member.name).all : [];
  const hccs = [...new Set(icds
    .map(i => /^HCC\s*\d+/i.exec(i.hcc || '')?.[0])
    .filter(Boolean))];
  return {
    hccs,
    icds: [...new Set(icds.map(i => i.code).filter(Boolean))],
    dos: dosContext ? (member?.dos_list || []).map(d => d.date).filter(Boolean) : [],
  };
}

/** True when the entry has text the summary can read. */
export const hasSummaryText = (entry) => !!(entry.transcript || entry.emailBody || entry.notes);

/**
 * AI summary for one outreach entry (api/_handlers/outreach-summary.js).
 * Resolves { aiStatus: 'ready', aiCallSummary, aiPatientActions } or
 * { aiStatus: 'unavailable' } on any failure; never throws.
 */
export async function summarizeOutreach(entry, member, { dosContext = true } = {}) {
  try {
    const res = await apiFetch('/api/outreach-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: member?.name,
        text: {
          transcript: entry.transcript || undefined,
          email: entry.emailBody ? `${entry.emailSubject || ''}\n${entry.emailBody}` : undefined,
          notes: entry.notes || undefined,
        },
        records: patientRecords(member, { dosContext }),
        dosContext,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || typeof json.callSummary !== 'string') return { aiStatus: 'unavailable' };
    return { aiStatus: 'ready', aiCallSummary: json.callSummary, aiPatientActions: json.patientActions || [] };
  } catch {
    return { aiStatus: 'unavailable' };
  }
}

/**
 * PCP Outreach drafts, one per selected patient (api/_handlers/pcp-outreach-split.js).
 * Resolves { ok: true, drafts, unassigned, mentionedNotSelected } or { ok: false }.
 */
export async function splitPcpOutreach({ pcpName, text, patients }) {
  try {
    const res = await apiFetch('/api/pcp-outreach-split', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pcpName,
        text,
        dosContext: true,
        patients: patients.map(p => ({ key: p.key, name: p.name, dob: p.dob, memberId: p.memberId, records: patientRecords(p.member) })),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(json.drafts)) return { ok: false };
    return { ok: true, drafts: json.drafts, unassigned: json.unassigned || [], mentionedNotSelected: json.mentionedNotSelected || [] };
  } catch {
    return { ok: false };
  }
}
