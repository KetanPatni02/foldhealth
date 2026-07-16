import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../Button/Button';
import { Avatar } from '../Avatar/Avatar';
import { SYSTEM_USERS } from '../../features/hcc/systemUsers';
import styles from './CommentComposer.module.css';

/**
 * CommentComposer — shared textarea + Comment/Cancel actions used by the
 * TaskDetailDrawer and the DiagPanel Comments tab. Starts as a single-line
 * placeholder and expands to a 3-row textarea on focus with primary /
 * secondary action buttons.
 *
 * Supports @mention: typing "@" opens a portaled list of platform users
 * (falls back to the SYSTEM_USERS mock while the fetch is warming). The
 * query keeps refining as the user types after the "@"; selecting a name
 * replaces the fragment with "@<Name> ".
 *
 * Props:
 *  - onSubmit(text)         Fires when the user clicks Comment. Trimmed body
 *                           is passed; parent clears its own state via return.
 *  - placeholder            Overrides the default placeholder.
 *  - autoFocus              Focus the textarea on mount.
 */
export function CommentComposer({
  onSubmit,
  placeholder = 'Add a comment, use @ to mention someone',
  autoFocus = false,
}) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(autoFocus);
  const textareaRef = useRef(null);

  // ── Mention picker state ──────────────────────────────────────────────
  const [mention, setMention] = useState(null); // { start, query } | null
  const [mentionIdx, setMentionIdx] = useState(0);
  const platformUsers = useAppStore(s => s.platformUsers);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  useEffect(() => { fetchPlatformUsers?.(); }, [fetchPlatformUsers]);
  // Fall back to the mock so the picker still renders before the fetch lands.
  const users = useMemo(
    () => (platformUsers?.length ? platformUsers : SYSTEM_USERS),
    [platformUsers],
  );
  const matches = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    const filtered = q
      ? users.filter(u => (u.name || '').toLowerCase().includes(q))
      : users;
    return filtered.slice(0, 8);
  }, [users, mention]);
  useEffect(() => { setMentionIdx(0); }, [mention?.query]);

  // Detect the trailing "@word" fragment before the caret. If present and the
  // "@" is at start-of-input or preceded by whitespace, open the picker.
  const detectMention = (value, caret) => {
    const upToCaret = value.slice(0, caret);
    const match = /(^|\s)@([^\s@]*)$/.exec(upToCaret);
    if (!match) return null;
    return { start: caret - match[2].length - 1, query: match[2] };
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setText(value);
    setMention(detectMention(value, e.target.selectionStart ?? value.length));
  };
  const handleSelect = (e) => {
    setMention(detectMention(e.target.value, e.target.selectionStart ?? 0));
  };

  const insertMention = (name) => {
    const el = textareaRef.current;
    if (!el || !mention) return;
    const caret = el.selectionStart ?? text.length;
    const before = text.slice(0, mention.start);
    const after = text.slice(caret);
    // Names with spaces are legal — we still emit them raw. Downstream code
    // can parse them via /@([\w]+(?:\s+[\w]+)*)/ or with a token-based store.
    const inserted = `@${name} `;
    const next = before + inserted + after;
    setText(next);
    setMention(null);
    // Restore caret + focus after React re-renders.
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    onSubmit?.(body);
    setText('');
    setExpanded(false);
    setMention(null);
  };
  const cancel = () => {
    setText('');
    setExpanded(false);
    setMention(null);
  };

  const handleKeyDown = (e) => {
    if (mention && matches.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIdx((i) => (i + 1) % matches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIdx((i) => (i - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(matches[mentionIdx].name);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
  };

  return (
    <div className={styles.wrap}>
      <textarea
        ref={textareaRef}
        placeholder={placeholder}
        rows={expanded ? 3 : 1}
        className={styles.textarea}
        value={text}
        autoFocus={autoFocus}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleSelect}
        onClick={handleSelect}
        onFocus={() => setExpanded(true)}
        onBlur={() => {
          // Delay closing so click on a menu item can register.
          setTimeout(() => setMention(null), 150);
        }}
      />
      {mention && matches.length > 0 && textareaRef.current && (
        <MentionMenu
          anchor={textareaRef.current}
          matches={matches}
          activeIdx={mentionIdx}
          onPick={insertMention}
        />
      )}
      {expanded && (
        <div className={styles.actions}>
          <Button variant="primary" size="S" disabled={!text.trim()} onClick={submit}>
            Comment
          </Button>
          <Button variant="secondary" size="S" onClick={cancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function MentionMenu({ anchor, matches, activeIdx, onPick }) {
  const [pos, setPos] = useState(null);
  useEffect(() => {
    const compute = () => {
      const r = anchor.getBoundingClientRect();
      const margin = 8;
      const menuH = Math.min(280, 40 + matches.length * 40);
      const spaceBelow = window.innerHeight - r.bottom - margin;
      const flipUp = spaceBelow < menuH && r.top > menuH + margin;
      const top = flipUp ? Math.max(margin, r.top - menuH - 4) : r.bottom + 4;
      setPos({ top, left: r.left, width: Math.max(r.width, 240) });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [anchor, matches.length]);

  if (!pos) return null;

  return createPortal(
    <div className={styles.mentionMenu} style={{ top: pos.top, left: pos.left, width: pos.width }}>
      {matches.map((u, i) => (
        <button
          key={u.id || u.name}
          type="button"
          className={[styles.mentionItem, i === activeIdx ? styles.mentionItemActive : ''].join(' ')}
          onMouseDown={(e) => { e.preventDefault(); onPick(u.name); }}
        >
          <Avatar variant="provider" size={24} initials={u.initials || (u.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2)} />
          <span className={styles.mentionName}>{u.name}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
