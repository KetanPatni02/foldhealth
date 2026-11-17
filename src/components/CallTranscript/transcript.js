// A call transcript as text, one turn per line: "Speaker (07:09): what was said".
// The time is optional ("Speaker: text"). The note's transcript block puts
// the speaker on its own line ("Speaker - 07:09") with the text below. A line
// that doesn't start a turn continues the turn above it.
const TURN = /^([^:()\n]{1,60}?)\s*(?:\((\d{1,2}:\d{2}(?::\d{2})?)\))?\s*:\s+(.+)$/;
const HEAD = /^([^:()\n]{1,60}?)\s+-\s+(\d{1,2}:\d{2}(?::\d{2})?)$/;

/** Text → [{ speaker, t, text }]. */
export function parseTranscript(text) {
  const lines = [];
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const h = HEAD.exec(line);
    if (h) { lines.push({ speaker: h[1].trim(), t: h[2], text: '' }); continue; }
    const m = TURN.exec(line);
    if (m) lines.push({ speaker: m[1].trim(), t: m[2] || '', text: m[3].trim() });
    else if (lines.length) {
      const last = lines[lines.length - 1];
      last.text = last.text ? `${last.text} ${line}` : line;
    }
    else lines.push({ speaker: '', t: '', text: line });
  }
  return lines;
}

/** [{ speaker, t, text }] → text, the inverse of parseTranscript. */
export function formatTranscript(lines) {
  return (lines || [])
    .map(l => (l.speaker ? `${l.speaker}${l.t ? ` (${l.t})` : ''}: ${l.text}` : l.text))
    .join('\n');
}

/** Lines → the note's transcript block: "Speaker - 07:09", then what was said. */
export function formatTranscriptBlock(lines) {
  return (lines || [])
    .map(l => (l.speaker ? `${l.speaker}${l.t ? ` - ${l.t}` : ''}\n${l.text}` : l.text))
    .join('\n');
}

/** "Dr. Katherine Moss" → "KM" (titles skipped). */
export function speakerInitials(name) {
  const words = String(name || '').replace(/^(dr|mr|mrs|ms)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] || '') + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase() || '?';
}
