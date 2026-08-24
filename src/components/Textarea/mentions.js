// Mention primitives used by Textarea's richText mode. Kept in a separate
// file (not inline in Textarea.jsx) so a future rich-text-only primitive
// or a shared hook can reuse the same DOM contract: mention chips are
// atomic contenteditable="false" spans that serialize back to "@Name"
// tokens and expose a stable `data-mention-id` when the picker is running
// against real profile rows.

import badgeStyles from '../Badge/Badge.module.css';
import styles from './Textarea.module.css';

// Emit plain text from a richText editor node: text nodes verbatim,
// mention chips as "@Name", <br> as newline.
export function serializePlain(root) {
  if (!root) return '';
  let out = '';
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.nodeValue || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = /** @type {HTMLElement} */ (node);
      if (el.dataset?.mentionName) {
        out += `@${el.dataset.mentionName}`;
      } else if (el.tagName === 'BR') {
        out += '\n';
      } else {
        // Recurse — bold/italic/list wrappers hold plain text underneath.
        out += serializePlain(el);
      }
    }
  });
  return out;
}

// Build the DOM node for a mention chip. Rendering imperatively (rather
// than via <Badge/>) keeps the chip out of React's reconciliation path —
// which would otherwise fight the contenteditable's own DOM mutations —
// and lets us reuse Badge's CSS module classes for pixel-identical styling.
export function createMentionChip(user) {
  const chip = document.createElement('span');
  chip.contentEditable = 'false';
  chip.className = styles.mentionChip;
  chip.dataset.mentionName = user.name;
  if (user.realProfile && user.id) chip.dataset.mentionId = user.id;
  const badge = document.createElement('span');
  badge.className = `${badgeStyles.badge} ${badgeStyles.mention}`;
  badge.textContent = `@${user.name}`;
  chip.appendChild(badge);
  return chip;
}

// Collect mention chips actually present in the editor, in document order,
// deduped. Reads the DOM (chips are atoms) so a backspaced chip is
// correctly missing here.
export function collectMentions(root) {
  if (!root) return [];
  const seen = new Set();
  const out = [];
  root.querySelectorAll('[data-mention-name]').forEach((el) => {
    const name = el.dataset.mentionName;
    const id = el.dataset.mentionId || null;
    const key = id || name;
    if (!name || seen.has(key)) return;
    seen.add(key);
    out.push({ id, name });
  });
  return out;
}

// Detect the "@query" fragment before the caret. Walks the current text
// node backwards to the last "@" and returns { range, query } iff that
// "@" is at start-of-input or preceded by whitespace — otherwise null.
export function detectMention(editor) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;
  if (!editor.contains(range.startContainer)) return null;
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.nodeValue || '';
  const caret = range.startOffset;
  const upToCaret = text.slice(0, caret);
  const match = /(^|\s)@([^\s@]*)$/.exec(upToCaret);
  if (!match) return null;
  const atOffset = caret - match[2].length - 1;
  const atRange = document.createRange();
  atRange.setStart(node, atOffset);
  atRange.setEnd(node, caret);
  return { range: atRange, query: match[2] };
}

// Place the caret immediately after `node`.
export function caretAfter(node) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}
