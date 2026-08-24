import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import { Avatar } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import { Tooltip } from '../Tooltip/Tooltip';
import {
  serializePlain,
  createMentionChip,
  collectMentions,
  detectMention,
  caretAfter,
} from './mentions';
import styles from './Textarea.module.css';

/**
 * Fold Health Textarea (Figma Fold-Pixel 5786:1273 / 25:78337).
 *
 * Two shapes in one component so consumers can grow from a plain
 * multi-line input into the full labeled + toolbar treatment without
 * swapping components:
 *
 *   • Plain — no `title`, `richText`, `supportingText`, `bottomButton`,
 *     `speechToText`, `maxLength`, `mandatory`, or `info` prop. Renders a
 *     bare <textarea> exactly like it always has. Existing consumers
 *     don't need to change.
 *
 *   • Enhanced — any of the props above are set. Renders the labeled
 *     card: header (title + optional info + required "*"), body
 *     (contentEditable in `richText` mode, else <textarea>), footer
 *     (formatting toolbar, speech-to-text, character counter, and an
 *     optional primary CTA), and a supporting-text helper below.
 *
 * States (Figma 25:78337):
 *   • default (placeholder) / hover / focus
 *   • filled
 *   • error   → red border + light-red fill (see `variant='error'`)
 *   • disabled
 */
export const Textarea = forwardRef(function Textarea({
  variant = 'default',
  className,
  rows = 3,
  disabled,
  // Enhanced-mode props — presence toggles the labeled/card layout.
  //
  // `title`, `supportingText` and `info` each accept BOTH a string and a
  // boolean so callers can flip them on/off from a design-system control
  // (Storybook, code-connect) without hunting for a default label.
  //   true          → render the region with the default text below
  //   'My label'    → render with that string
  //   false / null  → omit the region entirely
  //
  // `showInfo` + `infoText` are Input's shape and win when both are passed,
  // so callers already using Input's contract don't have to relearn it.
  title,
  showInfo = false,
  infoText,
  info,
  mandatory = false,
  supportingText,
  richText = false,
  maxLength,
  bottomButton,          // { label, onClick, disabled, variant }
  speechToText = false,
  onSpeechClick,
  attachment = false,    // boolean toggle (attaches paperclip button) OR { onClick } / accept
  onAttachmentClick,
  onAttachmentFiles,     // (FileList) → parent handles the upload
  moreActions,           // [{ icon, label, onClick, disabled }] — appended to the toolbar
  // Mentions — richText-only. Pass an array of `{ id, name, initials, role?
  // realProfile? }` and the editor will pop a picker on "@". `onMentionSelect`
  // and `onMentionsChange` mirror CommentComposer's contract so consumers
  // moving off it don't have to relearn the callback shape.
  mentions = false,
  mentionUsers,
  onMentionsChange,
  onChange,
  value,
  defaultValue,
  placeholder = 'Enter Task Title',
  ...rest
}, ref) {
  // Resolve string-or-boolean toggles → the string that actually renders.
  const titleText = title === true ? 'Title' : (title || null);
  const supportingTextText = supportingText === true
    ? 'This is supporting text'
    : (supportingText || null);
  // Info supports either shape: `showInfo` + `infoText` (Input's shape) OR
  // `info` alone (`true` → default tooltip, string → that tooltip).
  const infoResolved = showInfo
    ? (infoText || 'More info')
    : (info === true ? 'More info' : (info || null));

  // Attachment / speech-to-text / bottomButton / moreActions are all
  // richText-only affordances so they don't contribute to the enhanced
  // gate on their own — see `showFooter` below. Only real label + helper
  // props (title, info, mandatory, supportingText, maxLength) or richText
  // itself toggle the enhanced layout.
  const enhanced = !!(titleText || infoResolved || mandatory || supportingTextText || richText ||
                     maxLength);

  if (!enhanced) {
    // Legacy plain textarea — untouched contract.
    const cls = [
      styles.textarea,
      variant === 'error' ? styles.textareaError : '',
      className || '',
    ].filter(Boolean).join(' ');
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cls}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        maxLength={maxLength}
        {...rest}
      />
    );
  }

  return (
    <EnhancedTextarea
      ref={ref}
      variant={variant}
      className={className}
      rows={rows}
      disabled={disabled}
      title={titleText}
      info={infoResolved}
      mandatory={mandatory}
      supportingText={supportingTextText}
      richText={richText}
      maxLength={maxLength}
      bottomButton={bottomButton}
      speechToText={speechToText}
      onSpeechClick={onSpeechClick}
      attachment={attachment}
      onAttachmentClick={onAttachmentClick}
      onAttachmentFiles={onAttachmentFiles}
      moreActions={moreActions}
      mentions={mentions}
      mentionUsers={mentionUsers}
      onMentionsChange={onMentionsChange}
      onChange={onChange}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      {...rest}
    />
  );
});

