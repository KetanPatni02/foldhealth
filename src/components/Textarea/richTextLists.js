/**
 * Enter on an empty list item in the rich-text editor, so a second Enter
 * steps out of a list the way people expect:
 *
 *  - In a nested list, the empty item moves up a level into the parent
 *    list (a bullet inside item 1 becomes item 2 of the numbers).
 *  - In a bullet list that follows a numbered list (or the other way
 *    round), the empty item leaves the bullets and becomes the next number,
 *    in place: the bullets above stay above, the ones below move below.
 *
 * Enter at the start of a line right after an empty item (the empty item
 * a first Enter leaves above the line) does the same for that line: the
 * empty item goes and the line itself becomes the next item.
 *
 * Anything else is left to the browser, which ends the list.
 *
 * @param {HTMLElement} root – The contentEditable editor
 * @param {Selection} [sel]
 * @returns {boolean} true when it moved the item (the caller should then
 *   preventDefault and report the change)
 */
export function exitEmptyListItem(root, sel = window.getSelection()) {
  if (!root || !sel?.rangeCount || !sel.isCollapsed) return false;
  const anchor = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
  const current = anchor?.closest('li');
  if (!current || !root.contains(current)) return false;
  // Which item leaves the list: the one the caret is in when it's empty, or
  // (Enter pressed twice at the start of a line, which leaves an empty item
  // above) the line itself, with its text, once that empty item is dropped.
  const li = current;
  let emptyAbove = null; // removed only once the move is certain
  if (!isBlank(current)) {
    const prev = current.previousElementSibling;
    if (!caretAtStart(current, sel) || !prev || prev.tagName !== 'LI' || !isBlank(prev)) return false;
    emptyAbove = prev;
  }
  const list = li.parentElement;
  if (!list || !/^(UL|OL)$/.test(list.tagName)) return false;

  const parentLi = list.parentElement?.closest('li');
  if (parentLi && root.contains(parentLi)) {
    emptyAbove?.remove();
    // Up a level: the items after this one stay nested, now under it.
    const rest = [];
    for (let n = li.nextSibling; n; n = n.nextSibling) rest.push(n);
    parentLi.after(li);
    if (rest.length) {
      const sub = list.cloneNode(false);
      rest.forEach(n => sub.appendChild(n));
      li.appendChild(sub);
    }
    if (!list.children.length) list.remove();
  } else {
    // The nearest earlier list of the other kind (e.g. the numbers before
    // these bullets): the item leaves this list and becomes that list's
    // next item, right here, after the items above it.
    // It can sit inside the element before, e.g. <div><ol>…</ol></div>.
    let other = null;
    for (let prev = list.previousElementSibling; prev && !other; prev = prev.previousElementSibling) {
      const found = lastList(prev);
      if (found && found.tagName !== list.tagName) other = found;
    }
    if (!other) return false;
    emptyAbove?.remove();
    // Split this list at the item: items before stay, items after move below.
    const rest = [];
    for (let n = li.nextSibling; n; n = n.nextSibling) rest.push(n);
    const cont = document.createElement(other.tagName.toLowerCase());
    if (other.tagName === 'OL') cont.setAttribute('start', String(listEnd(other) + 1));
    list.after(cont);
    cont.appendChild(li);
    if (rest.length) {
      const tail = list.cloneNode(false);
      rest.forEach(n => tail.appendChild(n));
      cont.after(tail);
    } else {
      // A list of the same kind right below joins it, so its numbers run on
      // (2, 3, 4…) instead of starting again at 1.
      const next = cont.nextElementSibling;
      if (next?.tagName === cont.tagName) {
        while (next.firstChild) cont.appendChild(next.firstChild);
        next.remove();
      }
    }
    if (!list.children.length) list.remove();
  }

  // Keep the item editable and put the caret at its start.
  if (!li.firstChild) li.appendChild(document.createElement('br'));
  const range = document.createRange();
  range.setStart(li, 0);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  return true;
}

/** The number of an ordered list's last item, counting its `start`. */
function listEnd(ol) {
  const start = Number(ol.getAttribute('start')) || 1;
  return start + ol.children.length - 1;
}

