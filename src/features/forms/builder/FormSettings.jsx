/**
 * Form-level settings, shown in the Properties column when no field is
 * selected. Mirrors the email-builder's Design/Template panel layout
 * (section strips, field columns, live preset cards) for visual consistency.
 */
import { Select } from '../../../components/Select/Select';
import { Switch } from '../../../components/Switch/Switch';
import { GOOGLE_FONTS, getFontStack, injectGoogleFonts } from '../../email-builder/googleFonts';
import { HEADER_PRESETS, FOOTER_PRESETS } from '../../email-builder/headerFooterLibrary';
import { PresetLivePreview } from '../../email-builder/PresetLivePreview';
import { ColorInput } from '../../email-builder/ColorInput';
import email from '../../email-builder/EmailBuilder.module.css';
import styles from './FormBuilder.module.css';

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

  return (
    <div className={email.designScroll}>
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
    </div>
  );
}
