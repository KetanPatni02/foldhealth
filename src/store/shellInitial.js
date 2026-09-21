import {
  applyTheme,
  getResolvedTheme,
  getStoredTheme,
  subscribeToSystem,
  applyNavStyle,
  getStoredNavStyle,
  applyContrast,
  getStoredContrast,
  applyFontScale,
  getStoredFontScale,
} from '../lib/theme';

export const initialThemeSetting = getStoredTheme();
export const initialResolvedTheme = getResolvedTheme(initialThemeSetting);
export const initialNavStyle = getStoredNavStyle();
export const initialContrast = getStoredContrast();
export const initialFontScale = getStoredFontScale();

applyNavStyle(initialNavStyle);
applyContrast(initialContrast);
applyFontScale(initialFontScale);

export function readChangelogSeenAt() {
  try {
    return localStorage.getItem('changelogSeenAt');
  } catch {
    return null;
  }
}