/** An item with no text and no list of its own. */
function isBlank(li) {
  return !li.textContent.replace(/\u200b/g, '').trim() && !li.querySelector('ul, ol');
}

/** Whether the caret sits before any text in `el`. */
function caretAtStart(el, sel) {
  const range = document.createRange();
  range.setStart(el, 0);
  range.setEnd(sel.anchorNode, sel.anchorOffset);
  return !range.toString().replace(/\u200b/g, '').trim();
}

/**
 * Markdown-style list shortcuts, run when Space is pressed: at the start of
 * a line, "1." (any number) starts a numbered list from that number, and
 * "-" or "*" starts a bullet list. The typed marker is removed.
 *
 * @param {HTMLElement} root – The contentEditable editor
 * @param {Selection} [sel]
 * @returns {boolean} true when it made a list (the caller should then
 *   preventDefault and report the change)
 */
export function applyListShortcut(root, sel = window.getSelection()) {
  if (!root || !sel?.rangeCount || !sel.isCollapsed) return false;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== 3 || !root.contains(node)) return false;
  // In a numbered item, "- " (or "* ") at its start nests a bullet list
  // under the number above; any other marker inside a list is just text.
  const inItem = node.parentElement?.closest('li');
  if (inItem) {
    const typedHere = node.data.slice(0, sel.anchorOffset);
    if (!/^[-*]$/.test(typedHere) || node !== firstText(inItem) || inItem.parentElement.tagName !== 'OL') return false;
    if (inItem.previousElementSibling?.tagName !== 'LI') return false; // nothing above to nest under
    node.deleteData(0, typedHere.length);
    if (!node.data && !node.nextSibling) node.after(document.createElement('br'));
    keepCaret(sel, node, 0);
    return nestListItem(root, 'UL', sel);
  }
  // The line so far: this text node up to the caret, after any newline (the
  // editor is pre-wrap, so a newline ends a line), with nothing before it
  // in its block.
  const before = node.data.slice(0, sel.anchorOffset);
  const lineStart = before.lastIndexOf('\n') + 1;
  const typed = before.slice(lineStart);
  const match = typed.match(/^(\d+)\.$/) || typed.match(/^[-*]$/);
  if (!match) return false;
  if (lineStart === 0 && hasTextBefore(node, root)) return false;

  // The browser lists a whole run of text, and in this pre-wrap editor one
  // run can hold several lines. So the line being typed gets its own block
  // first; the lines before and after it stay as they were.
  let line = node;
  let at = lineStart;
  if (node.data.indexOf('\n', sel.anchorOffset) >= 0 || lineStart > 0) {
    line = lineStart > 0 ? node.splitText(lineStart) : node;
    if (line !== node) node.data = node.data.replace(/\n$/, '');
    const end = line.data.indexOf('\n', typed.length);
    const after = end >= 0 ? line.splitText(end) : null;
    const block = document.createElement('div');
    line.before(block);
    block.appendChild(line);
    if (after) {
      after.data = after.data.replace(/^\n/, '');
      block.after(after);
    }
    at = 0;
  }
  line.deleteData(at, typed.length);
  if (!line.data && !line.nextSibling) line.after(document.createElement('br'));
  const caret = document.createRange();
  caret.setStart(line, at);
  caret.collapse(true);
  sel.removeAllRanges();
  sel.addRange(caret);
  const ordered = typed !== '-' && typed !== '*';
  document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  if (ordered && Number(match[1]) > 1) {
    const anchor = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
    anchor?.closest('ol')?.setAttribute('start', match[1]);
  }
  return true;
}

/** Whether any text comes before `node` within its line's block. */
function hasTextBefore(node, root) {
  const block = node.parentElement?.closest('div, p') || root;
  const range = document.createRange();
  range.setStart(block === root ? root : block, 0);
  range.setEnd(node, 0);
  const text = range.toString();
  return !!text.slice(text.lastIndexOf('\n') + 1).trim();
}

/** `el` if it's a list, else the last list inside it (not one nested in an item). */
function lastList(el) {
  if (/^(UL|OL)$/.test(el.tagName)) return el;
  const lists = [...el.querySelectorAll('ul, ol')].filter(l => !l.parentElement.closest('li') || !el.contains(l.parentElement.closest('li')));
  return lists[lists.length - 1] || null;
}

