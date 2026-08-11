import { isGradient } from './colorHelpers';

export function bgProps(value) {
  if (!value) return {};
  if (isGradient(value)) return { backgroundImage: value };
  return { backgroundColor: value };
}

export function parseSize(v) {
  if (v == null || v === '') return { num: null, unit: 'px' };
  const s = String(v);
  if (s.endsWith('%')) return { num: parseFloat(s), unit: '%' };
  return { num: parseFloat(s) || null, unit: 'px' };
}

export const TYPE_LABELS = {
  EmailLayout: 'Email',
  Heading: 'Heading',
  Text: 'Text',
  Button: 'Button',
  Image: 'Image',
  Avatar: 'Avatar',
  Divider: 'Divider',
  Spacer: 'Spacer',
  Container: 'Wrapper',
  ColumnsContainer: 'Columns',
  Social: 'Social',
  NavBar: 'Nav Bar',
  Table: 'Table',
  RawHtml: 'Raw HTML',
};

export const BUTTON_SIZE_STYLES = {
  'x-small': { padding: '6px 12px', fontSize: 12 },
  small: { padding: '8px 16px', fontSize: 13 },
  medium: { padding: '12px 20px', fontSize: 14 },
  large: { padding: '14px 28px', fontSize: 16 },
};
export const BUTTON_PRESET_RADIUS = { rectangle: 0, rounded: 6, pill: 9999 };
export const NO_IMAGE_PLACEHOLDER_STYLE = {
  padding: 24, border: '1px dashed var(--neutral-150)', borderRadius: 8, color: 'var(--neutral-200)', fontSize: 12,
};
export const EDITABLE_INPUT_BASE_STYLE = {
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: 'var(--primary-25, #FAFAFF)',
  outline: '2px solid var(--primary-300)',
  outlineOffset: -2,
  fontSize: 'inherit',
  fontFamily: 'inherit',
};
export const EDITABLE_DISPLAY_STYLE = { padding: '8px 12px', cursor: 'text', minHeight: 20 };

export function blockLabel(block) {
  const role = block.data?.role;
  if (role === 'header') return 'Header';
  if (role === 'body') return 'Body';
  if (role === 'footer') return 'Footer';
  // alias wins over the generic type label so the selection toolbar reads
  // "Section" (or any user rename) rather than the underlying "Wrapper".
  if (block.data?.alias) return block.data.alias;
  return TYPE_LABELS[block.type] || block.type;
}

export function paddingCss(p) {
  if (!p) return undefined;
  return `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
}

export function perSideBorderStyle(borderSides) {
  if (!borderSides || !Object.values(borderSides).some(Boolean)) return null;
  const out = {};
  const fmt = (s) => `${s.width || 1}px ${s.style || 'solid'} ${s.color || '#3A485F'}`;
  if (borderSides.top)    out.borderTop    = fmt(borderSides.top);
  if (borderSides.right)  out.borderRight  = fmt(borderSides.right);
  if (borderSides.bottom) out.borderBottom = fmt(borderSides.bottom);
  if (borderSides.left)   out.borderLeft   = fmt(borderSides.left);
  return out;
}

export function applyBorder(target, style) {
  const perSide = perSideBorderStyle(style.borderSides);
  if (perSide) Object.assign(target, perSide);
  else if (style.borderWidth) target.border = `${style.borderWidth}px ${style.borderStyle || 'solid'} ${style.borderColor || '#3A485F'}`;
}

// Six-dot drag handle that matches the Figma toolbar precisely.
// Translate the block's style object into the inline CSS string the
// matching iframe element should carry. Inline styles win over CSS class
// rules so Design-tab edits live-update the canvas without us having to
// rewrite the original <style> block.
export function blockStyleToCss(s) {
  if (!s) return '';
  const parts = [];
  if (s.color) parts.push(`color: ${s.color}`);
  if (s.backgroundColor) {
    // Gradient strings go on background-image; solids on background-color.
    if (/^(linear|radial)-gradient/.test(s.backgroundColor)) {
      parts.push(`background-image: ${s.backgroundColor}`);
    } else {
      parts.push(`background-color: ${s.backgroundColor}`);
    }
  }
  if (s.backgroundImage && !/^(linear|radial)-gradient/.test(s.backgroundColor || '')) {
    parts.push(`background-image: url("${s.backgroundImage}")`);
    if (s.backgroundSize) parts.push(`background-size: ${s.backgroundSize}`);
    if (s.backgroundPosition) parts.push(`background-position: ${s.backgroundPosition}`);
    if (s.backgroundRepeat) parts.push(`background-repeat: ${s.backgroundRepeat}`);
  }
  if (s.fontFamily) parts.push(`font-family: ${s.fontFamily}`);
  if (s.fontSize != null) parts.push(`font-size: ${s.fontSize}px`);
  if (s.fontWeight) parts.push(`font-weight: ${s.fontWeight}`);
  if (s.fontStyle) parts.push(`font-style: ${s.fontStyle}`);
  if (s.textDecoration) parts.push(`text-decoration: ${s.textDecoration}`);
  if (s.textTransform) parts.push(`text-transform: ${s.textTransform}`);
  if (s.textAlign) parts.push(`text-align: ${s.textAlign}`);
  if (s.letterSpacing) parts.push(`letter-spacing: ${s.letterSpacing}`);
  if (s.lineHeight) parts.push(`line-height: ${s.lineHeight}`);
  if (s.padding) {
    const p = s.padding;
    parts.push(`padding: ${p.top || 0}px ${p.right || 0}px ${p.bottom || 0}px ${p.left || 0}px`);
  }
  if (s.borderRadius != null) parts.push(`border-radius: ${s.borderRadius}px`);
  if (s.borderWidth) {
    parts.push(`border: ${s.borderWidth}px ${s.borderStyle || 'solid'} ${s.borderColor || '#000'}`);
  }
  return parts.join('; ');
}

// Editable iframe for confirmed custom HTML bodies. Loads the HTML once,
// makes the body contenteditable, and writes outerHTML back to
// `doc.root.data.customHtml` on input. Clicks on tagged elements
// (`[data-eb-block-id]`) select the matching block; block-style changes
// from the Design tab are written into the iframe as inline CSS.
