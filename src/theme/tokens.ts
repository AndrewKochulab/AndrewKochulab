/**
 * @module theme/tokens
 * Palette variants and the two colour modes.
 *
 * A variant defines the accents, the ground and the glow for dark and light
 * mode. Everything else (glass surfaces, text) is shared. The active variant
 * is chosen in `data/config.json` (`appearance.palette`), or overridden with the
 * `PALETTE` environment variable for previews.
 */

import type { Palette, Theme, ThemeName, Typography } from '../core/types.ts';

const typography: Typography = {
  sans: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', Menlo, Consolas, monospace",
};

/** Shared corner radius for every asset frame. */
const RADIUS = 22;

/** The mode-specific slice of a palette that a variant supplies. */
interface Tint {
  readonly background: Palette['background'];
  readonly accent: Palette['accent'];
  readonly glow: string;
  readonly ambient: number;
}

export interface PaletteVariant {
  readonly name: string;
  readonly description: string;
  readonly dark: Tint;
  readonly light: Tint;
}

const SHARED: Record<ThemeName, Omit<Palette, keyof Tint>> = {
  dark: {
    surface: 'rgba(255,255,255,0.045)',
    surfaceBorder: 'rgba(255,255,255,0.10)',
    highlight: 'rgba(255,255,255,0.22)',
    text: { primary: '#f5f5f7', secondary: '#a1a1aa', muted: '#6b6b76' },
    positive: '#30d158',
  },
  light: {
    surface: 'rgba(255,255,255,0.72)',
    surfaceBorder: 'rgba(60,60,67,0.12)',
    highlight: 'rgba(255,255,255,0.9)',
    text: { primary: '#1d1d1f', secondary: '#515154', muted: '#86868b' },
    positive: '#248a3d',
  },
};

/** All palette variants, keyed by id. */
export const PALETTES: Readonly<Record<string, PaletteVariant>> = {
  aurora: {
    name: 'Aurora',
    description: 'Apple system blue, purple, pink and orange on a deep graphite ground.',
    dark: {
      background: { from: '#0a0a12', to: '#10101a' },
      accent: { primary: '#5ac8fa', secondary: '#bf5af2', tertiary: '#ff5e8a', warm: '#ffb340' },
      glow: 'rgba(90,200,250,0.35)',
      ambient: 0.16,
    },
    light: {
      background: { from: '#fbfbfd', to: '#f2f2f7' },
      accent: { primary: '#0a84ff', secondary: '#8e44e9', tertiary: '#ff2d55', warm: '#ff9500' },
      glow: 'rgba(10,132,255,0.22)',
      ambient: 0.1,
    },
  },
  ocean: {
    name: 'Ocean',
    description: 'Teal, sky blue and indigo with a yellow spark, on a midnight navy ground.',
    dark: {
      background: { from: '#05080f', to: '#0a111c' },
      accent: { primary: '#30d5c8', secondary: '#409cff', tertiary: '#7d7aff', warm: '#ffd60a' },
      glow: 'rgba(48,213,200,0.3)',
      ambient: 0.12,
    },
    light: {
      background: { from: '#ffffff', to: '#f3f7fb' },
      accent: { primary: '#0891b2', secondary: '#0a84ff', tertiary: '#5e5ce6', warm: '#f5a600' },
      glow: 'rgba(8,145,178,0.2)',
      ambient: 0.07,
    },
  },
  sunset: {
    name: 'Sunset',
    description:
      'Warm orange, coral and magenta with a gold highlight, on a smoky charcoal ground.',
    dark: {
      background: { from: '#0f0a0d', to: '#171014' },
      accent: { primary: '#ff9f0a', secondary: '#ff375f', tertiary: '#da70d6', warm: '#ffd60a' },
      glow: 'rgba(255,159,10,0.32)',
      ambient: 0.14,
    },
    light: {
      background: { from: '#fffaf5', to: '#fbeee6' },
      accent: { primary: '#ff7a00', secondary: '#e0245e', tertiary: '#a64ac9', warm: '#d99b00' },
      glow: 'rgba(255,122,0,0.22)',
      ambient: 0.09,
    },
  },
  graphite: {
    name: 'Graphite',
    description:
      'Monochrome silver with a single electric blue accent, on pure black. The quietest option.',
    dark: {
      background: { from: '#050505', to: '#0f0f11' },
      accent: { primary: '#0a84ff', secondary: '#8e8e93', tertiary: '#d1d1d6', warm: '#ffd60a' },
      glow: 'rgba(10,132,255,0.35)',
      ambient: 0.12,
    },
    light: {
      background: { from: '#ffffff', to: '#f2f2f7' },
      accent: { primary: '#0a84ff', secondary: '#6e6e73', tertiary: '#1d1d1f', warm: '#d99b00' },
      glow: 'rgba(10,132,255,0.2)',
      ambient: 0.07,
    },
  },
};

/** Id of the variant used when nothing else is configured. */
export const DEFAULT_PALETTE = 'aurora';

/** Builds a theme for `mode` from a palette variant. */
export function createTheme(variant: PaletteVariant, mode: ThemeName, radius = RADIUS): Theme {
  const tint = variant[mode];
  return {
    name: mode,
    radius,
    typography,
    palette: {
      ...SHARED[mode],
      background: tint.background,
      accent: tint.accent,
      glow: tint.glow,
      ambient: tint.ambient,
    },
  };
}

/** Resolves a variant id, throwing on unknown ids so typos surface early. */
export function paletteById(id: string): PaletteVariant {
  const variant = PALETTES[id];
  if (!variant)
    throw new Error(`Unknown palette "${id}"; known: ${Object.keys(PALETTES).join(', ')}`);
  return variant;
}

const defaultVariant = paletteById(DEFAULT_PALETTE);
export const darkTheme: Theme = createTheme(defaultVariant, 'dark');
export const lightTheme: Theme = createTheme(defaultVariant, 'light');
