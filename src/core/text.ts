/**
 * @module core/text
 * Converts strings to SVG path outlines using the bundled fonts.
 *
 * GitHub renders README SVGs through an `<img>` element that cannot load web
 * fonts, so display text is outlined at build time. This module lays glyphs
 * out one by one (with kerning) so callers can animate individual characters.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import opentype, { type OpenTypeFont, type OpenTypeGlyph, type PathCommand } from 'opentype.js';
import { el, num } from './svg.ts';

/** Fonts available for outlining; keys are the identifiers renderers use. */
export const FONT_FILES = {
  displayBold: 'Inter-Bold.ttf',
  displaySemiBold: 'Inter-SemiBold.ttf',
  displayMedium: 'Inter-Medium.ttf',
  mono: 'JetBrainsMono-Regular.ttf',
  monoMedium: 'JetBrainsMono-Medium.ttf',
} as const;

export type FontId = keyof typeof FONT_FILES;

const FONT_DIR = new URL('../../fonts/', import.meta.url);
const cache = new Map<FontId, OpenTypeFont>();
const glyphCache = new Map<string, readonly PathCommand[]>();

/** Decimal places kept in path data; enough for crisp glyphs at 1:1 without bloating files. */
const PATH_DECIMALS = 2;

/** Loads (and memoises) a bundled font. */
export function loadFont(id: FontId): OpenTypeFont {
  const cached = cache.get(id);
  if (cached) return cached;
  const bytes = readFileSync(fileURLToPath(new URL(FONT_FILES[id], FONT_DIR)));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const font = opentype.parse(buffer);
  cache.set(id, font);
  return font;
}

/** Glyph outline commands at the origin, memoised per font, size and character. */
function glyphCommands(
  fontId: FontId,
  glyph: OpenTypeGlyph,
  char: string,
  size: number,
): readonly PathCommand[] {
  const key = `${fontId}:${size}:${char}`;
  const cached = glyphCache.get(key);
  if (cached) return cached;
  const commands = glyph.getPath(0, 0, size).commands;
  glyphCache.set(key, commands);
  return commands;
}

/**
 * Serialises path commands with an offset, using this project's number
 * formatting. (The library's own serialiser is avoided: it emits `NaN` for
 * some coordinates, which silently breaks a glyph.)
 */
export function pathData(commands: readonly PathCommand[], dx: number, dy: number): string {
  const scale = 10 ** PATH_DECIMALS;
  const f = (value: number | undefined, offset: number): string =>
    (Math.round(((value ?? 0) + offset) * scale) / scale).toString();
  // Numbers are separated by a space unless the next one is negative (the sign separates them).
  const join = (...numbers: readonly string[]): string =>
    numbers.reduce((acc, n) => (acc === '' || n.startsWith('-') ? acc + n : `${acc} ${n}`), '');
  let out = '';
  for (const c of commands) {
    switch (c.type) {
      case 'M':
      case 'L':
        out += c.type + join(f(c.x, dx), f(c.y, dy));
        break;
      case 'Q':
        out += `Q${join(f(c.x1, dx), f(c.y1, dy), f(c.x, dx), f(c.y, dy))}`;
        break;
      case 'C':
        out += `C${join(f(c.x1, dx), f(c.y1, dy), f(c.x2, dx), f(c.y2, dy), f(c.x, dx), f(c.y, dy))}`;
        break;
      case 'Z':
        out += 'Z';
        break;
    }
  }
  return out;
}

/** One positioned glyph in a laid-out line. `d` is empty for whitespace. */
export interface GlyphRun {
  readonly char: string;
  /** Pen position (left edge of the advance box) in user units. */
  readonly x: number;
  readonly advance: number;
  readonly d: string;
}

/** Vertical metrics of a font at a given size, in user units above the baseline. */
export interface FontMetrics {
  readonly ascender: number;
  readonly descender: number;
  readonly capHeight: number;
  readonly xHeight: number;
}

/** A laid-out line: glyph runs plus total advance width and metrics. */
export interface TextLayout {
  readonly glyphs: readonly GlyphRun[];
  readonly width: number;
  readonly metrics: FontMetrics;
}

export interface LayoutOptions {
  readonly font: FontId;
  readonly size: number;
  /** Extra tracking added after every glyph, in user units. Default 0. */
  readonly letterSpacing?: number;
}

/** Returns vertical metrics for `font` at `size`. */
export function fontMetrics(font: FontId, size: number): FontMetrics {
  const f = loadFont(font);
  const scale = size / f.unitsPerEm;
  const os2 = f.tables.os2;
  return {
    ascender: f.ascender * scale,
    descender: f.descender * scale,
    capHeight: (os2?.sCapHeight ?? f.ascender * 0.72) * scale,
    xHeight: (os2?.sxHeight ?? f.ascender * 0.52) * scale,
  };
}

/**
 * Lays out `content` on a baseline at the origin, glyph by glyph with pair kerning.
 * Output coordinates are relative: translate the result to place it.
 */
export function layoutText(content: string, options: LayoutOptions): TextLayout {
  const font = loadFont(options.font);
  const scale = options.size / font.unitsPerEm;
  const tracking = options.letterSpacing ?? 0;
  const glyphs: GlyphRun[] = [];
  let x = 0;
  let previous: OpenTypeGlyph | undefined;
  for (const char of content) {
    const glyph = font.charToGlyph(char);
    if (previous) x += font.getKerningValue(previous, glyph) * scale;
    const advance = glyph.advanceWidth * scale + tracking;
    const d =
      char.trim() === ''
        ? ''
        : pathData(glyphCommands(options.font, glyph, char, options.size), x, 0);
    glyphs.push({ char, x, advance, d });
    x += advance;
    previous = glyph;
  }
  return { glyphs, width: x, metrics: fontMetrics(options.font, options.size) };
}

/** Measures the advance width of `content` without building paths. */
export function measureText(content: string, options: LayoutOptions): number {
  return layoutText(content, options).width;
}

export type Anchor = 'start' | 'middle' | 'end';

export interface OutlineOptions extends LayoutOptions {
  readonly x: number;
  /** Baseline y. */
  readonly y: number;
  readonly anchor?: Anchor;
  readonly fill: string;
  /** Extra attributes for the `<path>` (class, filter, opacity…). */
  readonly attrs?: Readonly<Record<string, string | number | undefined>>;
}

/** Horizontal offset that realises `anchor` for a run of `width`. */
export function anchorOffset(width: number, anchor: Anchor = 'start'): number {
  if (anchor === 'middle') return -width / 2;
  if (anchor === 'end') return -width;
  return 0;
}

/** Outlines `content` as a single `<path>` positioned at (`x`, `y`). */
export function outlineText(content: string, options: OutlineOptions): string {
  const layout = layoutText(content, options);
  const dx = options.x + anchorOffset(layout.width, options.anchor);
  const d = layout.glyphs.map((glyph) => glyph.d).join('');
  return el('path', {
    d,
    fill: options.fill,
    transform: `translate(${num(dx)} ${num(options.y)})`,
    ...options.attrs,
  });
}
