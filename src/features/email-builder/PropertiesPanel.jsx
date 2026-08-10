import { useState, useEffect, useRef, useCallback, useLayoutEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { renderEmailHtml } from './patchEmailHtml';
import { useAppStore } from '../../store/useAppStore';
import { Icon } from '../../components/Icon/Icon';
import { CloseButton } from '../../components/CloseButton/CloseButton';
import { Toggle } from '../../components/Toggle/Toggle';
import { Input } from '../../components/Input/Input';
import { Textarea } from '../../components/Textarea/Textarea';
import { Select as SharedSelect } from '../../components/Select/Select';
import { makeInitialDocument } from './initialDocument';
import { HEADER_PRESETS, FOOTER_PRESETS } from './headerFooterLibrary';
import { PresetLivePreview } from './PresetLivePreview';
import { extractSubtree, fingerprintTree } from './blockHelpers';
import { uploadImage } from './uploadImage';
import { GOOGLE_FONTS, injectGoogleFonts, availableWeights, normalizeWeight } from './googleFonts';
import { ColorPicker } from './ColorPicker';
import { ColorInput } from './ColorInput';
import { parseLineHeight, formatLineHeight, parseLetterSpacing, formatLetterSpacing } from './dimUnits';
import { parseHtmlToDocument, collectUnknownFonts } from './htmlToDocument';
import { DesignTab, ColumnDesignTab, BulkDesignTab } from './PropertiesPanelDesignTab';
import { CodeTab } from './PropertiesPanelCodeTab';
import styles from './EmailBuilder.module.css';

// Inject the Google Fonts stylesheet once so the canvas + inline previews
// render with the actual web fonts. Safe to call repeatedly.
injectGoogleFonts();

const MIN_WIDTH = 280;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 320;

const RADIUS_TYPES = new Set(['Button', 'Image', 'Container', 'ColumnsContainer']);
const BG_IMAGE_TYPES = new Set(['Container', 'ColumnsContainer']);
const BUTTON_STYLE_RADIUS = { rectangle: 0, rounded: 6, pill: 9999 };

// Pulled from the curated Google Fonts catalogue. Each entry stores the
// Google font name directly so the value renders the same way in builder,
// preview, and the exported email <link rel="stylesheet">.
const FONT_FAMILIES = GOOGLE_FONTS.map(f => ({ value: f.value, label: f.label }));

// Fallback used until the selected fontFamily is known. The real options
// come from availableWeights(fontFamily) at render time so each family
// surfaces only the weights it ships with on Google Fonts.
const FONT_WEIGHTS_FALLBACK = [
  { value: '400', label: 'Regular 400' },
  { value: '700', label: 'Bold 700' },
];

const TABS = [
  { id: 'design',   icon: 'solar:settings-linear',     label: 'Design' },
  { id: 'code',     icon: 'solar:code-square-linear',  label: 'Code' },
  { id: 'template', icon: 'solar:palette-linear',      label: 'Template' },
];

const EMPTY_BULK_IDS = [];

export function PropertiesPanel() {
  const [tab, setTab] = useState('design');
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const doc = useAppStore(s => s.emailDocument);
  const id = useAppStore(s => s.selectedBlockId);
  const selectedColumnIdx = useAppStore(s => s.selectedColumnIdx);
  const updateBlock = useAppStore(s => s.updateBlock);
  const bulkIds = useAppStore(s => s.bulkSelectedIds);
  const setHtmlPreviewOverride = useAppStore(s => s.setHtmlPreviewOverride);

  const block = doc?.[id];
  const isBulk = bulkIds.length > 0;
  const isColumnSelected = selectedColumnIdx !== null && block?.type === 'ColumnsContainer';

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev) => {
      if (!dragging.current) return;
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
            title={t.label}
            aria-label={t.label}
          >
            <Icon name={t.icon} size={16} color="currentColor" />
            <span className={styles.rightTabLabel}>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'design' && (isBulk
        ? <BulkDesignTab doc={doc} bulkIds={bulkIds} updateBlock={updateBlock} />
        : isColumnSelected
          ? <ColumnDesignTab block={block} updateBlock={updateBlock} id={id} columnIdx={selectedColumnIdx} />
          : <DesignTab block={block} updateBlock={updateBlock} id={id} />
      )}
      {tab === 'code' && <CodeTab doc={doc} />}
      {tab === 'template' && <TemplateTab block={block} />}
    </div>
  );
}
function TemplateTab({ block }) {
  const editingCampaignName = useAppStore(s => s.editingCampaignName);
  const replaceHeaderFooter = useAppStore(s => s.replaceHeaderFooter);
  const customHeaderPresets = useAppStore(s => s.customHeaderPresets);
  const customFooterPresets = useAppStore(s => s.customFooterPresets);
  const saveCurrentAsPreset = useAppStore(s => s.saveCurrentAsPreset);
  const deleteCustomPreset = useAppStore(s => s.deleteCustomPreset);
  const updateCustomPreset = useAppStore(s => s.updateCustomPreset);
  const applyCustomPreset = useAppStore(s => s.applyCustomPreset);
  const setDocument = useAppStore.setState;
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [presetQuery, setPresetQuery] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameName, setRenameName] = useState('');
  const [renameDesc, setRenameDesc] = useState('');

  const role = block?.data?.role;
  const isHeaderOrFooter = role === 'header' || role === 'footer';

  const applyPreset = (preset) => {
    const fresh = makeInitialDocument({ name: editingCampaignName || preset.label });
    fresh.root.data.backdropColor = preset.accent + '22';
    fresh['header-text'].data.style.color = preset.accent;
    setDocument({ emailDocument: fresh, selectedBlockId: 'root' });
  };

  const applyRolePreset = (preset) => {
    if (preset.isUserPreset) {
      applyCustomPreset(role, preset);
      return;
    }
    let counter = Date.now();
    const genId = () => `block-${counter++}-${Math.random().toString(36).slice(2, 5)}`;
    const tree = preset.build(genId, editingCampaignName || undefined);
    replaceHeaderFooter(role, tree);
  };

  const handleSave = async () => {
    setSaving(true);
    let result;
    try {
      result = await saveCurrentAsPreset(role, { name: saveName, description: saveDesc });
    } finally {
      setSaving(false);
    }
    if (result) {
      setSaveOpen(false);
      setSaveName('');
      setSaveDesc('');
    }
  };

  if (isHeaderOrFooter) {
    const builtIn = role === 'header' ? HEADER_PRESETS : FOOTER_PRESETS;
    const userPresets = role === 'header' ? customHeaderPresets : customFooterPresets;
    const label = role === 'header' ? 'Header' : 'Footer';

    // Detect whether the currently-selected header/footer matches an existing
    // built-in or user preset byte-for-byte. If it does, hiding the Save
    // button avoids creating duplicate library entries. Read `doc` via the
    // *prop* (`block`) so this recomputes whenever the doc mutates — using
    // useAppStore.getState() here would skip re-runs since it doesn't sub.
    let currentFingerprint = '';
    if (block?.data?.role === role) {
      const doc = useAppStore.getState().emailDocument;
      const rootChildren = doc?.root?.data?.childrenIds || [];
      const rootId = rootChildren.find(id => doc[id]?.data?.role === role);
      if (rootId) currentFingerprint = fingerprintTree(extractSubtree(doc, rootId));
    }
    const knownFingerprints = new Set();
    builtIn.forEach(p => {
      let n = 0;
      const tree = p.build(() => `fp-${p.id}-${++n}`, editingCampaignName || 'Welcome');
      knownFingerprints.add(fingerprintTree(tree));
    });
    userPresets.forEach(p => {
      if (p.tree) knownFingerprints.add(fingerprintTree(p.tree));
    });
    const canSavePreset = !!currentFingerprint && !knownFingerprints.has(currentFingerprint);

    const matches = (p) => {
      if (!presetQuery.trim()) return true;
      const q = presetQuery.trim().toLowerCase();
      return (p.label || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
    };
    const filteredUser = userPresets.filter(matches);
    const filteredBuiltIn = builtIn.filter(matches);

    const startRename = (p) => {
      setRenamingId(p.id);
      setRenameName(p.label || '');
      setRenameDesc(p.description || '');
    };
    const commitRename = (p) => {
      updateCustomPreset(p.id, role, { name: renameName, description: renameDesc });
      setRenamingId(null);
    };

    return (
      <div className={styles.templateScroll}>
        <SectionHeading>{`Change ${label}`}</SectionHeading>

        {/* Save current as preset — only when the current header/footer
            differs from every known preset. Avoids creating duplicates. */}
        {canSavePreset && (
        <div className={styles.presetSaveBar}>
          {!saveOpen ? (
            <button
              type="button"
              className={styles.presetSaveBtn}
              onClick={() => { setSaveOpen(true); setSaveName(''); setSaveDesc(''); }}
            >
              <Icon name="solar:bookmark-linear" size={14} color="currentColor" />
              Save current {label.toLowerCase()} as preset
            </button>
          ) : (
            <div className={styles.presetSaveForm}>
              <input
                autoFocus
                className={styles.presetSaveInput}
                placeholder={`${label} name (e.g. Brand banner)`}
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaveOpen(false); }}
                maxLength={60}
              />
              <input
                className={styles.presetSaveInput}
                placeholder="Short description (optional)"
                value={saveDesc}
                onChange={e => setSaveDesc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaveOpen(false); }}
                maxLength={120}
              />
              <div className={styles.presetSaveActions}>
                <button type="button" className={styles.presetSaveCancel} onClick={() => setSaveOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.presetSavePrimary}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Search across both saved + built-in presets, using the shared
            <Input> so the field matches the rest of the app. */}
        <div className={styles.presetSearchBar}>
          <Input
            placeholder={`Search ${label.toLowerCase()}s…`}
            value={presetQuery}
            onChange={(e) => setPresetQuery(e.target.value)}
          />
        </div>

        <div className={styles.presetCardList}>
          {filteredUser.length > 0 && (
            <>
              <SectionSubHeading>Your presets</SectionSubHeading>
              {filteredUser.map(p => (
                <TemplatePresetCard
                  key={`u-${p.id}`}
                  preset={p}
                  isRenaming={renamingId === p.id}
                  draftName={renameName}
                  draftDesc={renameDesc}
                  onDraftName={setRenameName}
                  onDraftDesc={setRenameDesc}
                  onCommitRename={() => commitRename(p)}
                  onCancelRename={() => setRenamingId(null)}
                  onApply={() => applyRolePreset(p)}
                  onEdit={() => startRename(p)}
                  onDelete={() => { if (window.confirm(`Delete preset "${p.label}"?`)) deleteCustomPreset(p.id, role); }}
                />
              ))}
            </>
          )}
          {filteredBuiltIn.length > 0 && (
            <>
              {filteredUser.length > 0 && <SectionSubHeading>Built-in</SectionSubHeading>}
              {filteredBuiltIn.map(p => (
                <TemplatePresetCard key={p.id} preset={p} onApply={() => applyRolePreset(p)} />
              ))}
            </>
          )}
          {filteredUser.length === 0 && filteredBuiltIn.length === 0 && (
            <div className={styles.presetPickerEmpty}>No {label.toLowerCase()}s match "{presetQuery}"</div>
          )}
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
// ── Column width ratio bar ──────────────────────────────────────────────────
const RATIO_PRESETS_2 = [
  { label: '1 : 1', widths: [50, 50] },
  { label: '1 : 2', widths: [33.33, 66.67] },
  { label: '2 : 1', widths: [66.67, 33.33] },
  { label: '1 : 3', widths: [25, 75] },
  { label: '3 : 1', widths: [75, 25] },
];
const RATIO_PRESETS_3 = [
  { label: '1 : 1 : 1', widths: [33.33, 33.33, 33.34] },
  { label: '1 : 1 : 2', widths: [25, 25, 50] },
  { label: '2 : 1 : 1', widths: [50, 25, 25] },
  { label: '1 : 2 : 1', widths: [25, 50, 25] },
];
const RATIO_PRESETS_4 = [
  { label: 'Equal', widths: [25, 25, 25, 25] },
  { label: '2:1:1:1', widths: [40, 20, 20, 20] },
];

function ratioPresetsForCount(n) {
  if (n === 2) return RATIO_PRESETS_2;
  if (n === 3) return RATIO_PRESETS_3;
  if (n === 4) return RATIO_PRESETS_4;
  return [{ label: 'Equal', widths: Array.from({ length: n }, () => Math.round(10000 / n) / 100) }];
}

const COL_COLORS = ['var(--neutral-300, #6F7A90)', 'var(--neutral-100, #E9ECF1)'];

function ColumnWidthBar({ count, widths, onChange }) {
  const barRef = useRef(null);
  const dragging = useRef(null);

  const safeWidths = widths && widths.length >= count
    ? widths.slice(0, count)
    : Array.from({ length: count }, () => Math.round(10000 / count) / 100);

  const handleMouseDown = useCallback((e, handleIdx) => {
    e.preventDefault();
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    dragging.current = { handleIdx, barLeft: rect.left, barWidth: rect.width, startWidths: [...safeWidths] };

    const onMove = (me) => {
      const d = dragging.current;
      if (!d) return;
      const x = me.clientX - d.barLeft;
      const pct = (x / d.barWidth) * 100;
      const leftSum = d.startWidths.slice(0, d.handleIdx).reduce((a, b) => a + b, 0);
      const pairTotal = d.startWidths[d.handleIdx] + d.startWidths[d.handleIdx + 1];
      const minPct = 10;
      const leftPct = Math.max(minPct, Math.min(pairTotal - minPct, pct - leftSum));
      const rightPct = pairTotal - leftPct;
      const next = [...d.startWidths];
      next[d.handleIdx] = Math.round(leftPct * 100) / 100;
      next[d.handleIdx + 1] = Math.round(rightPct * 100) / 100;
      onChange(next);
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [safeWidths, onChange]);

  const presets = ratioPresetsForCount(count);

  return (
    <div className={styles.colWidthWrap}>
      <div ref={barRef} className={styles.colWidthBar}>
        {safeWidths.map((w, i) => (
          <Fragment key={i}>
            <div
              className={styles.colWidthSeg}
              style={{ width: `${w}%`, backgroundColor: COL_COLORS[i % COL_COLORS.length] }}
            >
              <span className={styles.colWidthLabel} style={{ color: i % 2 === 0 ? 'var(--neutral-0)' : 'var(--neutral-400)' }}>{Math.round(w)}%</span>
            </div>
            {i < count - 1 && (
              <div
                className={styles.colWidthHandle}
                onMouseDown={e => handleMouseDown(e, i)}
              />
            )}
          </Fragment>
        ))}
      </div>
      <div className={styles.colWidthPresets}>
        {presets.map(p => (
          <button
            key={p.label}
            className={styles.colWidthPresetBtn}
            onClick={() => onChange(p.widths)}
            title={p.label}
          >
            <span className={styles.colWidthPresetGlyph}>
              {p.widths.map((w, i) => (
                <span key={i} style={{ flex: w, backgroundColor: COL_COLORS[i % COL_COLORS.length] }} />
              ))}
            </span>
            <span className={styles.colWidthPresetLabel}>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({ children }) {
  return <div className={styles.sectionHeadingStrip}>{children}</div>;
}

function SectionSubHeading({ children }) {
  return <div className={styles.sectionSubHeading}>{children}</div>;
}

// Header/footer preset card — live preview + meta. User presets show edit /
// delete actions on hover; built-in presets are apply-only. Shares the same
// CSS classes as the ComponentsPanel PresetCard so the picker and the right-
// panel list stay visually identical.
function TemplatePresetCard({
  preset,
  isRenaming = false,
  draftName,
  draftDesc,
  onDraftName,
  onDraftDesc,
  onCommitRename,
  onCancelRename,
  onApply,
  onEdit,
  onDelete,
}) {
  const isUser = !!preset.isUserPreset;
  return (
    <div className={styles.presetCardWrap}>
      <button
        type="button"
        className={styles.presetCard}
        onClick={isRenaming ? undefined : onApply}
        disabled={isRenaming}
      >
        <PresetLivePreview preset={preset} />
        {!isRenaming && (
          <div className={styles.presetCardMeta}>
            <div className={styles.presetCardTitle}>{preset.label}</div>
            {preset.description && (
              <div className={styles.presetCardDesc}>{preset.description}</div>
            )}
          </div>
        )}
      </button>
      {isRenaming && (
        <div className={styles.presetCardEditForm}>
          <input
            autoFocus
            className={styles.presetCardEditInput}
            placeholder="Name"
            value={draftName}
            onChange={(e) => onDraftName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCommitRename(); if (e.key === 'Escape') onCancelRename(); }}
            maxLength={60}
          />
          <input
            className={styles.presetCardEditInput}
            placeholder="Description (optional)"
            value={draftDesc}
            onChange={(e) => onDraftDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCommitRename(); if (e.key === 'Escape') onCancelRename(); }}
            maxLength={120}
          />
          <div className={styles.presetCardEditActions}>
            <button type="button" className={styles.presetCardEditCancel} onClick={onCancelRename}>Cancel</button>
            <button type="button" className={styles.presetCardEditSave} onClick={onCommitRename}>Save</button>
          </div>
        </div>
      )}
      {isUser && !isRenaming && (
        <div className={styles.presetCardActions}>
          <button
            type="button"
            className={styles.presetCardActionBtn}
            title="Rename"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Icon name="solar:pen-2-linear" size={12} color="currentColor" />
          </button>
          <button
            type="button"
            className={[styles.presetCardActionBtn, styles.presetCardActionDanger].join(' ')}
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Icon name="solar:trash-bin-minimalistic-linear" size={12} color="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
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
function ImageUploader({ currentUrl, onChange, compact }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const acceptFile = async (file) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/') || file.name.endsWith('.svg');
    if (!isImage) { setError('File must be an image or SVG'); return; }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.fieldCol}>
      <div
        className={[styles.imgUploader, dragOver ? styles.imgUploaderOver : '', compact ? styles.imgUploaderCompact : ''].join(' ')}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          acceptFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <div className={styles.imgUploaderEmpty}>
            <Icon name="solar:upload-linear" size={20} color="var(--primary-300)" />
            <span style={{ fontSize: 11, color: 'var(--neutral-300)', marginTop: 4 }}>Uploading…</span>
          </div>
        ) : currentUrl ? (
          <img src={currentUrl} alt="" className={styles.imgUploaderPreview} />
        ) : (
          <div className={styles.imgUploaderEmpty}>
            <Icon name="solar:gallery-add-linear" size={20} color="var(--neutral-300)" />
          </div>
        )}
        {!uploading && (
          <div className={styles.imgUploaderHint}>
            <Icon name="solar:upload-linear" size={12} color="currentColor" />
            {currentUrl ? 'Replace' : 'Click or drop'}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.svg"
          style={{ display: 'none' }}
          onChange={e => acceptFile(e.target.files?.[0])}
        />
      </div>
      {currentUrl && compact && (
        <button
          type="button"
          className={styles.bgImageRemoveBtn}
          onClick={e => { e.stopPropagation(); onChange(null); }}
        >
          <Icon name="solar:trash-bin-minimalistic-linear" size={12} color="currentColor" /> Remove
        </button>
      )}
      {error && <div className={styles.imgUploaderError}>{error}</div>}
    </div>
  );
}

// ── Color Variables (global) ────────────────────────────────────────────────
function ColorVarSwatch({ value, name, onChange }) {
  const recentlyUsed = useAppStore(s => s.recentlyUsedColors);
  const pushRecent = useAppStore(s => s.pushRecentColor);
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popoverRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const popoverWidth = 264;
      const margin = 8;
      let left = r.left;
      left = Math.max(margin, Math.min(left, window.innerWidth - popoverWidth - margin));
      const popoverMaxH = Math.min(window.innerHeight - 16, 720);
      const spaceBelow = window.innerHeight - r.bottom - margin;
      const spaceAbove = r.top - margin;
      let top = (spaceBelow >= 200 || spaceBelow >= spaceAbove) ? r.bottom + 4 : Math.max(margin, r.top - 4 - popoverMaxH);
      top = Math.max(margin, Math.min(top, window.innerHeight - margin - 40));
      setPos({ top, left });
    };
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const ro = new ResizeObserver(update);
    ro.observe(btnRef.current);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); ro.disconnect(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={styles.colorDotBtn}
        onClick={() => setOpen(o => !o)}
        aria-label={`Color for ${name}`}
        style={{ flexShrink: 0 }}
      >
        <span
          className={styles.colorDot}
          style={{
            background: value,
            borderColor: typeof value === 'string' && value.toLowerCase() === '#ffffff' ? '#CED4DD' : value,
          }}
        />
      </button>
      {open && createPortal(
        <div ref={popoverRef} className={styles.colorPickerPortal} style={{ top: pos.top, left: pos.left }}>
          <ColorPicker
            value={value}
            onChange={onChange}
            variables={[]}
            recentlyUsed={recentlyUsed}
            onCommitRecent={pushRecent}
            allowGradient={false}
            onClose={() => setOpen(false)}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

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
          <ColorVarSwatch
            value={cv.hex}
            name={cv.name}
            onChange={hex => updateColorVariable(cv.name, { hex })}
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
          <CloseButton size={14} onClick={() => removeColorVariable(cv.name)} className={styles.colorVarRemove} label="Remove" />
        </div>
      ))}
      <button type="button" className={styles.colorVarAdd} onClick={handleAdd}>
        <Icon name="solar:add-circle-linear" size={14} color="currentColor" />
        Add variable
      </button>
    </div>
  );
}

// Line height with px/% unit toggle. Storage stays backward-compatible:
// number = unitless multiplier (legacy %), string like "18px" = explicit px.
function LineHeightInput({ value, onChange }) {
  const lh = parseLineHeight(value);
  return (
    <IconInput
      label="Line Height"
      unit={lh.unit}
      onUnitChange={u => onChange(formatLineHeight(lh.value, u))}
      value={lh.value}
      onChange={v => onChange(formatLineHeight(v, lh.unit))}
    />
  );
}

function LetterSpacingInput({ value, onChange }) {
  const ls = parseLetterSpacing(value);
  return (
    <IconInput
      label="Letter Spacing"
      unit={ls.unit}
      onUnitChange={u => onChange(formatLetterSpacing(ls.value, u))}
      value={ls.value}
      onChange={v => onChange(formatLetterSpacing(v, ls.unit))}
    />
  );
}

// ── Field primitives ────────────────────────────────────────────────────────
function IconInput({ label, suffix, icon, value, onChange, freeform, unit, onUnitChange }) {
  const [localValue, setLocalValue] = useState(null);
  const editing = localValue !== null;
  const displayed = editing ? localValue : (value ?? '');

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const current = parseFloat(displayed) || 0;
      const next = String(e.key === 'ArrowUp' ? current + step : current - step);
      setLocalValue(null);
      onChange(next);
    }
  };
  const handleChange = (e) => {
    const raw = freeform ? e.target.value : e.target.value.replace(/[^0-9.-]/g, '');
    setLocalValue(raw);
    onChange(raw);
  };
  const handleBlur = () => setLocalValue(null);

  return (
    <div className={styles.fieldCol}>
      {label && <label className={styles.fieldLabel}>{label}</label>}
      <div className={styles.iconInputWrap}>
        {icon && <span className={styles.iconInputIcon}>{icon}</span>}
        <input
          className={styles.iconInputValue}
          type="text"
          value={displayed}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        {unit && onUnitChange ? (
          <button
            type="button"
            className={styles.unitToggleBtn}
            onClick={() => onUnitChange(unit === 'px' ? '%' : 'px')}
            title={`Switch to ${unit === 'px' ? '%' : 'px'}`}
          >
            {unit}
          </button>
        ) : (suffix && <span className={styles.iconInputSuffix}>{suffix}</span>)}
      </div>
    </div>
  );
}

// Thin wrappers around the shared Input/Select primitives so the rest of
// PropertiesPanel keeps its label-above-control field-col layout but stops
// reimplementing the chrome. Single source of truth for visual style now
// lives in src/components/{Input,Select}.
function PlainInput({ label, value, onChange }) {
  return (
    <div className={styles.fieldCol}>
      {label && <label className={styles.fieldLabel}>{label}</label>}
      <Input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectInput({ label, value, options, onChange }) {
  return (
    <div className={styles.fieldCol}>
      {label && <label className={styles.fieldLabel}>{label}</label>}
      <SharedSelect
        options={options}
        value={value ?? ''}
        onChange={onChange}
      />
    </div>
  );
}

function TableEditor({ columns, rows, onChangeColumns, onChangeRows }) {
  const updateHeader = (idx, header) => {
    const next = columns.map((c, i) => i === idx ? { ...c, header } : c);
    onChangeColumns(next);
  };
  const updateCell = (ri, key, value) => {
    const next = rows.map((r, i) => i === ri ? { ...r, [key]: value } : r);
    onChangeRows(next);
  };
  const addColumn = () => {
    const key = `col${columns.length + 1}`;
    onChangeColumns([...columns, { key, header: `Column ${columns.length + 1}` }]);
    onChangeRows(rows.map(r => ({ ...r, [key]: '' })));
  };
  const removeColumn = (idx) => {
    if (columns.length <= 1) return;
    const removed = columns[idx];
    onChangeColumns(columns.filter((_, i) => i !== idx));
    onChangeRows(rows.map(r => { const n = { ...r }; delete n[removed.key]; return n; }));
  };
  const addRow = () => {
    const empty = {};
    columns.forEach(c => { empty[c.key] = ''; });
    onChangeRows([...rows, empty]);
  };
  const removeRow = (idx) => {
    if (rows.length <= 1) return;
    onChangeRows(rows.filter((_, i) => i !== idx));
  };

  return (
    <div className={styles.tableEditor}>
      <div className={styles.tableEditorGrid} style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr) 24px` }}>
        {columns.map((col, ci) => (
          <div key={ci} className={styles.tableEditorHeaderCell}>
            <input
              className={styles.tableEditorInput}
              value={col.header}
              onChange={e => updateHeader(ci, e.target.value)}
              style={{ fontWeight: 600 }}
            />
            {columns.length > 1 && (
              <CloseButton size={10} onClick={() => removeColumn(ci)} className={styles.tableEditorRemoveBtn} label="Remove column" />
            )}
          </div>
        ))}
        <div />
        {rows.map((row, ri) => (
          <Fragment key={ri}>
            {columns.map((col, ci) => (
              <div key={ci} className={styles.tableEditorCell}>
                <input
                  className={styles.tableEditorInput}
                  value={row[col.key] || ''}
                  onChange={e => updateCell(ri, col.key, e.target.value)}
                />
              </div>
            ))}
            <CloseButton size={12} onClick={() => removeRow(ri)} className={styles.tableEditorRemoveRowBtn} label="Remove row" />
          </Fragment>
        ))}
      </div>
      <div className={styles.tableEditorActions}>
        <button className={styles.tableEditorAddBtn} onClick={addRow}>+ Row</button>
        <button className={styles.tableEditorAddBtn} onClick={addColumn}>+ Column</button>
      </div>
    </div>
  );
}

// ── Social / NavBar editors ────────────────────────────────────────────────
const SOCIAL_PRESETS = [
  { id: 'twitter',   label: 'Twitter',   iconUrl: 'https://cdn.simpleicons.org/x/000000' },
  { id: 'linkedin',  label: 'LinkedIn',  iconUrl: 'https://cdn.simpleicons.org/linkedin/0A66C2' },
  { id: 'instagram', label: 'Instagram', iconUrl: 'https://cdn.simpleicons.org/instagram/E4405F' },
  { id: 'facebook',  label: 'Facebook',  iconUrl: 'https://cdn.simpleicons.org/facebook/1877F2' },
  { id: 'youtube',   label: 'YouTube',   iconUrl: 'https://cdn.simpleicons.org/youtube/FF0000' },
  { id: 'tiktok',    label: 'TikTok',    iconUrl: 'https://cdn.simpleicons.org/tiktok/000000' },
  { id: 'github',    label: 'GitHub',    iconUrl: 'https://cdn.simpleicons.org/github/181717' },
];

function SocialIconUpload({ currentUrl, onUpload }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const showToast = useAppStore(s => s.showToast);

  const accept = async (file) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
    if (!isImage && !isSvg) {
      showToast('Icon must be an image or SVG');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onUpload(url);
    } catch (err) {
      showToast(err?.message || 'Icon upload failed');
    }
    setUploading(false);
  };

  return (
    <>
      <button
        type="button"
        className={styles.socialIconBtn}
        onClick={() => inputRef.current?.click()}
        title="Change icon"
      >
        {uploading
          ? <Icon name="solar:upload-linear" size={14} color="var(--primary-300)" />
          : currentUrl
            ? <img src={currentUrl} alt="" width={16} height={16} style={{ borderRadius: 2, display: 'block' }} />
            : <Icon name="solar:upload-linear" size={14} color="var(--neutral-300)" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.svg"
        style={{ display: 'none' }}
        onChange={e => accept(e.target.files?.[0])}
      />
    </>
  );
}

function SocialEditor({ platforms, onChange }) {
  const updatePlatform = (idx, key, value) => {
    const next = platforms.map((p, i) => i === idx ? { ...p, [key]: value } : p);
    onChange(next);
  };
  const removePlatform = (idx) => onChange(platforms.filter((_, i) => i !== idx));
  const addPlatform = (preset) => {
    if (platforms.some(p => p.id === preset.id)) return;
    onChange([...platforms, { ...preset, url: `https://${preset.id}.com` }]);
  };
  const addCustom = () => {
    const id = `custom-${Date.now()}`;
    onChange([...platforms, { id, label: 'Custom', url: '#', iconUrl: '' }]);
  };

  return (
    <div className={styles.tableEditor}>
      {platforms.map((p, i) => (
        <div key={i} className={styles.socialRow}>
          <SocialIconUpload
            currentUrl={p.iconUrl}
            onUpload={url => updatePlatform(i, 'iconUrl', url)}
          />
          <input
            className={styles.tableEditorInput}
            value={p.label}
            onChange={e => updatePlatform(i, 'label', e.target.value)}
            style={{ fontWeight: 500, flex: '0 0 70px' }}
          />
          <input
            className={styles.tableEditorInput}
            value={p.url || ''}
            onChange={e => updatePlatform(i, 'url', e.target.value)}
            placeholder="URL"
            style={{ flex: 1 }}
          />
          <CloseButton size={12} onClick={() => removePlatform(i)} className={styles.tableEditorRemoveRowBtn} label="Remove platform" />
        </div>
      ))}
      <div className={styles.socialPresets}>
        {SOCIAL_PRESETS.filter(sp => !platforms.some(p => p.id === sp.id)).map(sp => (
          <button key={sp.id} className={styles.tableEditorAddBtn} onClick={() => addPlatform(sp)}>
            + {sp.label}
          </button>
        ))}
        <button className={styles.tableEditorAddBtn} onClick={addCustom}>
          + Custom
        </button>
      </div>
    </div>
  );
}

function NavLinkEditor({ links, onChange }) {
  const updateLink = (idx, key, value) => {
    const next = links.map((l, i) => i === idx ? { ...l, [key]: value } : l);
    onChange(next);
  };
  const removeLink = (idx) => onChange(links.filter((_, i) => i !== idx));
  const addLink = () => onChange([...links, { label: 'Link', url: '#' }]);

  return (
    <div className={styles.tableEditor}>
      {links.map((link, i) => (
        <div key={i} className={styles.socialRow}>
          <input
            className={styles.tableEditorInput}
            value={link.label}
            onChange={e => updateLink(i, 'label', e.target.value)}
            placeholder="Label"
            style={{ fontWeight: 500, flex: '0 0 80px' }}
          />
          <input
            className={styles.tableEditorInput}
            value={link.url || ''}
            onChange={e => updateLink(i, 'url', e.target.value)}
            placeholder="URL"
            style={{ flex: 1 }}
          />
          <CloseButton size={12} onClick={() => removeLink(i)} className={styles.tableEditorRemoveRowBtn} label="Remove link" />
        </div>
      ))}
      <button className={styles.tableEditorAddBtn} onClick={addLink}>+ Add link</button>
    </div>
  );
}

// Quick-style chips at the top of the Content section. Tapping one applies a
// preset of typography settings (fontSize + fontWeight, and for Headings the
// `level` too). The matching chip highlights if the current style is already
// at that preset.
const TEXT_STYLE_PRESETS = [
  { key: 'title',    label: 'Title',    fontSize: 24, fontWeight: 'bold',   level: 'h1' },
  { key: 'subtitle', label: 'Subtitle', fontSize: 18, fontWeight: 'bold',   level: 'h2' },
  { key: 'heading',  label: 'Heading',  fontSize: 16, fontWeight: 'bold',   level: 'h3' },
  { key: 'body',     label: 'Body',     fontSize: 14, fontWeight: 'normal', level: null },
];

// Strip inline HTML for plain-text display in the right-panel Text
// textarea. The DOM parses the markup and `innerText` gives us the
// visible characters with `<br>` honoured as newlines. Empty / non-string
// inputs short-circuit so we don't hit jsdom in tests.
function htmlToPlain(html) {
  if (typeof html !== 'string') return '';
  if (typeof document === 'undefined' || !/[<&]/.test(html)) return html;
  // DOMParser builds an inert document: unlike assigning innerHTML on a
  // detached node, nothing here fetches resources or fires handlers such as
  // <img onerror>. We only ever read text back out.
  const doc = new DOMParser().parseFromString(
    html.replace(/<br\s*\/?>/gi, '\n'),
    'text/html',
  );
  return (doc.body.textContent || '').replace(/ /g, ' ');
}

function TextStyleChips({ block, updateBlock, id }) {
  const style = block.data?.style || {};
  const props = block.data?.props || {};
  const apply = (preset) => {
    updateBlock(id, prev => {
      const next = structuredClone(prev);
      next.data = next.data || {};
      next.data.style = next.data.style || {};
      next.data.style.fontSize = preset.fontSize;
      next.data.style.fontWeight = preset.fontWeight;
      next.data.props = next.data.props || {};
      if (next.type === 'Heading' && preset.level) next.data.props.level = preset.level;
      return next;
    });
  };
  // Which chip matches the current element? Text blocks → Body; Headings map
  // to the chip whose `level` matches the block's `level`. Falls back to
  // Heading for unknown levels so something is always selected.
  const active = (() => {
    if (block.type !== 'Heading') return 'body';
    const lvl = (props.level || 'h2').toLowerCase();
    const byLevel = TEXT_STYLE_PRESETS.find(p => p.level === lvl);
    return byLevel ? byLevel.key : 'heading';
  })();
  return (
    <Toggle
      fullWidth
      size="S"
      items={TEXT_STYLE_PRESETS.map(p => ({ key: p.key, label: p.label }))}
      active={active || ''}
      onChange={(key) => {
        const preset = TEXT_STYLE_PRESETS.find(p => p.key === key);
        if (preset) apply(preset);
      }}
    />
  );
}

// Link input — inline collapsible row. Shows a "+ Add link" affordance when
// no link is set, expands to an Input that captures the href and a checkbox
// to toggle target="_blank" (defaults to true to match prior behaviour).
function LinkInput({ value, openInNewTab = true, onChange, onChangeOpenInNewTab }) {
  // Derived open state: a set value always shows the row; `manualOpen` only
  // covers the empty-value "+ Add link" case. Keeps the row in sync when the
  // value changes externally (e.g. selecting a different block).
  const [manualOpen, setManualOpen] = useState(false);
  const open = manualOpen || !!value;
  return (
    <div className={styles.fieldCol}>
      <div className={styles.linkHeader}>
        <label className={styles.fieldLabel}>Link</label>
        <button
          type="button"
          className={styles.linkToggle}
          onClick={() => {
            if (open && value) { onChange(''); }
            setManualOpen(!open);
          }}
          aria-label={open ? 'Remove link' : 'Add link'}
        >
          <Icon name={open ? 'solar:minus-circle-linear' : 'solar:add-circle-linear'} size={14} color="currentColor" />
        </button>
      </div>
      {open && (
        <>
          <Input
            type="url"
            placeholder="https://example.com"
            value={value}
            onChange={e => onChange(e.target.value)}
          />
          {onChangeOpenInNewTab && (
            <label className={styles.linkNewTab}>
              <input
                type="checkbox"
                checked={openInNewTab}
                onChange={(e) => onChangeOpenInNewTab(e.target.checked)}
              />
              <span>Open in New Tab</span>
            </label>
          )}
        </>
      )}
    </div>
  );
}

// Padding control — three modes:
//  • uniform:   one value for all four sides (1 input)
//  • symmetric: top/bottom + left/right (2 inputs)
//  • per-side:  four independent values (4 inputs)
// The mode auto-detects from current values so something else editing
// padding can't strand the UI in the wrong mode.
function PaddingControl({ padding, onChangeSide, onChangeAll }) {
  const allEqual = padding.top === padding.right
                && padding.right === padding.bottom
                && padding.bottom === padding.left;
  const symmetric = !allEqual
                 && padding.top === padding.bottom
                 && padding.left === padding.right;
  const detected = allEqual ? 'uniform' : (symmetric ? 'symmetric' : 'per-side');
  const [mode, setMode] = useState(detected);
  // Keep mode in sync with the values when they're changed elsewhere.
  useEffect(() => { setMode(detected); }, [detected]);

  const setSymmetric = (vertical, horizontal) => {
    onChangeSide('top', vertical);
    onChangeSide('bottom', vertical);
    onChangeSide('left', horizontal);
    onChangeSide('right', horizontal);
  };

  return (
    <>
      <div className={styles.paddingLabelRow}>
        <label className={styles.fieldLabelStrong}>Padding</label>
        <Toggle
          size="S"
          items={[
            { key: 'uniform',   label: '', icon: <PadUniformIcon /> },
            { key: 'symmetric', label: '', icon: <PadSymmetricIcon /> },
            { key: 'per-side',  label: '', icon: <PadPerSideIcon /> },
          ]}
          active={mode}
          onChange={(v) => {
            setMode(v);
            if (v === 'uniform') onChangeAll(padding.top);
            else if (v === 'symmetric') setSymmetric(padding.top, padding.left);
          }}
        />
      </div>
      {mode === 'uniform' && (
        <IconInput
          suffix="px" icon={<PadAllSidesIcon />}
          value={padding.top}
          onChange={v => onChangeAll(parseFloat(v) || 0)}
        />
      )}
      {mode === 'symmetric' && (
        <Row2>
          <IconInput
            label="Vertical" suffix="px" icon={<PadVerticalIcon />}
            value={padding.top}
            onChange={v => {
              const n = parseFloat(v) || 0;
              onChangeSide('top', n);
              onChangeSide('bottom', n);
            }}
          />
          <IconInput
            label="Horizontal" suffix="px" icon={<PadHorizontalIcon />}
            value={padding.left}
            onChange={v => {
              const n = parseFloat(v) || 0;
              onChangeSide('left', n);
              onChangeSide('right', n);
            }}
          />
        </Row2>
      )}
      {mode === 'per-side' && (
        <>
          <Row2>
            <IconInput
              suffix="px" icon={<PadLeftIcon />}
              value={padding.left}
              onChange={v => onChangeSide('left', parseFloat(v) || 0)}
            />
            <IconInput
              suffix="px" icon={<PadTopIcon />}
              value={padding.top}
              onChange={v => onChangeSide('top', parseFloat(v) || 0)}
            />
          </Row2>
          <Row2>
            <IconInput
              suffix="px" icon={<PadRightIcon />}
              value={padding.right}
              onChange={v => onChangeSide('right', parseFloat(v) || 0)}
            />
            <IconInput
              suffix="px" icon={<PadBottomIcon />}
              value={padding.bottom}
              onChange={v => onChangeSide('bottom', parseFloat(v) || 0)}
            />
          </Row2>
        </>
      )}
    </>
  );
}

// Border control — uses the same +/− toggle pattern as LinkInput so the
// builder UI is consistent. Collapsed when no border values are set;
// expanding applies sensible defaults.
function BorderControl({ style, onUpdate }) {
  // Two storage shapes:
  //   uniform → style.borderWidth/Color/Style (existing)
  //   per-side → style.borderSides = { top, right, bottom, left } where
  //     each side is null (no border) or { width, color, style }
  const hasUniform = !!(style.borderWidth || style.borderColor || style.borderStyle);
  const hasPerSide = !!(style.borderSides && Object.values(style.borderSides).some(Boolean));
  const hasBorder = hasUniform || hasPerSide;
  const [open, setOpen] = useState(hasBorder);
  const [mode, setMode] = useState(hasPerSide ? 'per-side' : 'uniform');

  const removeBorder = () => {
    onUpdate('borderWidth', null);
    onUpdate('borderStyle', null);
    onUpdate('borderColor', null);
    onUpdate('borderSides', null);
    setOpen(false);
  };
  const addBorder = () => {
    onUpdate('borderWidth', style.borderWidth || 1);
    onUpdate('borderStyle', style.borderStyle || 'solid');
    onUpdate('borderColor', style.borderColor || '#E1E4EA');
    setOpen(true);
  };

  // Seed per-side from current uniform when the user switches modes so
  // they don't lose the values they already configured.
  const seedSide = () => ({ width: style.borderWidth || 1, color: style.borderColor || '#E1E4EA', style: style.borderStyle || 'solid' });
  const switchMode = (next) => {
    if (next === mode) return;
    if (next === 'per-side') {
      const seed = style.borderSides || { top: seedSide(), right: seedSide(), bottom: seedSide(), left: seedSide() };
      onUpdate('borderSides', seed);
    } else {
      onUpdate('borderSides', null);
    }
    setMode(next);
  };

  const sides = style.borderSides || {};
  const toggleSide = (side) => {
    const next = { ...sides };
    next[side] = next[side] ? null : seedSide();
    onUpdate('borderSides', next);
  };
  const updateSide = (side, key, value) => {
    const next = { ...sides, [side]: { ...(sides[side] || seedSide()), [key]: value } };
    onUpdate('borderSides', next);
  };

  return (
    <div className={styles.fieldCol}>
      <div className={styles.linkHeader}>
        <label className={styles.fieldLabel}>Border</label>
        <button
          type="button"
          className={styles.linkToggle}
          onClick={() => open ? removeBorder() : addBorder()}
          aria-label={open ? 'Remove border' : 'Add border'}
        >
          <Icon name={open ? 'solar:minus-circle-linear' : 'solar:add-circle-linear'} size={14} color="currentColor" />
        </button>
      </div>
      {open && (
        <>
          <div className={styles.fieldCol}>
            <Toggle
              fullWidth
              size="S"
              items={[
                { key: 'uniform',  label: 'All sides' },
                { key: 'per-side', label: 'Per side' },
              ]}
              active={mode}
              onChange={switchMode}
            />
          </div>
          {mode === 'uniform' ? (
            <>
              <Row2>
                <IconInput
                  label="Width" suffix="px"
                  value={style.borderWidth ?? 1}
                  onChange={v => onUpdate('borderWidth', parseFloat(v) || 0)}
                />
                <ColorInput
                  label="Color"
                  value={style.borderColor || '#E1E4EA'}
                  onChange={v => onUpdate('borderColor', v)}
                />
              </Row2>
              <div className={styles.fieldCol}>
                <label className={styles.fieldLabel}>Style</label>
                <Toggle
                  fullWidth
                  size="S"
                  items={[
                    { key: 'solid',  label: 'Solid' },
                    { key: 'dashed', label: 'Dashed' },
                    { key: 'dotted', label: 'Dotted' },
                  ]}
                  active={style.borderStyle || 'solid'}
                  onChange={v => onUpdate('borderStyle', v)}
                />
              </div>
            </>
          ) : (
            <>
              {/* Side enable toggles — clicking a side enables/disables its
                  border. Compact icon set top/right/bottom/left. */}
              <div className={styles.fieldCol}>
                <label className={styles.fieldLabel}>Sides</label>
                <div className={styles.bsideRow}>
                  {[
                    { key: 'top', label: 'T' },
                    { key: 'right', label: 'R' },
                    { key: 'bottom', label: 'B' },
                    { key: 'left', label: 'L' },
                  ].map(s => (
                    <button
                      key={s.key}
                      type="button"
                      className={[styles.bsideBtn, sides[s.key] ? styles.bsideBtnOn : ''].join(' ')}
                      onClick={() => toggleSide(s.key)}
                      title={`Toggle ${s.key}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Render width + color rows for each enabled side. Keeping
                  these stacked avoids cramming 4 cols × 3 fields in a tiny
                  panel; users typically enable 1–2 sides. */}
              {['top', 'right', 'bottom', 'left'].filter(k => sides[k]).map((k) => (
                <Row2 key={k}>
                  <IconInput
                    label={`${k} width`} suffix="px"
                    value={sides[k]?.width ?? 1}
                    onChange={v => updateSide(k, 'width', parseFloat(v) || 0)}
                  />
                  <ColorInput
                    label="Color"
                    value={sides[k]?.color || '#E1E4EA'}
                    onChange={v => updateSide(k, 'color', v)}
                  />
                </Row2>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Independent decoration toggles — bold/italic/underline/strike can combine ─
// The leading "none" button is a one-click clear that turns every decoration
// off in a single tap (matches the Figma reference).
function DecorationToggles({ bold, italic, underline, strike, code, caps, onChange }) {
  const anyOn = bold || italic || underline || strike || code || caps;
  const items = [
    { key: 'bold',      on: bold,      icon: <DecoBoldIcon />,      label: 'Bold' },
    { key: 'italic',    on: italic,    icon: <DecoItalicIcon />,    label: 'Italic' },
    { key: 'underline', on: underline, icon: <DecoUnderlineIcon />, label: 'Underline' },
    { key: 'strike',    on: strike,    icon: <DecoStrikeIcon />,    label: 'Strikethrough' },
    { key: 'code',      on: code,      icon: <DecoCodeIcon />,      label: 'Code' },
    { key: 'caps',      on: caps,      icon: <DecoCapsIcon />,      label: 'Uppercase' },
  ];
  return (
    <div className={styles.decoToggles}>
      <button
        type="button"
        className={[styles.decoToggleBtn, !anyOn ? styles.decoToggleActive : ''].join(' ')}
        onClick={() => {
          if (bold) onChange('bold', false);
          if (italic) onChange('italic', false);
          if (underline) onChange('underline', false);
          if (strike) onChange('strike', false);
          if (code) onChange('code', false);
          if (caps) onChange('caps', false);
        }}
        title="None"
        aria-label="No decoration"
        aria-pressed={!anyOn}
      >
        <DecoNoneIcon />
      </button>
      {items.map(it => (
        <button
          key={it.key}
          type="button"
          className={[styles.decoToggleBtn, it.on ? styles.decoToggleActive : ''].join(' ')}
          onClick={() => onChange(it.key, !it.on)}
          title={it.label}
          aria-label={it.label}
          aria-pressed={it.on}
        >
          {it.icon}
        </button>
      ))}
    </div>
  );
}

// ── Inline icons (precise to match Figma) ──────────────────────────────────
function svg(d, w = 16, h = 16) {
  return (
    <svg width={w} height={h} viewBox="0 0 16 16" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
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
// Uniform / Symmetric (vertical bars) / Per-side mode icons. Symmetric is a
// square with two vertical guides hinting at independent top/bottom only.
const PadUniformIcon   = () => svg('M3 3h10v10H3z');
const PadSymmetricIcon = () => svg('M3 3h10v10H3z M3 8h10');
const PadPerSideIcon   = () => svg('M3 3h10v10H3z M3 8h10 M8 3v10');

// PadAllSidesIcon — used as the input-field icon when padding is in
// uniform mode. Two concentric squares clearly read as "padding on all
// sides" and avoid clashing with RadiusIcon (rounded-corner glyph).
const PadAllSidesIcon = () => svg('M2 2h12v12H2z M5 5h6v6H5z');

// Symmetric input icons — vertical & horizontal axes.
const PadVerticalIcon   = () => svg('M8 3v10 M5 4l3-1 3 1 M5 12l3 1 3-1');
const PadHorizontalIcon = () => svg('M3 8h10 M4 5l-1 3 1 3 M12 5l1 3-1 3');

const DirectionRowIcon = () => svg('M2 8h10 M9 5l3 3-3 3');
const DirectionColIcon = () => svg('M8 2v10 M5 9l3 3 3-3');

const AlignLeftIcon    = () => svg('M2 4h12 M2 8h8 M2 12h12');
const AlignCenterIcon  = () => svg('M2 4h12 M4 8h8 M2 12h12');
const AlignRightIcon   = () => svg('M2 4h12 M6 8h8 M2 12h12');
const AlignJustifyIcon = () => svg('M2 4h12 M2 8h12 M2 12h12');
// Vertical-align icons for the fixed-height container Position toggle.
// Top: heavy bar at the top, two shorter rows below. Middle: shorter
// rows above and below a heavy bar. Bottom: heavy bar at the bottom.
const AlignTopIcon     = () => svg('M2 3h12 M4 7h8 M4 11h8');
const AlignMiddleIcon  = () => svg('M4 4h8 M2 8h12 M4 12h8');
const AlignBottomIcon  = () => svg('M4 5h8 M4 9h8 M2 13h12');

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
    <line x1="3" y1="12" x2="11" y2="12" stroke="currentColor" strokeWidth="1" />
  </svg>
);
const DecoStrikeIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <text x="4" y="11" fontSize="11" fontFamily="Inter" fill="currentColor">T</text>
    <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1" />
  </svg>
);
const DecoCodeIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <path d="M5 4L2 7L5 10 M9 4L12 7L9 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const DecoCapsIcon = () => (
  <svg width={16} height={14} viewBox="0 0 16 14" fill="none">
    <text x="1" y="10" fontSize="9" fontFamily="Inter" fontWeight="500" fill="currentColor">AB</text>
  </svg>
);

// Three icons for the list-style toggle on Text blocks.
const ListNoneIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <line x1="3" y1="4" x2="11" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="3" y1="10" x2="11" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);
const ListBulletIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <circle cx="2.5" cy="4" r="0.9" fill="currentColor" />
    <circle cx="2.5" cy="7" r="0.9" fill="currentColor" />
    <circle cx="2.5" cy="10" r="0.9" fill="currentColor" />
    <line x1="5.5" y1="4" x2="11.5" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="5.5" y1="7" x2="11.5" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="5.5" y1="10" x2="11.5" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);
const ListNumberIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <text x="1" y="5" fontSize="3.5" fontFamily="Inter" fontWeight="500" fill="currentColor">1.</text>
    <text x="1" y="8.5" fontSize="3.5" fontFamily="Inter" fontWeight="500" fill="currentColor">2.</text>
    <text x="1" y="12" fontSize="3.5" fontFamily="Inter" fontWeight="500" fill="currentColor">3.</text>
    <line x1="5.5" y1="4" x2="11.5" y2="4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="5.5" y1="7" x2="11.5" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <line x1="5.5" y1="10" x2="11.5" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);