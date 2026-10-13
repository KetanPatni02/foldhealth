import {
  COVER_GRADIENTS, DEFAULT_COVER_BACKGROUND, DEFAULT_LOGO_SCALE, COVER_TITLE_STYLE, COVER_INTRO_STYLE,
} from '../../../../../../analytics/views/employer/generateEmployerReportPdf';
import { PRESET_COVERS } from '../../../../../../analytics/views/employer/reportCovers';
import { PATIENT_SUMMARY_HEADER_SLUG, PATIENT_SUMMARY_FOOTER_SLUG } from '../../../../../../email-builder/reportHeaderComponent';

/**
 * Personalize settings for the care program report: the cover (as the
 * Employer Impact Report's), title, logo, header and footer. Kept per
 * program type in this browser, so the next report starts where the last
 * one left off.
 */
export const COVER_DESCRIPTION_MAX = 300;
export const TITLE_MAX = 60;
export const TITLE_SIZE = { min: 16, max: 60 };
export const INTRO_SIZE = { min: 8, max: 16 };
export const FONT_WEIGHTS = [
  { value: 'regular', label: 'Regular' },
  { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semi Bold' },
  { value: 'bold', label: 'Bold' },
];
export const BACKGROUND_TYPES = [
  { key: 'color', label: 'Color' },
  { key: 'gradient', label: 'Gradient' },
  { key: 'image', label: 'Image' },
];

const toHex = ([r, g, b]) => `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
// One colour per gradient preset, its most colourful stop, as the Employer report offers.
const chroma = ([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b);
export const DEFAULT_COLOR_SWATCHES = COVER_GRADIENTS.map(g => toHex(
  g.stops.reduce((best, [c]) => (chroma(c) > chroma(best) ? c : best), g.stops[0][0]),
));

/** A preset gradient as the hex CSS the colour picker edits. */
export function presetPickerCss(key) {
  const g = COVER_GRADIENTS.find(x => x.key === key) || COVER_GRADIENTS[0];
  return `linear-gradient(${Math.round(g.angle)}deg, ${g.stops.map(([c, p]) => `${toHex(c)} ${Math.round(p * 100)}%`).join(', ')})`;
}

export const reportTitleFor = program => `${program?.code || 'Program'} Summary Report`;

export const DEFAULT_REPORT_SETTINGS = {
  title: '',
  includeCover: true,
  coverDescription: '',
  titleStyle: COVER_TITLE_STYLE,
  introStyle: COVER_INTRO_STYLE,
  customLogo: null,
  logoScale: DEFAULT_LOGO_SCALE,
  logoAlign: 'middle-center',
  bgType: DEFAULT_COVER_BACKGROUND.type,
  bgColor: DEFAULT_COLOR_SWATCHES[0],
  bgGradient: DEFAULT_COVER_BACKGROUND.gradient,
  bgCover: PRESET_COVERS[0].id,
  customColors: [],
  customGradients: [],
  showHeader: true,
  headerId: null,
  showFooter: true,
  footerId: null,
};

// The care program report opens on the patient summary header and footer
// (logo, report name, date and page; contact bar), as in the Figma.
export const DEFAULT_HEADER_SLUG = PATIENT_SUMMARY_HEADER_SLUG;
export const DEFAULT_FOOTER_SLUG = PATIENT_SUMMARY_FOOTER_SLUG;

const keyFor = code => `program-report-personalize:${code || 'program'}`;

export function loadReportSettings(code) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(code)) || 'null');
    return saved && typeof saved === 'object' ? { ...DEFAULT_REPORT_SETTINGS, ...saved } : DEFAULT_REPORT_SETTINGS;
  } catch {
    return DEFAULT_REPORT_SETTINGS;
  }
}

export function saveReportSettings(code, settings) {
  try { localStorage.setItem(keyFor(code), JSON.stringify(settings)); } catch { /* storage unavailable or full */ }
}
