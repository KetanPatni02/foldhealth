// Color & gradient helpers for the email builder color picker.
//
// Storage model: a "color value" is either:
//   • a hex string ('#RRGGBB') — solid
//   • a CSS gradient string ('linear-gradient(90deg, #FFFFFF 0%, #000000 100%)')
//
// Helpers below parse, format, and convert between hex/RGB/HSV for the
// custom picker; plus split top-level commas so gradient stops with their
// own commas (e.g. inside rgb()) stay together.

const GRADIENT_RE = /^(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i;

export function isGradient(value) {
  return typeof value === 'string' && GRADIENT_RE.test(value.trim());
}

// Split a string by top-level delimiter, respecting parens. Used to split
// gradient stops so `rgb(0, 0, 0)` doesn't get torn apart.
function splitTopLevel(str, delim) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === delim && depth === 0) {
      out.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.length) out.push(buf);
  return out.map(s => s.trim()).filter(Boolean);
}

// Parse "linear-gradient(90deg, #FFF 0%, #000 100%)" into a structured object.
// Returns null when the string isn't a (linear|radial)-gradient — callers
// should fall back to solid-color handling in that case.
export function parseGradient(str) {
  if (!isGradient(str)) return null;
  const m = str.trim().match(/^(linear|radial)-gradient\s*\(([\s\S]+)\)\s*$/i);
  if (!m) return null;
  const type = m[1].toLowerCase();
  const parts = splitTopLevel(m[2], ',');
  if (!parts.length) return null;

  let angle = 90;
  let stopParts = parts;
  if (type === 'linear' && /^-?\d+(?:\.\d+)?(?:deg|turn|rad|grad)$/i.test(parts[0])) {
    angle = parseFloat(parts[0]);
    stopParts = parts.slice(1);
  } else if (type === 'linear' && /^to\s+/i.test(parts[0])) {
    angle = 90;
    stopParts = parts.slice(1);
  }

  const stops = stopParts.map((p, i) => {
    const sm = p.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)\s*%$/);
    if (sm) return { color: sm[1].trim(), position: parseFloat(sm[2]) };
    return { color: p.trim(), position: (i / Math.max(1, stopParts.length - 1)) * 100 };
  });

  if (stops.length < 2) {
    stops.push({ color: '#000000', position: 100 });
  }
  return { type, angle, stops };
}

export function formatGradient({ type = 'linear', angle = 90, stops = [] }) {
  const head = type === 'linear' ? `${angle}deg, ` : '';
  const body = stops
    .map(s => `${s.color} ${Math.round(s.position)}%`)
    .join(', ');
  return `${type}-gradient(${head}${body})`;
}

// Pull the first stop's color out of a gradient — used as an email fallback
// when a client can't render gradient text or backgrounds.
export function firstStopColor(gradient) {
  const g = parseGradient(gradient);
  return g?.stops?.[0]?.color || '#000000';
}

// ── HEX / RGB / HSV conversion ───────────────────────────────────────────
export function normalizeHex(input) {
  if (!input) return '#000000';
  let h = String(input).trim();
  if (!h.startsWith('#')) h = '#' + h;
  if (/^#[0-9a-f]{3}$/i.test(h)) {
    h = '#' + h.slice(1).split('').map(c => c + c).join('');
  }
  if (!/^#[0-9a-f]{6}$/i.test(h)) return '#000000';
  return h.toUpperCase();
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex);
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const toHex = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsv({ r, g, b }) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

export function hsvToRgb({ h, s, v }) {
  const c = v * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hh && hh < 1)      { r = c; g = x; b = 0; }
  else if (1 <= hh && hh < 2) { r = x; g = c; b = 0; }
  else if (2 <= hh && hh < 3) { r = 0; g = c; b = x; }
  else if (3 <= hh && hh < 4) { r = 0; g = x; b = c; }
  else if (4 <= hh && hh < 5) { r = x; g = 0; b = c; }
  else                        { r = c; g = 0; b = x; }
  const m = v - c;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hexToHsv(hex) { return rgbToHsv(hexToRgb(hex)); }
export function hsvToHex(hsv) { return rgbToHex(hsvToRgb(hsv)); }