// ────────────────────────────────────────────────────────────────────────
// Enhanced layout — labeled card with optional rich-text toolbar. Kept as
// an inner component so the exported Textarea can still forward its ref
// to the underlying editor node in either shape.

// Custom bullet-list glyph — Solar's list icons don't include the leading
// dot markers, so we ship a hand-drawn SVG at 1px stroke to match the
// design-system icon weight. Kept inline so it lives with the toolbar
// definition instead of a one-off shared file.
const BulletListIcon = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="3" cy="4"  r="1" fill={color} />
    <circle cx="3" cy="8"  r="1" fill={color} />
    <circle cx="3" cy="12" r="1" fill={color} />
    <line x1="6" y1="4"  x2="14" y2="4"  stroke={color} strokeWidth="1" strokeLinecap="round" />
    <line x1="6" y1="8"  x2="14" y2="8"  stroke={color} strokeWidth="1" strokeLinecap="round" />
    <line x1="6" y1="12" x2="14" y2="12" stroke={color} strokeWidth="1" strokeLinecap="round" />
  </svg>
);

// Attachment is a slot the parent wires up (file input, upload drawer, …)
// so it renders outside the formatting toggles that just call execCommand.
// Order matches Figma: Bold | Italic | Underline | Strikethrough | Bullets.
const RICH_TOOLBAR = [
  { cmd: 'bold',                icon: 'solar:text-bold-linear',      label: 'Bold' },
  { cmd: 'italic',              icon: 'solar:text-italic-linear',    label: 'Italic' },
  { cmd: 'underline',           icon: 'solar:text-underline-linear', label: 'Underline' },
  { cmd: 'strikeThrough',       icon: 'solar:text-cross-linear',     label: 'Strikethrough' },
  { cmd: 'insertUnorderedList', icon: <BulletListIcon />,            label: 'Bullet list' },
];

