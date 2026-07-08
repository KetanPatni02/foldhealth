import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../../components/Icon/Icon';
import styles from './CardThemePicker.module.css';

/* ── Logo-linked brand themes ── */
export const AVERGENT_THEME = {
  name: 'Avergent',
  bg: 'linear-gradient(143.06deg, #FFFFFF 0%, #FFEEDE 121.47%, #EDAC6C 178.57%)',
  border: '0.5px solid #FBDDBF',
  badgeBg: '#FFF6EC',
  badgeBorderColor: 'rgba(244,122,62,0.2)',
  badgeText: '#F47A3E',
  textPrimary: '#16181D',
  textSecondary: '#6F7A90',
  dividerColor: '#D0D6E1',
  footerBg: '#FFA449',
  footerText: '#FFFFFF',
  noteBg: '#FFEDDB',
};

export const PROMINENCE_THEME = {
  name: 'Prominence',
  bg: 'linear-gradient(143.06deg, #FFFFFF 0%, #E4FCFF 121.47%, #DFFBFF 178.57%)',
  border: '0.5px solid #BFE8FB',
  badgeBg: '#E5F8FB',
  badgeBorderColor: 'rgba(16,156,174,0.2)',
  badgeText: '#109CAE',
  textPrimary: '#16181D',
  textSecondary: '#6F7A90',
  dividerColor: '#D0D6E1',
  footerBg: null,
  footerText: null,
  noteBg: '#E4FBFF',
};

export const NO_THEME = {
  name: 'None',
  bg: '#FFFFFF',
  border: '0.5px solid #D0D6E1',
  badgeBg: '#F6F7F8',
  badgeBorderColor: '#D0D6E1',
  badgeText: '#6F7A90',
  textPrimary: '#16181D',
  textSecondary: '#6F7A90',
  dividerColor: '#D0D6E1',
  footerBg: '#F6F7F8',
  footerText: '#3A485F',
  noteBg: '#F6F7F8',
};

/* ── Preset themes — exact Figma values, row1: light pastels, row2: dark/vivid ── */
export const PRESET_THEMES = [
  {
    name: 'Water',
    bg: 'linear-gradient(147.77deg, #EEF4FF 0%, #F3F7FF 38%, #B8D0FF 100%)',
    dot: '#b8d0ff',
    textPrimary: '#3a485f',
    textSecondary: '#717885',
    dividerColor: '#bcd2ff',
    badgeTextColor: '#036939',
    isLight: true,
  },
  {
    name: 'Blossom',
    bg: 'linear-gradient(147.77deg, #FFFFFF 0%, #FACEFE 100%)',
    dot: '#facefe',
    textPrimary: '#3a485f',
    textSecondary: '#717885',
    dividerColor: '#fcc8ff',
    badgeTextColor: '#036939',
    isLight: true,
  },
  {
    name: 'Gold',
    bg: 'linear-gradient(147.77deg, #FFFBEC 0%, #FFE4A5 100%)',
    dot: '#ffe4a5',
    textPrimary: '#3a485f',
    textSecondary: '#717885',
    dividerColor: '#ffe1a8',
    badgeTextColor: '#036939',
    isLight: true,
  },
  {
    name: 'Aqua',
    bg: 'linear-gradient(147.77deg, #FFFFFF 0%, #B2FEFB 100%)',
    dot: '#b2fefb',
    textPrimary: '#3a485f',
    textSecondary: '#717885',
    dividerColor: '#b9eced',
    badgeTextColor: '#036939',
    isLight: true,
  },
  {
    name: 'Lavender',
    bg: 'linear-gradient(147.77deg, #FFFFFF 0%, #D8C3FF 100%)',
    dot: '#d8c3ff',
    textPrimary: '#3a485f',
    textSecondary: '#717885',
    dividerColor: '#e8c8ff',
    badgeTextColor: '#036939',
    isLight: true,
  },
  {
    name: 'Dark Purple',
    bg: 'linear-gradient(147.77deg, #A441FA 0%, #5E09AD 38%, #250372 100%)',
    dot: '#7c3aed',
    textPrimary: '#ffffff',
    textSecondary: '#f6f7f8',
    dividerColor: '#8e42d9',
    badgeTextColor: '#b4fcda',
    isLight: false,
  },
  {
    name: 'Dark Teal',
    bg: 'linear-gradient(147.77deg, #355C76 0%, #73BCB8 100%)',
    dot: '#355c76',
    textPrimary: '#ffffff',
    textSecondary: '#f6f7f8',
    dividerColor: '#7db9c3',
    badgeTextColor: '#d7ffec',
    isLight: false,
  },
  {
    name: 'Dark Blue',
    bg: 'linear-gradient(147.77deg, #1199F4 0%, #04177A 100%)',
    dot: '#1199f4',
    textPrimary: '#ffffff',
    textSecondary: '#f6f7f8',
    dividerColor: '#5188d8',
    badgeTextColor: '#d7ffec',
    isLight: false,
  },
  {
    name: 'Pink Purple',
    bg: 'linear-gradient(148.21deg, #CA11F4 0%, #1F1D85 89.33%)',
    dot: '#ca11f4',
    textPrimary: '#ffffff',
    textSecondary: '#f6f7f8',
    dividerColor: '#b144ff',
    badgeTextColor: '#d7ffec',
    isLight: false,
  },
  {
    name: 'Dark Green',
    bg: 'linear-gradient(147.77deg, #069265 0%, #023902 100%)',
    dot: '#069265',
    textPrimary: '#ffffff',
    textSecondary: '#f6f7f8',
    dividerColor: '#609773',
    badgeTextColor: '#d7ffec',
    isLight: false,
  },
];

