// Which Fold practice number (an SMS inbox in Settings > Messages > Inboxes)
// an SMS went through, so staff reply from the right line and keep the
// program or location in context.
//
// Each SMS records its own line when it's sent or received: the number in
// to_addr (inbound) or from_addr (outbound) and the line's label in
// meta.line_label, as they were at that moment. A later relabel, reassignment
// or port therefore never rewrites what a message shows. Messages saved
// before that fall back to the conversation's inbox.
import { formatPhone } from './commsUtils';

export const LINE_LABEL_MAX = 30;

/** The name shown for a line: its display label, else its inbox name. */
export const lineName = (inbox) => String(inbox?.label || '').trim() || inbox?.name || '';

/** The parts of a line a message keeps: number, label, inbox. */
export function lineSnapshot(inbox) {
  if (!inbox?.address) return null;
  return { number: inbox.address, label: lineName(inbox), inboxId: inbox.id || null };
}

/** An SMS text (not a call, email or internal note). */
export const isSmsMessage = (m) => m?.kind === 'message' && !m.internal;

/**
 * The practice line a message used: its own recorded number and label, or,
 * for a message saved before lines were recorded, the conversation's line.
 */
export function messageLine(m, conversationLine) {
  if (!isSmsMessage(m)) return null;
  const number = m.direction === 'in' ? m.to_addr : m.from_addr;
  if (number) return { number, label: m.meta?.line_label || '' };
  return conversationLine ? { number: conversationLine.number, label: conversationLine.label } : null;
}

/** "Received on: +1 (775) 555-0100 · Main Clinic Line" / "Sent from: …". */
export function lineText(m, line) {
  if (!line?.number) return '';
  const label = line.label ? ` · ${line.label}` : '';
  return `${m.direction === 'in' ? 'Received on' : 'Sent from'}: ${formatPhone(line.number)}${label}`;
}

/**
 * The line the thread is on now: the newest SMS's own line (a patient who
 * switched numbers shows the latest), else the conversation's.
 */
export function threadLine(messages, conversationLine) {
  for (let i = (messages || []).length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (!isSmsMessage(m)) continue;
    const number = m.direction === 'in' ? m.to_addr : m.from_addr;
    if (number) return { number, label: m.meta?.line_label || '' };
  }
  return conversationLine || null;
}

/**
 * Whether threads show the practice line: always with more than one SMS line
 * (staff must know which one to answer from), otherwise per the practice's
 * "Always display incoming number in SMS threads" setting.
 */
export const showPracticeLine = (smsLineCount, alwaysShow) => smsLineCount > 1 || alwaysShow !== false;

/** Problem with a display label, or null. Empty clears it (the inbox name shows). */
export function validateLineLabel(label) {
  if (String(label || '').trim().length > LINE_LABEL_MAX) return `Keep the label to ${LINE_LABEL_MAX} characters or fewer`;
  return null;
}
