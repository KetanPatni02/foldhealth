/**
 * Form-level settings, shown in the Properties column when no field is
 * selected. Mirrors the email-builder's Design/Template panel layout
 * (section strips, field columns, live preset cards) for visual consistency.
 */
import { Icon } from '../../../components/Icon/Icon';
import { Select } from '../../../components/Select/Select';
import { Switch } from '../../../components/Switch/Switch';
import { GOOGLE_FONTS } from '../../email-builder/googleFonts';
import { HEADER_PRESETS, FOOTER_PRESETS } from '../../email-builder/headerFooterLibrary';
import { PresetLivePreview } from '../../email-builder/PresetLivePreview';
import email from '../../email-builder/EmailBuilder.module.css';
import styles from './FormBuilder.module.css';

const BG_SWATCHES = ['#FFFFFF', '#F6F7F8', '#FCFAFF', '#F5FFFA', '#FFF9F0'];

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
  const bg = s.background || '#FFFFFF';

  return (
    <div className={email.designScroll}>
      <div className={email.sectionHeadingStrip}>Typography</div>
      <div className={email.sectionContent}>
        <div className={email.fieldCol}>
          <label className={email.fieldLabel}>Font family</label>
          <Select
            value={s.fontFamily || 'Inter'}
            options={GOOGLE_FONTS.map((f) => ({ value: f.value, label: f.label }))}
            onChange={(v) => set({ fontFamily: v })}
          />
        </div>
      </div>

      <div className={email.sectionHeadingStrip}>Background</div>
      <div className={email.sectionContent}>
        <div className={styles.swatchRow}>
          {BG_SWATCHES.map((c) => (
            <button
              key={c}
              className={`${styles.swatch} ${bg === c ? styles.swatchSel : ''}`}
              style={{ background: c }}
              onClick={() => set({ background: c })}
              aria-label={`Background ${c}`}
            />
          ))}
          <label className={styles.swatchCustom} title="Custom color">
            <Icon name="solar:pallete-2-linear" size={15} color="var(--neutral-300)" />
            <input type="color" value={bg} onChange={(e) => set({ background: e.target.value })} />
          </label>
        </div>
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
