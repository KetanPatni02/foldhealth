import { useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { Input } from '../../components/Input/Input';
import styles from './InsurancePlanFormUtils.module.css';

/* ── FieldLabel — label row with optional required dot and info icon ── */
export function FieldLabel({ children, required, info }) {
  return (
    <div className={styles.label}>
      {children}
      {required && <span className={styles.required} />}
      {info && (
        <Icon name="solar:info-circle-linear" size={12} color="var(--neutral-200)" style={{ flexShrink: 0 }} />
      )}
    </div>
  );
}

/* ── PrefixInput — Input with an inline leading symbol (e.g. "$") ── */
export function PrefixInput({ prefix, ...inputProps }) {
  return (
    <div className={styles.prefixInputWrap}>
      <span className={styles.prefixSymbol}>{prefix}</span>
      <Input className={styles.prefixInputField} {...inputProps} />
    </div>
  );
}

/* ── CollapsibleSection — reusable accordion card used by each form section ── */
export function CollapsibleSection({ icon, title, children }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={styles.sectionCard}>
      <div
        className={`${styles.sectionHeader} ${collapsed ? styles.collapsed : ''}`}
        onClick={() => setCollapsed(v => !v)}
      >
        <span className={styles.sectionIconAvatar}>
          <Icon name={icon} size={14} color="var(--primary-300)" />
        </span>
        <span className={styles.sectionTitle}>{title}</span>
        <Icon
          name={collapsed ? 'solar:alt-arrow-right-linear' : 'solar:alt-arrow-down-linear'}
          size={12}
          color="var(--neutral-300)"
        />
      </div>
      <div className={`${styles.collapseOuter} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.collapseInner}>
          <div className={styles.sectionBody}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
