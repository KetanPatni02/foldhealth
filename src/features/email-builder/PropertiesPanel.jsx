import { useState, useEffect, useRef, useCallback } from 'react';
import { renderToStaticMarkup } from '@usewaypoint/email-builder';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { Toggle } from '../../components/Toggle/Toggle';
import { makeInitialDocument } from './initialDocument';
import { HEADER_PRESETS, FOOTER_PRESETS } from './headerFooterLibrary';
import styles from './EmailBuilder.module.css';

const MIN_WIDTH = 280;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 320;

const RADIUS_TYPES = new Set(['Button', 'Image', 'Container', 'ColumnsContainer']);
const BUTTON_STYLE_RADIUS = { rectangle: 0, rounded: 6, pill: 9999 };

const FONT_FAMILIES = [
  { value: 'MODERN_SANS',    label: 'Inter' },
  { value: 'BOOK_SANS',      label: 'Helvetica' },
  { value: 'ORGANIC_SANS',   label: 'Verdana' },
  { value: 'GEOMETRIC_SANS', label: 'Tahoma' },
  { value: 'HEAVY_SANS',     label: 'Arial' },
  { value: 'ROUNDED_SANS',   label: 'Comic Sans MS' },
  { value: 'MODERN_SERIF',   label: 'Garamond' },
  { value: 'BOOK_SERIF',     label: 'Georgia' },
  { value: 'MONOSPACE',      label: 'Monospace' },
];

const FONT_WEIGHTS = [
  { value: 'normal', label: 'Regular' },
  { value: 'bold',   label: 'Bold' },
];

const TABS = [
  { id: 'design',   icon: 'solar:settings-linear' },
  { id: 'code',     icon: 'solar:code-square-linear' },
  { id: 'template', icon: 'solar:palette-linear' },
];

export function PropertiesPanel() {
  const [tab, setTab] = useState('design');
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const doc = useAppStore(s => s.emailDocument);
  const id = useAppStore(s => s.selectedBlockId);
  const updateBlock = useAppStore(s => s.updateBlock);

  const block = doc?.[id];

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!dragging.current) return;
      // Panel is on the right; width grows as the cursor moves left.
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - ev.clientX));
      setWidth(next);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div className={styles.rightPanel} style={{ width }}>
      <div className={styles.dragHandle} onMouseDown={handleMouseDown} aria-label="Resize panel">
        <div className={styles.dragHandleLine} />
      </div>

      <div className={styles.rightTabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={[styles.rightTab, tab === t.id ? styles.rightTabActive : ''].join(' ')}
            onClick={() => setTab(t.id)}
          >
            <Icon name={t.icon} size={16} color="currentColor" />
          </button>
        ))}
      </div>

      {tab === 'design' && <DesignTab block={block} updateBlock={updateBlock} id={id} />}
      {tab === 'code' && <CodeTab doc={doc} />}
      {tab === 'template' && <TemplateTab block={block} />}
    </div>
  );
}

