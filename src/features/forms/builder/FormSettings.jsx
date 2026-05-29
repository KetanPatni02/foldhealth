/**
 * Form-level settings, shown in the Properties column when no field is
 * selected. Mirrors the email-builder's Design/Template panel layout
 * (section strips, field columns, live preset cards) for visual consistency.
 */
import { Select } from '../../../components/Select/Select';
import { Switch } from '../../../components/Switch/Switch';
import { Icon } from '../../../components/Icon/Icon';
import { Input } from '../../../components/Input/Input';
import { Textarea } from '../../../components/Textarea/Textarea';
import { GOOGLE_FONTS, getFontStack, injectGoogleFonts } from '../../email-builder/googleFonts';
import { HEADER_PRESETS, FOOTER_PRESETS } from '../../email-builder/headerFooterLibrary';
import { PresetLivePreview } from '../../email-builder/PresetLivePreview';
import { ColorInput } from '../../email-builder/ColorInput';
import { normalizeLayout } from '../render/layout';
import email from '../../email-builder/EmailBuilder.module.css';
import styles from './FormBuilder.module.css';

const LAYOUT_OPTIONS = [
  { value: 'by-question', icon: 'solar:square-academic-cap-linear', title: 'One question at a time', desc: 'Guided, Typeform-style — one screen per question.' },
  { value: 'by-section', icon: 'solar:list-linear', title: 'Section by section', desc: 'One section per screen with Next / Back.' },
  { value: 'entire-page', icon: 'solar:document-text-linear', title: 'Entire page', desc: 'All questions on one scrolling page.' },
];

// Load the web fonts so each dropdown option previews in its own typeface.
injectGoogleFonts();

// Each option renders in its own font family (preview-in-dropdown).
const FONT_OPTIONS = GOOGLE_FONTS.map((f) => ({
  value: f.value,
  label: f.label,
  style: { fontFamily: getFontStack(f.value) },
}));

function PresetGrid({ presets, selectedId, onSelect }) {
  return (
    <div className={email.presetCardList}>
      {presets.map((p) => (
        <div
          key={p.id}
          className={`${email.presetCardWrap} ${selectedId === p.id ? styles.presetCardSelected : ''}`}
        >
          <button type="button" className={email.presetCard} onClick={() => onSelect(p.id)}>
            <PresetLivePreview preset={p} />
            <div className={email.presetCardMeta}>
              <div className={email.presetCardTitle}>{p.label}</div>
              {p.description && <div className={email.presetCardDesc}>{p.description}</div>}
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

export function FormSettings({ settings, onChange }) {
  const s = settings || {};
  const set = (patch) => onChange({ ...s, ...patch });
  const header = s.header || { enabled: false, presetId: HEADER_PRESETS[0].id };
  const footer = s.footer || { enabled: false, presetId: FOOTER_PRESETS[0].id };
  const start = s.start || { enabled: true, buttonLabel: 'Start' };
  const end = s.end || { enabled: true };

  const layout = normalizeLayout(s.layout);
  const paged = layout !== 'entire-page';

  return (
    <div className={email.designScroll}>
      <div className={email.sectionHeadingStrip}>Layout</div>
      <div className={email.sectionContent}>
        <div className={styles.layoutCards}>
          {LAYOUT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`${styles.layoutCard} ${layout === o.value ? styles.layoutCardSel : ''}`}
              onClick={() => set({ layout: o.value })}
            >
              <span className={styles.layoutCardIcon}>
                <Icon name={o.icon} size={18} color={layout === o.value ? 'var(--primary-300)' : 'var(--neutral-300)'} />
              </span>
              <span className={styles.layoutCardMain}>
                <span className={styles.layoutCardTitle}>{o.title}</span>
                <span className={styles.layoutCardDesc}>{o.desc}</span>
              </span>
              {layout === o.value && <Icon name="solar:check-circle-bold" size={16} color="var(--primary-300)" />}
            </button>
          ))}
        </div>
      </div>

      <div className={email.sectionHeadingStrip}>Typography</div>
      <div className={email.sectionContent}>
        <div className={email.fieldCol}>
          <label className={email.fieldLabel}>Font family</label>
          <Select
            value={s.fontFamily || 'Inter'}
            options={FONT_OPTIONS}
            onChange={(v) => set({ fontFamily: v })}
          />
        </div>
      </div>

      <div className={email.sectionHeadingStrip}>Background</div>
      <div className={email.sectionContent}>
        <ColorInput value={s.background || '#FFFFFF'} onChange={(v) => set({ background: v })} />
      </div>

      {paged ? (
        <>
          {/* Paged layouts replace header/footer with start + end screens. */}
          <div className={email.sectionHeadingStrip}>Start screen</div>
          <div className={email.sectionContent}>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Show start screen</span>
              <Switch checked={start.enabled !== false} onChange={(v) => set({ start: { ...start, enabled: v } })} />
            </div>
            {start.enabled !== false && (
              <>
                <label className={email.fieldLabel}>Title</label>
                <Input className={styles.ctl} value={start.title || ''} placeholder="Welcome" onChange={(e) => set({ start: { ...start, title: e.target.value } })} />
                <label className={email.fieldLabel}>Description</label>
                <Textarea className={styles.ctl} rows={2} value={start.description || ''} placeholder="A short intro for respondents" onChange={(e) => set({ start: { ...start, description: e.target.value } })} />
                <label className={email.fieldLabel}>Button label</label>
                <Input className={styles.ctl} value={start.buttonLabel || 'Start'} onChange={(e) => set({ start: { ...start, buttonLabel: e.target.value } })} />
              </>
            )}
          </div>

          <div className={email.sectionHeadingStrip}>End screen</div>
          <div className={email.sectionContent}>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Show end screen</span>
              <Switch checked={end.enabled !== false} onChange={(v) => set({ end: { ...end, enabled: v } })} />
            </div>
            {end.enabled !== false && (
              <>
                <label className={email.fieldLabel}>Title</label>
                <Input className={styles.ctl} value={end.title || ''} placeholder="Thank you!" onChange={(e) => set({ end: { ...end, title: e.target.value } })} />
                <label className={email.fieldLabel}>Description</label>
                <Textarea className={styles.ctl} rows={2} value={end.description || ''} placeholder="Your response has been recorded." onChange={(e) => set({ end: { ...end, description: e.target.value } })} />
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className={email.sectionHeadingStrip}>Header</div>
          <div className={email.sectionContent}>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Show header</span>
              <Switch checked={header.enabled} onChange={(v) => set({ header: { ...header, enabled: v } })} />
            </div>
            {header.enabled && (
              <PresetGrid presets={HEADER_PRESETS} selectedId={header.presetId} onSelect={(id) => set({ header: { ...header, presetId: id } })} />
            )}
          </div>

          <div className={email.sectionHeadingStrip}>Footer</div>
          <div className={email.sectionContent}>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Show footer</span>
              <Switch checked={footer.enabled} onChange={(v) => set({ footer: { ...footer, enabled: v } })} />
            </div>
            {footer.enabled && (
              <PresetGrid presets={FOOTER_PRESETS} selectedId={footer.presetId} onSelect={(id) => set({ footer: { ...footer, presetId: id } })} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
