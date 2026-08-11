import { availableRoles } from '../../../data/chatGroups';

export const labelStyle = { fontSize: 14, color: 'var(--neutral-300)', fontWeight: 400, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 };

export const reqDot = <span style={{ color: 'var(--status-error)', fontSize: 14, lineHeight: 1 }}>*</span>;

export const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 4, border: '0.5px solid var(--neutral-150)',
  fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none', boxSizing: 'border-box',
  color: 'var(--neutral-400)',
};

export { availableRoles };