/**
 * Numbers the editor's lists so a blank item (an empty line left between
 * items) is just space: it gets no bullet or number (`data-blank`, see the
 * editor CSS) and the numbers skip it, 1, 2, 3 across the items with text.
 * Run after every edit and whenever the editor's HTML is replaced.
 *
 * @param {HTMLElement} root – The contentEditable editor
 */
export function numberListItems(root) {
  if (!root) return;
  // Top-level numbered lists carry on from the one before, as in a word
  // processor: a bullet list or blank lines in between don't restart the
  // count, a line of text does. A list's own `start` (typed "5. ") wins.
  let carry = 1;
  [...root.childNodes].forEach((node) => {
    if (node.nodeType === 1 && node.tagName === 'OL') {
      carry = numberList(node, node.hasAttribute('start') ? Number(node.getAttribute('start')) || 1 : carry);
    } else if (node.nodeType === 1 && node.tagName === 'UL') {
      numberList(node, 1);
    } else if (node.textContent.replace(/\u200b/g, '').trim()) {
      // Text between lists; a wrapper <div> holding a list counts as that list.
      const inner = node.nodeType === 1 ? lastList(node) : null;
      if (inner?.tagName === 'OL' && !node.textContent.replace(inner.textContent, '').trim()) {
        carry = numberList(inner, inner.hasAttribute('start') ? Number(inner.getAttribute('start')) || 1 : carry);
      } else {
        carry = 1;
        if (node.nodeType === 1) node.querySelectorAll('ol, ul').forEach(l => numberList(l, Number(l.getAttribute('start')) || 1));
      }
    }
  });
}

/**
 * Numbers one list from `n` (and the lists nested in it from 1): blank items
 * are spacing, unnumbered; the others get their number as `value`.
 * @returns {number} The number the next item would take
 */
function numberList(list, n) {
  [...list.children].forEach((li) => {
    if (li.tagName !== 'LI') return;
    li.querySelectorAll(':scope > ol, :scope > ul').forEach(sub => numberList(sub, Number(sub.getAttribute('start')) || 1));
    const blank = isBlank(li);
    const hasCaret = li.contains(window.getSelection?.()?.anchorNode || null);
    // The item being typed into stays numbered, so a new line shows its
    // number straight away; any other empty one is spacing.
    if (blank && !hasCaret) {
      if (!li.hasAttribute('data-blank')) li.setAttribute('data-blank', '');
      li.removeAttribute('value');
      return;
    }
    li.removeAttribute('data-blank');
    if (list.tagName === 'OL') {
      if (li.getAttribute('value') !== String(n)) li.setAttribute('value', String(n));
      n += 1;
    }
  });
  return n;
}

// ── Nesting ──

/** The list item the caret is in, inside `root`, or null. */
function caretItem(root, sel) {
  if (!root || !sel?.rangeCount) return null;
  const anchor = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement;
  const li = anchor?.closest('li');
  return li && root.contains(li) ? li : null;
}