// eslint-disable-next-line no-unused-vars — split out purely for readability
const EnhancedTextarea = forwardRef(function EnhancedTextarea({
  variant,
  className,
  rows,
  disabled,
  title,
  info,
  mandatory,
  supportingText,
  richText,
  maxLength,
  bottomButton,
  speechToText,
  onSpeechClick,
  attachment,
  onAttachmentClick,
  onAttachmentFiles,
  moreActions,
  mentions,
  mentionUsers,
  onMentionsChange,
  onChange,
  value,
  defaultValue,
  placeholder,
  ...rest
}, ref) {
  const isControlled = value !== undefined;
  const initial = isControlled ? value : (defaultValue ?? '');
  const [text, setText] = useState(initial);
  const [focused, setFocused] = useState(false);
  const editorRef = useRef(null);

  // Attach the forwarded ref to the underlying editable node so callers
  // can focus / measure the input in either shape.
  const setRefs = useCallback((el) => {
    editorRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  }, [ref]);

  // Keep controlled contentEditable in sync — otherwise React's reconciler
  // never touches innerHTML after mount and the field ignores prop updates.
  useEffect(() => {
    if (!richText || !isControlled) return;
    if (editorRef.current && editorRef.current.innerHTML !== (value ?? '')) {
      editorRef.current.innerHTML = value ?? '';
    }
  }, [richText, isControlled, value]);

  const plainLen = richText
    ? (editorRef.current?.innerText?.length ?? plainTextLen(text))
    : text.length;

  const handleTextareaChange = (e) => {
    if (!isControlled) setText(e.target.value);
    onChange?.(e.target.value, e);
  };

  // ── Mention state (richText only) ──────────────────────────────────
  const mentionsOn = !!(richText && mentions && Array.isArray(mentionUsers));
  const [mentionCtx, setMentionCtx] = useState(null); // { range, query } | null
  const [mentionIdx, setMentionIdx] = useState(0);
  const mentionMatches = useMemo(() => {
    if (!mentionCtx || !mentionsOn) return [];
    const q = (mentionCtx.query || '').toLowerCase();
    const pool = mentionUsers || [];
    const filtered = q
      ? pool.filter(u => (u.name || '').toLowerCase().includes(q))
      : pool;
    return filtered.slice(0, 8);
  }, [mentionCtx, mentionsOn, mentionUsers]);
  useEffect(() => { setMentionIdx(0); }, [mentionCtx?.query]);

  const handleRichInput = () => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    // Use the shared serializer so mention chips report as "@Name" and
    // don't inflate the plain-text length with their inner HTML.
    const plain = mentionsOn ? serializePlain(el) : (el.innerText || '');
    // Enforce maxLength on the serialized plain-text length so the counter
    // and the cap agree (an <b>bold</b> tag doesn't cost characters).
    if (maxLength && plain.length > maxLength) {
      el.innerHTML = text;
      return;
    }
    if (!isControlled) setText(html);
    onChange?.(html, plain);
    if (mentionsOn) {
      setMentionCtx(detectMention(el));
      onMentionsChange?.(collectMentions(el));
    }
  };

  const handleRichSelect = () => {
    if (!mentionsOn) return;
    const el = editorRef.current;
    if (!el) return;
    setMentionCtx(detectMention(el));
  };

  const insertMentionChip = (user) => {
    const el = editorRef.current;
    if (!el || !mentionCtx) return;
    el.focus();
    mentionCtx.range.deleteContents();
    const chip = createMentionChip(user);
    const space = document.createTextNode(' ');
    mentionCtx.range.insertNode(space);
    mentionCtx.range.insertNode(chip);
    caretAfter(space);
    setMentionCtx(null);
    // Re-serialize now that the DOM changed under React.
    handleRichInput();
  };

  const handleRichKeyDown = (e) => {
    if (!mentionsOn || !mentionCtx || mentionMatches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIdx((i) => (i + 1) % mentionMatches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIdx((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMentionChip(mentionMatches[mentionIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMentionCtx(null);
    }
  };

  const handleBeforeInput = (e) => {
    if (!maxLength) return;
    const el = editorRef.current;
    if (!el) return;
    const inserting = typeof e.data === 'string' ? e.data.length : 0;
    if (!inserting) return;
    const remaining = maxLength - (el.innerText?.length ?? 0);
    if (remaining <= 0) { e.preventDefault(); return; }
    if (inserting > remaining) e.preventDefault();
  };

  const runFormat = (cmd) => {
    editorRef.current?.focus();
    // execCommand is the pragmatic path here — a full ProseMirror stack
    // would dwarf everything else this component does, and every browser
    // still supports the four toggles the Figma toolbar shows.
    document.execCommand(cmd, false, null);
    handleRichInput();
  };

  const wrapClass = [
    styles.enhWrap,
    variant === 'error' ? styles.enhError : '',
    disabled ? styles.enhDisabled : '',
    focused ? styles.enhFocused : '',
    className || '',
  ].filter(Boolean).join(' ');

  // Attachment, speech-to-text, moreActions, and the bottomButton are all
  // rich-text-only affordances — they live inside the formatting footer,
  // so none of them surface when richText is off. Toggling richText on
  // reveals the whole footer bar; the sub-flags then decide which slots
  // are populated.
  const showAttachment = richText && !!attachment;
  const showFooter = richText;
  const showCounter = typeof maxLength === 'number';
  const attachmentAccept = typeof attachment === 'object' && attachment ? attachment.accept : undefined;
  const attachmentMultiple = typeof attachment === 'object' && attachment ? !!attachment.multiple : false;
  const attachInputRef = useRef(null);
  const handleAttachClick = () => {
    // If the parent wired an explicit click handler use that (e.g. it wants
    // to open its own upload drawer). Otherwise fall back to the native
    // file picker via a hidden <input type="file">.
    if (onAttachmentClick) { onAttachmentClick(); return; }
    attachInputRef.current?.click();
  };

  return (
    <div className={styles.enhRoot}>
      {(title || mandatory || info) && (
        <div className={styles.enhLabelRow}>
          <label className={styles.enhLabel}>{title}</label>
          {info && (
            <Tooltip label={info}>
              <span className={styles.enhInfo} aria-label={info}>
                <Icon name="solar:info-circle-linear" size={12} color="var(--neutral-300)" />
              </span>
            </Tooltip>
          )}
          {mandatory && (
            <span className={styles.enhRequired} aria-hidden="true" />
          )}
        </div>
      )}

      <div className={wrapClass}>
        <div className={styles.enhBody}>
          {richText ? (
            <div
              ref={setRefs}
              role="textbox"
              aria-multiline="true"
              aria-label={title || placeholder}
              contentEditable={!disabled}
              suppressContentEditableWarning
              className={styles.enhEditor}
              data-empty={plainLen === 0 ? 'true' : 'false'}
              data-placeholder={placeholder}
              onInput={handleRichInput}
              onBeforeInput={handleBeforeInput}
              onKeyDown={handleRichKeyDown}
              onKeyUp={handleRichSelect}
              onClick={handleRichSelect}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                // Give a click on a picker item time to register before
                // the popover unmounts.
                setTimeout(() => setMentionCtx(null), 150);
              }}
              {...rest}
            />
          ) : (
            <textarea
              ref={setRefs}
              rows={rows}
              className={styles.enhTextarea}
              disabled={disabled}
              placeholder={placeholder}
              value={isControlled ? value : undefined}
              defaultValue={isControlled ? undefined : defaultValue}
              onChange={handleTextareaChange}
              maxLength={maxLength}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              {...rest}
            />
          )}
          {showCounter && (
            <span className={styles.enhCounter} aria-live="polite">
              {plainLen}/{maxLength}
            </span>
          )}
        </div>

        {showFooter && (
          <div className={styles.enhFooter}>
            <div className={styles.enhToolbar}>
              {showAttachment && (
                <>
                  <ToolbarButton
                    icon="solar:paperclip-linear"
                    label="Attach file"
                    onClick={handleAttachClick}
                    disabled={disabled}
                  />
                  {!onAttachmentClick && (
                    <input
                      ref={attachInputRef}
                      type="file"
                      accept={attachmentAccept}
                      multiple={attachmentMultiple}
                      hidden
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length) onAttachmentFiles?.(files);
                        // reset so selecting the same file twice re-fires.
                        e.target.value = '';
                      }}
                    />
                  )}
                  <span className={styles.enhToolbarDivider} aria-hidden="true" />
                </>
              )}
              {richText && RICH_TOOLBAR.map((btn, i) => (
                <ToolbarButton
                  key={btn.cmd}
                  icon={btn.icon}
                  label={btn.label}
                  onClick={() => runFormat(btn.cmd)}
                  disabled={disabled}
                  showDivider={i > 0}
                />
              ))}
              {moreActions && moreActions.map((a, i) => (
                <ToolbarButton
                  key={`m-${i}`}
                  icon={a.icon}
                  label={a.label}
                  onClick={a.onClick}
                  disabled={disabled || a.disabled}
                  showDivider
                />
              ))}
            </div>
            <div className={styles.enhFooterEnd}>
              {speechToText && (
                <ToolbarButton
                  icon="solar:microphone-3-linear"
                  label="Speech to text"
                  onClick={onSpeechClick}
                  disabled={disabled}
                  tone="primary"
                />
              )}
              {bottomButton && (() => {
                // Accept `true` (default Publish) OR a config object so
                // Storybook can drive it via a plain boolean toggle.
                const cfg = typeof bottomButton === 'object' ? bottomButton : {};
                return (
                  <Button
                    variant={cfg.variant || 'primary'}
                    size="S"
                    disabled={disabled || cfg.disabled}
                    onClick={cfg.onClick}
                  >
                    {cfg.label || 'Publish'}
                  </Button>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {supportingText && (
        <span
          className={[
            styles.enhSupporting,
            variant === 'error' ? styles.enhSupportingError : '',
          ].filter(Boolean).join(' ')}
        >
          {supportingText}
        </span>
      )}

      {mentionsOn && mentionCtx && mentionMatches.length > 0 && editorRef.current && (
        <MentionMenu
          anchor={editorRef.current}
          matches={mentionMatches}
          activeIdx={mentionIdx}
          onPick={insertMentionChip}
        />
      )}
    </div>
  );
});

// Portaled @mention picker — anchored under (or above) the editor. Kept
// inline so the enhanced textarea is a self-contained primitive with no
// cross-package coupling.
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
    <div className={styles.mentionMenu} style={{ top: pos.top, left: pos.left, width: pos.width }} role="menu">
      {matches.map((u, i) => (
        <button
          key={u.id || u.name}
          type="button"
          role="menuitem"
          className={[styles.mentionItem, i === activeIdx ? styles.mentionItemActive : ''].filter(Boolean).join(' ')}
          // mousedown fires before the editor's blur closes us; use it so the
          // click actually reaches this handler.
          onMouseDown={(e) => { e.preventDefault(); onPick(u); }}
        >
          <Avatar variant="staff" initials={u.initials} size="XS" />
          <span className={styles.mentionName}>{u.name}</span>
          {u.role && <span className={styles.mentionRole}>{u.role}</span>}
        </button>
      ))}
    </div>,
    document.body,
  );
}

function ToolbarButton({ icon, label, onClick, disabled, showDivider, tone }) {
  return (
    <>
      {showDivider && <span className={styles.enhToolbarDivider} aria-hidden="true" />}
      <button
        type="button"
        className={styles.enhToolbarBtn}
        onMouseDown={(e) => e.preventDefault()}     // preserve selection
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        data-tone={tone || undefined}
      >
        {typeof icon === 'string'
          ? <Icon name={icon} size={16} color="currentColor" />
          : icon}
      </button>
    </>
  );
}

// Strip tags to count characters against maxLength in richText mode when
// the editor node hasn't mounted yet (e.g. the very first render).
function plainTextLen(html) {
  if (!html) return 0;
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '').length;
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.innerText || el.textContent || '').length;
}
