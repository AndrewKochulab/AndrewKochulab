/**
 * @module theme
 * Registry of themes the pipeline renders every asset in: the active
 * palette variant in dark and light mode.
 */

import type { Theme, ThemeName } from '../core/types.ts';
import {
  DEFAULT_PALETTE,
  PALETTES,
  createTheme,
  darkTheme,
  lightTheme,
  paletteById,
} from './tokens.ts';

/** Dark and light themes for the variant `id`, with an optional corner radius. */
export function themesFor(id: string, radius?: number): readonly Theme[] {
  const variant = paletteById(id);
  return [createTheme(variant, 'dark', radius), createTheme(variant, 'light', radius)];
}

/** The active variant: `PALETTE` env var, else the configured default. */
export function activePaletteId(configured?: string): string {
  const fromEnv = process.env['PALETTE'];
  return fromEnv !== undefined && fromEnv !== '' ? fromEnv : (configured ?? DEFAULT_PALETTE);
}

/** Default themes (the default variant), in output order. */
export const THEMES: readonly Theme[] = [darkTheme, lightTheme];

/** Looks a default-variant theme up by mode. */
export function themeByName(name: ThemeName): Theme {
  const theme = THEMES.find((candidate) => candidate.name === name);
  if (!theme) throw new Error(`Unknown theme: ${name}`);
  return theme;
}

export { PALETTES, createTheme, darkTheme, lightTheme, paletteById };