/** Puts the caret back where it was, after its item moved in the DOM. */
function keepCaret(sel, node, offset) {
  const range = document.createRange();
  range.setStart(node, Math.min(offset, node.nodeType === 3 ? node.length : node.childNodes.length));
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * Moves the caret's item into a list nested under the item above it: into
 * that item's last sublist when it's of `type`, else a new one. So a bullet
 * started inside a numbered list nests under the number above, instead of
 * turning the numbered item into a bullet.
 *
 * @param {'UL'|'OL'} [type] – The nested list's kind; defaults to the item's own list's
 * @returns {boolean} true when it nested the item
 */
export function nestListItem(root, type, sel = window.getSelection()) {
  const li = caretItem(root, sel);
  const prev = li?.previousElementSibling;
  if (!li || !prev || prev.tagName !== 'LI') return false;
  const kind = (type || li.parentElement.tagName).toUpperCase();
  const { anchorNode, anchorOffset } = sel;
  const last = prev.lastElementChild;
  const sub = last && last.tagName === kind ? last : prev.appendChild(document.createElement(kind.toLowerCase()));
  sub.appendChild(li);
  keepCaret(sel, anchorNode, anchorOffset);
  return true;
}

/**
 * Moves the caret's item out of a nested list, to just after the item it
 * was nested under; the items after it stay nested, now under it.
 *
 * @returns {boolean} true when it moved the item
 */
export function outdentListItem(root, sel = window.getSelection()) {
  const li = caretItem(root, sel);
  const list = li?.parentElement;
  const parentLi = list?.parentElement?.closest('li');
  if (!li || !parentLi || !root.contains(parentLi)) return false;
  const { anchorNode, anchorOffset } = sel;
  const rest = [];
  for (let n = li.nextSibling; n; n = n.nextSibling) rest.push(n);
  parentLi.after(li);
  if (rest.length) {
    const sub = list.cloneNode(false);
    rest.forEach(n => sub.appendChild(n));
    li.appendChild(sub);
  }
  if (!list.children.length) list.remove();
  keepCaret(sel, anchorNode, anchorOffset);
  return true;
}

// ── Pasting lists ──

const ORDERED_LINE = /^\s*(\d+)[.)]\s+(.*)$/;
const BULLET_LINE = /^\s*[-*•·▪◦‣]\s+(.*)$/;

const escapeHtml = (t) => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

/**
 * Plain text as editor HTML with its lists made real: runs of lines like
 * "1. …" become a numbered list (from that number) and "- …" / "• …" a
 * bullet list; other lines stay text, keeping their line breaks.
 *
 * @param {string} text
 * @returns {string|null} HTML, or null when the text has no list lines
 */
export function textToListHtml(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n');
  if (!lines.some(l => ORDERED_LINE.test(l) || BULLET_LINE.test(l))) return null;
  let html = '';
  let open = null; // 'ol' | 'ul'
  const close = () => { if (open) html += `</${open}>`; open = null; };
  lines.forEach((line) => {
    const ordered = line.match(ORDERED_LINE);
    const bullet = !ordered && line.match(BULLET_LINE);
    if (ordered || bullet) {
      const kind = ordered ? 'ol' : 'ul';
      if (open !== kind) {
        close();
        html += kind === 'ol' && Number(ordered[1]) > 1 ? `<ol start="${Number(ordered[1])}">` : `<${kind}>`;
        open = kind;
      }
      html += `<li>${escapeHtml(ordered ? ordered[2] : bullet[1]) || '<br>'}</li>`;
      return;
    }
    close();
    html += `<div>${escapeHtml(line) || '<br>'}</div>`;
  });
  close();
  return html;
}

/** The first text node in `el`. */
function firstText(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  return walker.nextNode();
}

/**
 * Backspace at the very start of a list item takes its bullet or number
 * away, as a word processor does: the item becomes a plain line where it
 * is, splitting its list (a nested item moves up a level instead). A second
 * Backspace then joins it to the line above, as usual.
 *
 * @returns {boolean} true when it changed the item
 */
export function unlistItem(root, sel = window.getSelection()) {
  const li = caretItem(root, sel);
  if (!li || !sel.isCollapsed || !caretAtStart(li, sel)) return false;
  const list = li.parentElement;
  const parentLi = list?.parentElement?.closest('li');
  if (parentLi && root.contains(parentLi)) return outdentListItem(root, sel);
  const { anchorNode, anchorOffset } = sel;
  const rest = [];
  for (let n = li.nextSibling; n; n = n.nextSibling) rest.push(n);
  const line = document.createElement('div');
  while (li.firstChild) line.appendChild(li.firstChild);
  if (!line.firstChild) line.appendChild(document.createElement('br'));
  list.after(line);
  if (rest.length) {
    // The items after it carry on numbering (see numberListItems).
    const tail = list.cloneNode(false);
    tail.removeAttribute('start');
    rest.forEach(n => tail.appendChild(n));
    line.after(tail);
  }
  li.remove();
  if (!list.children.length) list.remove();
  if (line.contains(anchorNode)) keepCaret(sel, anchorNode, anchorOffset);
  else keepCaret(sel, line, 0);
  return true;
}
