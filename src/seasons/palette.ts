import { SeasonPalette } from './types';

const VARS: Record<keyof SeasonPalette, string> = {
  bg: '--season-bg',
  surface: '--season-surface',
  accent: '--season-accent',
  accentText: '--season-accent-text',
  button: '--season-button',
  gold: '--season-gold',
};

/**
 * Sets the season CSS variables on <html>, or removes them so the light-theme
 * fallbacks in index.css apply again. The `season-active` class lets CSS tint
 * the page only while a season runs.
 */
export const applySeasonPalette = (root: HTMLElement, palette: SeasonPalette | null) => {
  (Object.keys(VARS) as (keyof SeasonPalette)[]).forEach(key => {
    if (palette) root.style.setProperty(VARS[key], palette[key]);
    else root.style.removeProperty(VARS[key]);
  });
  root.classList.toggle('season-active', !!palette);
};