export const DEFAULT_CARD_THEME = PRESET_THEMES[0];

/* ── Colour math ── */
function hsbToRgb(h, s, b) {
  s /= 100; b /= 100;
  const c = b * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = b - c;
  let r = 0, g = 0, bl = 0;
  if      (h < 60)  { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) {         g = c; bl = x; }
  else if (h < 240) {         g = x; bl = c; }
  else if (h < 300) { r = x;         bl = c; }
  else              { r = c;         bl = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((bl + m) * 255),
  ];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (isNaN(r) || isNaN(g) || isNaN(b)) ? null : [r, g, b];
}

/* ── WCAG relative luminance → auto-contrast for custom colours ── */
function wcagLuminance(r, g, b) {
  const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function buildCustomTheme(hex, r, g, b) {
  const isLight = wcagLuminance(r, g, b) >= 0.179;
  return {
    bg: hex,
    dot: hex,
    textPrimary:    isLight ? '#3a485f' : '#ffffff',
    textSecondary:  isLight ? '#717885' : '#f6f7f8',
    dividerColor:   isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.25)',
    badgeTextColor: isLight ? '#036939' : '#b4fcda',
    isLight,
  };
}

const CANVAS_W = 264;
const CANVAS_H = 140;

/* ── Component ── */
export function CardThemePicker({ theme, onThemeChange }) {
  const [open,      setOpen]      = useState(false);
  const [hue,       setHue]       = useState(220);
  const [sat,       setSat]       = useState(15);
  const [bri,       setBri]       = useState(100);
  const [hexInput,  setHexInput]  = useState('#EEF4FF');
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);

  const [cR, cG, cB] = hsbToRgb(hue, sat, bri);
  const currentHex   = rgbToHex(cR, cG, cB);

  /* Draw saturation-brightness gradient on canvas */
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    const gH = ctx.createLinearGradient(0, 0, w, 0);
    gH.addColorStop(0, '#ffffff');
    gH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = gH;
    ctx.fillRect(0, 0, w, h);

    const gV = ctx.createLinearGradient(0, 0, 0, h);
    gV.addColorStop(0, 'rgba(0,0,0,0)');
    gV.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = gV;
    ctx.fillRect(0, 0, w, h);
  }, [hue]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);
  /* Re-draw when dropdown opens (canvas wasn't in DOM before) */
  useEffect(() => { if (open) drawCanvas(); }, [open, drawCanvas]);

  /* Cursor position derived from sat/bri */
  const cursorX = (sat / 100) * CANVAS_W;
  const cursorY = (1 - bri / 100) * CANVAS_H;

  /* Pick colour from canvas event */
  const pickFromCanvas = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top,  rect.height));
    const ns = Math.round((x / rect.width) * 100);
    const nb = Math.round((1 - y / rect.height) * 100);
    setSat(ns); setBri(nb);
    const [r, g, b] = hsbToRgb(hue, ns, nb);
    const hex = rgbToHex(r, g, b);
    setHexInput(hex);
    onThemeChange(buildCustomTheme(hex, r, g, b));
  }, [hue, onThemeChange]);

  /* Global mouse drag tracking */
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e) => pickFromCanvas(e);
    const onUp   = ()  => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [isDragging, pickFromCanvas]);

  /* Hue slider */
  const handleHueChange = (e) => {
    const h = Number(e.target.value);
    setHue(h);
    const [r, g, b] = hsbToRgb(h, sat, bri);
    const hex = rgbToHex(r, g, b);
    setHexInput(hex);
    onThemeChange(buildCustomTheme(hex, r, g, b));
  };

  /* Hex text input */
  const handleHexChange = (e) => {
    const val = e.target.value.toUpperCase();
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      const rgb = hexToRgb(val);
      if (rgb) onThemeChange(buildCustomTheme(val, ...rgb));
    }
  };

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* Trigger dot — show current preset gradient or custom colour */
  const presetMatch = PRESET_THEMES.find(t => t.bg === theme?.bg);
  const dotBg = presetMatch ? presetMatch.bg : (theme?.bg || currentHex);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {/* Trigger: colour circle + chevron */}
      <button className={styles.trigger} onClick={() => setOpen(v => !v)}>
        <span className={styles.dot} style={{ background: dotBg }} />
        <Icon name="solar:alt-arrow-down-linear" size={12} color="var(--neutral-300)" />
      </button>

      {open && (
        <div className={styles.dropdown}>

          {/* ── Preset swatches ── */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>Suggested Themes:</span>
            <div className={styles.swatchGrid}>
              {PRESET_THEMES.map((t, i) => (
                <button
                  key={i}
                  className={`${styles.swatch} ${theme?.bg === t.bg ? styles.swatchActive : ''}`}
                  style={{ background: t.bg }}
                  onClick={() => { onThemeChange(t); setOpen(false); }}
                  title={`Theme ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* ── Custom colour picker ── */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>or select a color below:</span>

            {/* Saturation/Brightness canvas */}
            <div className={styles.canvasWrap}>
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className={styles.canvas}
                onMouseDown={(e) => { setIsDragging(true); pickFromCanvas(e); }}
              />
              <div className={styles.cursor} style={{ left: cursorX, top: cursorY }} />
            </div>

            {/* Hue rainbow slider */}
            <input
              type="range" min="0" max="360" step="1" value={hue}
              onChange={handleHueChange}
              className={`${styles.slider} ${styles.hueSlider}`}
            />

            {/* Opacity slider (display only) */}
            <input
              type="range" min="0" max="100" step="1" value={100}
              readOnly
              className={`${styles.slider} ${styles.opacitySlider}`}
              style={{ '--oc': currentHex }}
            />

            {/* HEX + R G B inputs */}
            <div className={styles.colorInputs}>
              <div className={styles.colorInputGroup} style={{ flex: 1.6 }}>
                <input
                  className={styles.colorInput}
                  value={hexInput}
                  onChange={handleHexChange}
                  maxLength={7}
                  spellCheck={false}
                />
                <span className={styles.colorInputLabel}>HEX</span>
              </div>
              {[['R', cR], ['G', cG], ['B', cB]].map(([label, val]) => (
                <div key={label} className={styles.colorInputGroup}>
                  <input className={styles.colorInput} value={val} readOnly />
                  <span className={styles.colorInputLabel}>{label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