// ── Design tab ──────────────────────────────────────────────────────────────
function DesignTab({ block, updateBlock, id }) {
  if (!block) {
    return <div className={styles.emptyState}>Select a block</div>;
  }

  const update = (path, value) => {
    updateBlock(id, prev => {
      const next = JSON.parse(JSON.stringify(prev));
      let target = next;
      for (let i = 0; i < path.length - 1; i++) {
        target[path[i]] = target[path[i]] ?? {};
        target = target[path[i]];
      }
      target[path[path.length - 1]] = value;
      return next;
    });
  };

  const isLayout = block.type === 'EmailLayout';
  const data = block.data || {};
  const props = data.props || {};
  const style = data.style || {};
  const padding = (style.padding ?? data.padding) || { top: 16, bottom: 16, left: 16, right: 16 };

  return (
    <div className={styles.designScroll}>
      {/* ── Block-specific content sections (shown first) ── */}
      {(block.type === 'Heading' || block.type === 'Text') && (
        <>
          <SectionHeading>Content</SectionHeading>
          <Section>
            <FieldLabel>Text</FieldLabel>
            <textarea
              className={styles.designTextarea}
              value={props.text || ''}
              onChange={e => update(['data', 'props', 'text'], e.target.value)}
            />
            {block.type === 'Heading' && (
              <SelectInput
                label="Level"
                value={props.level || 'h2'}
                options={[{ value: 'h1', label: 'H1' }, { value: 'h2', label: 'H2' }, { value: 'h3', label: 'H3' }]}
                onChange={v => update(['data', 'props', 'level'], v)}
              />
            )}
          </Section>
        </>
      )}

      {block.type === 'Button' && (
        <>
          <SectionHeading>Button</SectionHeading>
          <Section>
            <PlainInput label="Label" value={props.text || ''} onChange={v => update(['data', 'props', 'text'], v)} />
            <PlainInput label="URL" value={props.url || ''} onChange={v => update(['data', 'props', 'url'], v)} />
            <Row2>
              <SelectInput
                label="Size"
                value={props.size || 'medium'}
                options={[{ value: 'x-small', label: 'X-Small' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]}
                onChange={v => update(['data', 'props', 'size'], v)}
              />
              <SelectInput
                label="Style"
                value={props.buttonStyle || 'rectangle'}
                options={[{ value: 'rectangle', label: 'Rectangle' }, { value: 'rounded', label: 'Rounded' }, { value: 'pill', label: 'Pill' }]}
                onChange={v => update(['data', 'props', 'buttonStyle'], v)}
              />
            </Row2>
          </Section>
        </>
      )}

      {block.type === 'Image' && (
        <>
          <SectionHeading>Image</SectionHeading>
          <Section>
            <ImageUploader
              currentUrl={props.url}
              onChange={v => update(['data', 'props', 'url'], v)}
            />
            <PlainInput label="URL" value={props.url || ''} onChange={v => update(['data', 'props', 'url'], v)} />
            <PlainInput label="Alt Text" value={props.alt || ''} onChange={v => update(['data', 'props', 'alt'], v)} />
            <PlainInput label="Link URL" value={props.linkHref || ''} onChange={v => update(['data', 'props', 'linkHref'], v || null)} />
          </Section>
        </>
      )}

      {block.type === 'Avatar' && (
        <>
          <SectionHeading>Avatar</SectionHeading>
          <Section>
            <ImageUploader
              currentUrl={props.imageUrl}
              onChange={v => update(['data', 'props', 'imageUrl'], v)}
            />
            <PlainInput label="Image URL" value={props.imageUrl || ''} onChange={v => update(['data', 'props', 'imageUrl'], v)} />
            <Row2>
              <IconInput label="Size" suffix="px" value={props.size || 64} onChange={v => update(['data', 'props', 'size'], Number(v) || 64)} />
              <SelectInput
                label="Shape"
                value={props.shape || 'circle'}
                options={[{ value: 'circle', label: 'Circle' }, { value: 'square', label: 'Square' }, { value: 'rounded', label: 'Rounded' }]}
                onChange={v => update(['data', 'props', 'shape'], v)}
              />
            </Row2>
          </Section>
        </>
      )}

      {block.type === 'Divider' && (
        <>
          <SectionHeading>Divider</SectionHeading>
          <Section>
            <Row2>
              <ColorInput label="Line Color" value={props.lineColor} onChange={v => update(['data', 'props', 'lineColor'], v)} />
              <IconInput label="Thickness" suffix="px" value={props.lineHeight || 1} onChange={v => update(['data', 'props', 'lineHeight'], Number(v) || 1)} />
            </Row2>
          </Section>
        </>
      )}

      {block.type === 'Spacer' && (
        <>
          <SectionHeading>Spacer</SectionHeading>
          <Section>
            <IconInput label="Height" suffix="px" value={props.height || 16} onChange={v => update(['data', 'props', 'height'], Number(v) || 16)} />
          </Section>
        </>
      )}

      {block.type === 'ColumnsContainer' && (
        <>
          <SectionHeading>Columns</SectionHeading>
          <Section>
            <Row2>
              <IconInput
                label="Count"
                value={props.columnsCount || 2}
                onChange={v => {
                  const num = Math.max(1, Math.min(6, Number(v) || 2));
                  updateBlock(id, prev => {
                    const next = JSON.parse(JSON.stringify(prev));
                    next.data = next.data || {};
                    next.data.props = next.data.props || {};
                    next.data.props.columnsCount = num;
                    const cols = next.data.props.columns || [];
                    while (cols.length < num) cols.push({ childrenIds: [] });
                    next.data.props.columns = cols;
                    return next;
                  });
                }}
              />
              <IconInput label="Gap" suffix="px" value={props.columnsGap || 16} onChange={v => update(['data', 'props', 'columnsGap'], Number(v) || 16)} />
            </Row2>
          </Section>
        </>
      )}

      {/* ── Layout ── */}
      <SectionHeading>Layout</SectionHeading>
      <Section>
        {(block.type === 'Image' || block.type === 'Avatar') ? (
          <Row2>
            <IconInput
              label="Width" suffix="px" icon={<WidthIcon />}
              value={props.width || ''} onChange={v => update(['data', 'props', 'width'], Number(v) || null)}
            />
            <IconInput
              label="Height" suffix="px" icon={<HeightIcon />}
              value={props.height || ''} onChange={v => update(['data', 'props', 'height'], Number(v) || null)}
            />
          </Row2>
        ) : null}

        {!isLayout && (
          <>
            <FieldLabel>Padding</FieldLabel>
            <Row2>
              <IconInput
                suffix="px" icon={<PadLeftIcon />}
                value={padding.left} onChange={v => update(['data', 'style', 'padding', 'left'], Number(v) || 0)}
              />
              <IconInput
                suffix="px" icon={<PadTopIcon />}
                value={padding.top} onChange={v => update(['data', 'style', 'padding', 'top'], Number(v) || 0)}
              />
            </Row2>
            <Row2>
              <IconInput
                suffix="px" icon={<PadRightIcon />}
                value={padding.right} onChange={v => update(['data', 'style', 'padding', 'right'], Number(v) || 0)}
              />
              <IconInput
                suffix="px" icon={<PadBottomIcon />}
                value={padding.bottom} onChange={v => update(['data', 'style', 'padding', 'bottom'], Number(v) || 0)}
              />
            </Row2>
          </>
        )}

        {RADIUS_TYPES.has(block.type) && (
          <Row2>
            <IconInput
              label="Radius" suffix="px" icon={<RadiusIcon />}
              value={style.borderRadius ?? (block.type === 'Button' ? BUTTON_STYLE_RADIUS[props.buttonStyle || 'rectangle'] ?? 0 : 0)}
              onChange={v => update(['data', 'style', 'borderRadius'], Number(v) || 0)}
            />
          </Row2>
        )}
      </Section>

      {/* ── Color ── */}
      <SectionHeading>Color</SectionHeading>
      <Section>
        {isLayout ? (
          <>
            <Row2>
              <ColorInput label="Text Color" value={data.textColor} onChange={v => update(['data', 'textColor'], v)} />
              <ColorInput label="Canvas" value={data.canvasColor} onChange={v => update(['data', 'canvasColor'], v)} />
            </Row2>
            <Row2>
              <ColorInput label="Backdrop" value={data.backdropColor} onChange={v => update(['data', 'backdropColor'], v)} />
            </Row2>
          </>
        ) : (
          <Row2>
            {(block.type === 'Heading' || block.type === 'Text' || block.type === 'Button') && (
              <ColorInput
                label="Text Color"
                value={block.type === 'Button' ? props.buttonTextColor : style.color}
                onChange={v => update(
                  block.type === 'Button' ? ['data', 'props', 'buttonTextColor'] : ['data', 'style', 'color'],
                  v
                )}
              />
            )}
            <ColorInput
              label="Background Color"
              value={block.type === 'Button' ? props.buttonBackgroundColor : style.backgroundColor}
              onChange={v => update(
                block.type === 'Button' ? ['data', 'props', 'buttonBackgroundColor'] : ['data', 'style', 'backgroundColor'],
                v
              )}
            />
          </Row2>
        )}
      </Section>

      {/* ── Color Variables (root only — global tokens) ── */}
      {isLayout && (
        <>
          <SectionHeading>Color Variables</SectionHeading>
          <Section><ColorVariablesEditor /></Section>
        </>
      )}

      {/* ── Typography ── */}
      {(isLayout || block.type === 'Heading' || block.type === 'Text' || block.type === 'Button') && (
        <>
          <SectionHeading>Typography</SectionHeading>
          <Section>
            <SelectInput
              label="Font Family"
              value={(isLayout ? data.fontFamily : style.fontFamily) || 'MODERN_SANS'}
              options={FONT_FAMILIES}
              onChange={v => update(isLayout ? ['data', 'fontFamily'] : ['data', 'style', 'fontFamily'], v)}
            />
            {!isLayout && (
              <>
                <Row2>
                  <SelectInput
                    label="Font Weight"
                    value={style.fontWeight || 'normal'}
                    options={FONT_WEIGHTS}
                    onChange={v => update(['data', 'style', 'fontWeight'], v)}
                  />
                  <IconInput
                    label="Font Size" suffix="px"
                    value={style.fontSize || 14}
                    onChange={v => update(['data', 'style', 'fontSize'], Number(v) || 14)}
                  />
                </Row2>
                <Row2>
                  <div className={styles.fieldCol}>
                    <label className={styles.fieldLabelStrong}>Alignment</label>
                    <Toggle
                      items={[
                        { key: 'left',    label: '', icon: <AlignLeftIcon /> },
                        { key: 'center',  label: '', icon: <AlignCenterIcon /> },
                        { key: 'right',   label: '', icon: <AlignRightIcon /> },
                        { key: 'justify', label: '', icon: <AlignJustifyIcon /> },
                      ]}
                      active={style.textAlign || 'left'}
                      size="S"
                      onChange={v => update(['data', 'style', 'textAlign'], v)}
                    />
                  </div>
                  <div className={styles.fieldCol}>
                    <label className={styles.fieldLabelStrong}>Decoration</label>
                    <Toggle
                      items={[
                        { key: 'none',      label: '', icon: <DecoNoneIcon /> },
                        { key: 'bold',      label: '', icon: <DecoBoldIcon /> },
                        { key: 'italic',    label: '', icon: <DecoItalicIcon /> },
                        { key: 'underline', label: '', icon: <DecoUnderlineIcon /> },
                        { key: 'strike',    label: '', icon: <DecoStrikeIcon /> },
                      ]}
                      active={
                        style.textDecoration === 'underline' ? 'underline' :
                        style.textDecoration === 'line-through' ? 'strike' :
                        style.fontStyle === 'italic' ? 'italic' :
                        style.fontWeight === 'bold' ? 'bold' : 'none'
                      }
                      size="S"
                      onChange={v => {
                        update(['data', 'style', 'fontStyle'], v === 'italic' ? 'italic' : null);
                        update(['data', 'style', 'textDecoration'],
                          v === 'underline' ? 'underline' : v === 'strike' ? 'line-through' : null);
                        update(['data', 'style', 'fontWeight'], v === 'bold' ? 'bold' : 'normal');
                      }}
                    />
                  </div>
                </Row2>
                <Row2>
                  <IconInput
                    label="Line Height" suffix="%"
                    value={style.lineHeight ? Math.round(Number(style.lineHeight) * 100) : 120}
                    onChange={v => update(['data', 'style', 'lineHeight'], (Number(v) || 120) / 100)}
                  />
                  <IconInput
                    label="Letter Spacing" suffix="%"
                    value={style.letterSpacing || 0}
                    onChange={v => update(['data', 'style', 'letterSpacing'], Number(v) || 0)}
                  />
                </Row2>
              </>
            )}
          </Section>
        </>
      )}

      {/* ── Stub sections ── */}
      <SectionHeading>Extra</SectionHeading>
      <SectionHeading>Iteration</SectionHeading>
      <SectionHeading>Conditions</SectionHeading>
    </div>
  );
}

// ── Code tab ────────────────────────────────────────────────────────────────
function CodeTab({ doc }) {
  const setEmailDocument = useAppStore(s => s.setEmailDocument);
  const htmlPreviewOverride = useAppStore(s => s.htmlPreviewOverride);
  const setHtmlPreviewOverride = useAppStore(s => s.setHtmlPreviewOverride);

  const [mode, setMode] = useState('json');
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  // Track whether the local `text` state is the user's draft (true) or freshly
  // synced from the document/override (false). When sync'd, we re-format from
  // the doc; when drafting, we keep the user's text untouched.
  const drafting = useRef(false);

  // Re-derive text whenever the document changes externally — unless the user
  // is mid-edit, in which case we keep their draft.
  useEffect(() => {
    if (drafting.current) return;
    let cancelled = false;
    (async () => {
      if (mode === 'json') {
        const next = JSON.stringify(doc, null, 2);
        if (!cancelled) setText(next);
      } else {
        try {
          const seed = htmlPreviewOverride ?? renderToStaticMarkup(doc, { rootBlockId: 'root' });
          const [{ format }, htmlPlugin] = await Promise.all([
            import('prettier/standalone'),
            import('prettier/plugins/html'),
          ]);
          const next = await format(seed, { parser: 'html', plugins: [htmlPlugin.default || htmlPlugin], printWidth: 80, htmlWhitespaceSensitivity: 'ignore' });
          if (!cancelled) setText(next);
        } catch (e) {
          if (!cancelled) setText('<!-- Failed to render: ' + (e?.message || e) + ' -->');
        }
      }
      setError(null);
    })();
    return () => { cancelled = true; };
  }, [mode, doc, htmlPreviewOverride]);

  const handleChange = (e) => {
    const v = e.target.value;
    setText(v);
    drafting.current = true;
    if (mode === 'json') {
      try {
        const parsed = JSON.parse(v);
        if (!parsed || typeof parsed !== 'object' || !parsed.root) {
          setError('Document must contain a "root" block');
          return;
        }
        setError(null);
        setEmailDocument(parsed);
      } catch (err) {
        setError(err.message);
      }
    } else {
      // HTML edits are pushed to a preview override; they don't round-trip to JSON.
      setHtmlPreviewOverride(v);
      setError(null);
    }
  };

  // When user blurs, we let future doc updates re-sync the text again.
  const handleBlur = () => { drafting.current = false; };

  const copy = () => { if (text) navigator.clipboard?.writeText(text); };

  const reformat = async () => {
    drafting.current = false;
    if (mode === 'json') {
      try {
        const parsed = JSON.parse(text);
        setText(JSON.stringify(parsed, null, 2));
        setError(null);
      } catch (e) { setError(e.message); }
    } else {
      try {
        const [{ format }, htmlPlugin] = await Promise.all([
          import('prettier/standalone'),
          import('prettier/plugins/html'),
        ]);
        const next = await format(text, { parser: 'html', plugins: [htmlPlugin.default || htmlPlugin], printWidth: 80, htmlWhitespaceSensitivity: 'ignore' });
        setText(next);
      } catch (e) { setError(e.message); }
    }
  };

  const highlighted = mode === 'json' ? highlightJson(text) : highlightHtml(text);

  return (
    <div className={styles.codeScroll}>
      <div className={styles.codeToolbar}>
        <Toggle
          items={[{ key: 'json', label: 'JSON' }, { key: 'html', label: 'HTML' }]}
          active={mode}
          size="S"
          onChange={(k) => { setMode(k); drafting.current = false; }}
        />
        <div className={styles.codeToolbarRight}>
          <button className={styles.codeCopyBtn} onClick={reformat} aria-label="Format">
            <Icon name="solar:magic-stick-3-linear" size={14} color="currentColor" />
            Format
          </button>
          <button className={styles.codeCopyBtn} onClick={copy} aria-label="Copy">
            <Icon name="solar:copy-linear" size={14} color="currentColor" />
            Copy
          </button>
        </div>
      </div>

      {mode === 'html' && htmlPreviewOverride && (
        <div className={styles.codeBanner}>
          <Icon name="solar:info-circle-linear" size={12} color="currentColor" />
          HTML override active — preview shows your edits. Switch to JSON or Design to revert.
        </div>
      )}

      {error && (
        <div className={styles.codeError}>
          <Icon name="solar:danger-triangle-linear" size={12} color="currentColor" />
          {error}
        </div>
      )}

      <div className={styles.codeEditor}>
        <pre className={styles.codePre} aria-hidden="true">
          <code className={styles.codeBlock} dangerouslySetInnerHTML={{ __html: highlighted + '\n' }} />
        </pre>
        <textarea
          className={styles.codeTextarea}
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          spellCheck={false}
          autoComplete="off"
          aria-label={`Edit ${mode.toUpperCase()}`}
        />
      </div>
    </div>
  );
}

// ── Syntax highlighters (regex-based, distinct token colors) ────────────────
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function highlightJson(input) {
  // Walk char-by-char to avoid mistaking strings for keys/values.
  // Simpler: regex over escaped output.
  const safe = escapeHtml(input);
  return safe.replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (m, str, colon, bool, nul, num) => {
      if (str !== undefined) {
        if (colon) return `<span class="${styles.tokKey}">${str}</span>${colon}`;
        return `<span class="${styles.tokString}">${str}</span>`;
      }
      if (bool !== undefined) return `<span class="${styles.tokBoolean}">${bool}</span>`;
      if (nul !== undefined) return `<span class="${styles.tokNull}">${nul}</span>`;
      if (num !== undefined) return `<span class="${styles.tokNumber}">${num}</span>`;
      return m;
    }
  );
}

function highlightHtml(input) {
  const safe = escapeHtml(input);
  // Highlight tags: &lt;tagname …&gt;  and attributes attr="value"
  return safe.replace(/(&lt;\/?)([A-Za-z][\w-]*)((?:\s+[A-Za-z_:][\w:.-]*(?:=(?:&quot;[^&]*&quot;|&#39;[^&]*&#39;|[^\s&]+))?)*)(\s*\/?&gt;)/g,
    (_m, lt, tag, attrs, gt) => {
      const attrPart = attrs.replace(/(\s+)([A-Za-z_:][\w:.-]*)(=)(&quot;[^&]*&quot;|&#39;[^&]*&#39;)/g,
        (_a, ws, name, eq, val) =>
          `${ws}<span class="${styles.tokAttr}">${name}</span>${eq}<span class="${styles.tokString}">${val}</span>`
      );
      return `<span class="${styles.tokPunct}">${lt}</span><span class="${styles.tokTag}">${tag}</span>${attrPart}<span class="${styles.tokPunct}">${gt}</span>`;
    }
  );
}

// ── Template tab ────────────────────────────────────────────────────────────
const TEMPLATE_PRESETS = [
  { id: 'welcome',  label: 'Welcome',          accent: '#7C5CFA' },
  { id: 'reminder', label: 'Care Reminder',    accent: '#22C55E' },
  { id: 'followup', label: 'Visit Follow-up',  accent: '#F59E0B' },
  { id: 'survey',   label: 'Patient Survey',   accent: '#EC4899' },
];

function TemplateTab({ block }) {
  const editingCampaignName = useAppStore(s => s.editingCampaignName);
  const replaceHeaderFooter = useAppStore(s => s.replaceHeaderFooter);
  const setDocument = useAppStore.setState;

  const role = block?.data?.role;
  const isHeaderOrFooter = role === 'header' || role === 'footer';

  const applyPreset = (preset) => {
    const fresh = makeInitialDocument({ name: editingCampaignName || preset.label });
    fresh.root.data.backdropColor = preset.accent + '22';
    fresh['header-text'].data.style.color = preset.accent;
    setDocument({ emailDocument: fresh, selectedBlockId: 'root' });
  };

  const applyRolePreset = (preset) => {
    let counter = Date.now();
    const genId = () => `block-${counter++}-${Math.random().toString(36).slice(2, 5)}`;
    const tree = preset.build(genId, editingCampaignName || undefined);
    replaceHeaderFooter(role, tree);
  };

  if (isHeaderOrFooter) {
    const presets = role === 'header' ? HEADER_PRESETS : FOOTER_PRESETS;
    const label = role === 'header' ? 'Header' : 'Footer';
    return (
      <div className={styles.templateScroll}>
        <SectionHeading>{`Change ${label}`}</SectionHeading>
        <div className={styles.templateGrid}>
          {presets.map(p => (
            <button key={p.id} className={styles.templateTile} onClick={() => applyRolePreset(p)}>
              <div className={styles.templateThumb} style={{ background: p.accent + '22', borderColor: p.accent + '44' }}>
                <div className={styles.templateThumbBar} style={{ background: p.accent }} />
              </div>
              <div className={styles.templateLabel}>{p.label}</div>
              <div className={styles.templateDesc}>{p.description}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.templateScroll}>
      <SectionHeading>Templates</SectionHeading>
      <div className={styles.templateGrid}>
        {TEMPLATE_PRESETS.map(p => (
          <button key={p.id} className={styles.templateTile} onClick={() => applyPreset(p)}>
            <div className={styles.templateThumb} style={{ background: p.accent + '22', borderColor: p.accent + '44' }}>
              <div className={styles.templateThumbBar} style={{ background: p.accent }} />
            </div>
            <div className={styles.templateLabel}>{p.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Section primitives ──────────────────────────────────────────────────────
function SectionHeading({ children }) {
  return <div className={styles.sectionHeadingStrip}>{children}</div>;
}

function Section({ children }) {
  return <div className={styles.sectionContent}>{children}</div>;
}

function Row2({ children }) {
  return <div className={styles.row2}>{children}</div>;
}

function FieldLabel({ children }) {
  return <p className={styles.fieldLabelStrong}>{children}</p>;
}

// ── Image uploader ──────────────────────────────────────────────────────────
// Reads the picked file as a data URL and stuffs it straight into the URL
// prop. Email clients warn against data URLs over ~10KB, so we cap upload size
// at 1MB and show a hint if it's larger; for production templates you'd swap
// this for an upload-to-CDN flow.
function ImageUploader({ currentUrl, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const acceptFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('File must be an image'); return; }
    if (file.size > 1024 * 1024) { setError('Image larger than 1MB — consider hosting externally'); }
    else setError(null);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className={styles.fieldCol}>
      <div
        className={[styles.imgUploader, dragOver ? styles.imgUploaderOver : ''].join(' ')}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
      >
        {currentUrl ? (
          <img src={currentUrl} alt="" className={styles.imgUploaderPreview} />
        ) : (
          <div className={styles.imgUploaderEmpty}>
            <Icon name="solar:gallery-add-linear" size={20} color="var(--neutral-300)" />
          </div>
        )}
        <div className={styles.imgUploaderHint}>
          <Icon name="solar:upload-linear" size={12} color="currentColor" />
          {currentUrl ? 'Replace' : 'Click or drop'}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => acceptFile(e.target.files?.[0])}
        />
      </div>
      {error && <div className={styles.imgUploaderError}>{error}</div>}
    </div>
  );
}

// ── Color Variables (global) ────────────────────────────────────────────────
function ColorVariablesEditor() {
  const variables = useAppStore(s => s.colorVariables);
  const addColorVariable = useAppStore(s => s.addColorVariable);
  const updateColorVariable = useAppStore(s => s.updateColorVariable);
  const removeColorVariable = useAppStore(s => s.removeColorVariable);

  const handleAdd = () => {
    let n = 1;
    let name = `Color ${n}`;
    while (variables.some(v => v.name === name)) { n++; name = `Color ${n}`; }
    addColorVariable({ name, hex: '#7C5CFA' });
  };

  return (
    <div className={styles.colorVarList}>
      {variables.map((cv, idx) => (
        <div key={idx} className={styles.colorVarRow}>
          <input
            type="color"
            value={cv.hex}
            onChange={e => updateColorVariable(cv.name, { hex: e.target.value })}
            className={styles.colorVarPicker}
            aria-label={`Color for ${cv.name}`}
          />
          <input
            type="text"
            value={cv.name}
            onChange={e => updateColorVariable(cv.name, { name: e.target.value })}
            className={styles.colorVarNameInput}
          />
          <input
            type="text"
            value={cv.hex.toUpperCase()}
            onChange={e => updateColorVariable(cv.name, { hex: e.target.value })}
            className={styles.colorVarHexInput}
          />
          <button
            type="button"
            className={styles.colorVarRemove}
            onClick={() => removeColorVariable(cv.name)}
            aria-label="Remove"
          >
            <Icon name="solar:close-circle-linear" size={14} color="currentColor" />
          </button>
        </div>
      ))}
      <button type="button" className={styles.colorVarAdd} onClick={handleAdd}>
        <Icon name="solar:add-circle-linear" size={14} color="currentColor" />
        Add variable
      </button>
    </div>
  );
}

// ── Field primitives ────────────────────────────────────────────────────────
function IconInput({ label, suffix, icon, value, onChange }) {
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const current = parseFloat(value) || 0;
      onChange(String(e.key === 'ArrowUp' ? current + step : current - step));
    }
  };
  return (
    <div className={styles.fieldCol}>
      {label && <label className={styles.fieldLabel}>{label}</label>}
      <div className={styles.iconInputWrap}>
        {icon && <span className={styles.iconInputIcon}>{icon}</span>}
        <input
          className={styles.iconInputValue}
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value.replace(/[^0-9.-]/g, ''))}
          onKeyDown={handleKeyDown}
        />
        {suffix && <span className={styles.iconInputSuffix}>{suffix}</span>}
      </div>
    </div>
  );
}

function PlainInput({ label, value, onChange }) {
  return (
    <div className={styles.fieldCol}>
      {label && <label className={styles.fieldLabel}>{label}</label>}
      <div className={styles.iconInputWrap}>
        <input
          className={styles.iconInputValue}
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function SelectInput({ label, value, options, onChange }) {
  return (
    <div className={styles.fieldCol}>
      {label && <label className={styles.fieldLabel}>{label}</label>}
      <div className={styles.selectWrap}>
        <select className={styles.selectInput} value={value ?? ''} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className={styles.selectChevron}>
          <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
        </span>
      </div>
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  const colorVariables = useAppStore(s => s.colorVariables);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const v = value || '#FFFFFF';

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={styles.fieldCol} ref={ref}>
      {label && <label className={styles.fieldLabel}>{label}</label>}
      <div className={styles.colorInputWrap}>
        <button
          type="button"
          className={styles.colorDotBtn}
          onClick={() => setOpen(o => !o)}
          aria-label="Choose from variables"
        >
          <span className={styles.colorDot} style={{ background: v, borderColor: v.toLowerCase() === '#ffffff' ? '#CED4DD' : v }} />
        </button>
        <input
          type="text"
          className={styles.colorHex}
          value={v.toUpperCase()}
          onChange={e => onChange(e.target.value)}
        />
        <input
          type="color"
          className={styles.colorPickerInline}
          value={v}
          onChange={e => onChange(e.target.value)}
          aria-label="Pick color"
        />
      </div>
      {open && (
        <div className={styles.colorVarPopover}>
          {colorVariables.length > 0 && (
            <>
              <div className={styles.colorVarPopoverTitle}>Variables</div>
              <div className={styles.colorVarSwatches}>
                {colorVariables.map(cv => (
                  <button
                    key={cv.name}
                    type="button"
                    className={styles.colorVarSwatch}
                    title={`${cv.name} (${cv.hex})`}
                    onClick={() => { onChange(cv.hex); setOpen(false); }}
                  >
                    <span className={styles.colorVarDot} style={{ background: cv.hex }} />
                    <span className={styles.colorVarName}>{cv.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className={styles.colorVarPopoverTitle}>Custom</div>
          <div className={styles.colorCustomRow}>
            <input
              type="color"
              className={styles.colorCustomPicker}
              value={v}
              onChange={e => onChange(e.target.value)}
            />
            <input
              type="text"
              className={styles.colorCustomHex}
              value={v.toUpperCase()}
              onChange={e => onChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline icons (precise to match Figma) ──────────────────────────────────
function svg(d, w = 16, h = 16) {
  return (
    <svg width={w} height={h} viewBox="0 0 16 16" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const WidthIcon     = () => svg('M2 4v8 M14 4v8 M4 8h8 M4 8l2-2 M4 8l2 2 M12 8l-2-2 M12 8l-2 2');
const HeightIcon    = () => svg('M4 2h8 M4 14h8 M8 4v8 M8 4l-2 2 M8 4l2 2 M8 12l-2-2 M8 12l2-2');
const RadiusIcon    = () => svg('M4 12V7a5 5 0 0 1 5-5h5');
const PadLeftIcon   = () => svg('M3 2v12 M7 5h7 M7 8h7 M7 11h7');
const PadTopIcon    = () => svg('M2 3h12 M5 7v7 M8 7v7 M11 7v7');
const PadRightIcon  = () => svg('M13 2v12 M2 5h7 M2 8h7 M2 11h7');
const PadBottomIcon = () => svg('M2 13h12 M5 2v7 M8 2v7 M11 2v7');

const AlignLeftIcon    = () => svg('M2 4h12 M2 8h8 M2 12h12');
const AlignCenterIcon  = () => svg('M2 4h12 M4 8h8 M2 12h12');
const AlignRightIcon   = () => svg('M2 4h12 M6 8h8 M2 12h12');
const AlignJustifyIcon = () => svg('M2 4h12 M2 8h12 M2 12h12');

const DecoNoneIcon  = () => svg('M3 8h10');
const DecoBoldIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <text x="3" y="11" fontSize="11" fontWeight="700" fontFamily="Inter" fill="currentColor">B</text>
  </svg>
);
const DecoItalicIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <text x="4" y="11" fontSize="11" fontStyle="italic" fontFamily="Georgia" fill="currentColor">I</text>
  </svg>
);
const DecoUnderlineIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <text x="3" y="10" fontSize="11" fontFamily="Inter" fill="currentColor">U</text>
    <line x1="3" y1="12" x2="11" y2="12" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
const DecoStrikeIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <text x="4" y="11" fontSize="11" fontFamily="Inter" fill="currentColor">T</text>
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
