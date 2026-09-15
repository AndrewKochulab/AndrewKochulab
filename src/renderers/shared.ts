/**
 * @module renderers/shared
 * Helpers every renderer uses: document assembly, word wrapping and small
 * typographic conventions, so individual renderers only describe layout.
 */

import { animationCss } from '../core/animation.ts';
import { combine, type Fragment } from '../core/fragment.ts';
import { joinChildren, svgDocument } from '../core/svg.ts';
import { layoutText, measureText, outlineText, type FontId } from '../core/text.ts';
import type { AssetSize, RenderContext, Viewport } from '../core/types.ts';
import { frame } from '../primitives/background.ts';
export { seeded } from '../core/random.ts';
import { glowDefs } from '../primitives/glow.ts';

/** Horizontal padding inside an asset, by viewport. */
export function pad(viewport: Viewport): number {
  return viewport === 'compact' ? 20 : 36;
}

/**
 * Assembles a complete document: background frame, shared animation CSS and
 * glow filters, then the renderer's fragments.
 */
export function assemble(
  size: AssetSize,
  ctx: RenderContext,
  title: string,
  fragments: readonly Fragment[],
  options: { readonly intensity?: number } = {},
): string {
  const background = frame({
    width: size.width,
    height: size.height,
    theme: ctx.theme,
    ...options,
  });
  const merged = combine(background, ...fragments);
  return svgDocument({
    width: size.width,
    height: size.height,
    display: size.display,
    title,
    defs: [...glowDefs(), ...merged.defs],
    css: [animationCss(), merged.css].filter((css) => css !== '').join('\n'),
    children: [merged.body],
  });
}

/** Greedy word wrap using real glyph widths. Returns at most `maxLines`, ellipsising the last. */
export function wrapText(
  content: string,
  options: { readonly font: FontId; readonly size: number },
  maxWidth: number,
  maxLines = 2,
): string[] {
  const words = content.split(/\s+/).filter((word) => word !== '');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    if (measureText(candidate, options) <= maxWidth || current === '') {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== '') lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1] ?? '';
  while (last.length > 0 && measureText(`${last}…`, options) > maxWidth) {
    last = last.slice(0, -1).trimEnd();
  }
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

/** Uppercase, letter-spaced section label used above groups. */
export function eyebrow(
  content: string,
  x: number,
  y: number,
  fill: string,
  options: {
    readonly size?: number;
    readonly letterSpacing?: number;
    readonly attrs?: Readonly<Record<string, string | number | undefined>>;
  } = {},
): string {
  return outlineText(content.toUpperCase(), {
    font: 'displaySemiBold',
    size: options.size ?? 11,
    letterSpacing: options.letterSpacing ?? 1.6,
    x,
    y,
    fill,
    attrs: options.attrs ?? {},
  });
}

/**
 * The largest size, at or below `preferred`, at which `content` fits within
 * `maxWidth`. Keeps long names inside a phone-width card without ever
 * clipping or hyphenating them.
 */
export function fitSize(
  content: string,
  font: FontId,
  maxWidth: number,
  preferred: number,
  minimum = preferred * 0.6,
): number {
  const width = measureText(content, { font, size: preferred });
  if (width <= maxWidth || width === 0) return preferred;
  return Math.max(minimum, (preferred * maxWidth) / width);
}

/**
 * Flows items of known width into rows no wider than `maxWidth`, returning
 * the x/y of each. Used for the hero's stack chips, which wrap on a phone.
 */
export function flowRows(
  widths: readonly number[],
  options: {
    readonly maxWidth: number;
    readonly gap: number;
    readonly rowHeight: number;
    readonly rowGap: number;
    readonly left: number;
    readonly top: number;
  },
): {
  readonly positions: readonly { readonly x: number; readonly y: number }[];
  readonly height: number;
} {
  const positions: { x: number; y: number }[] = [];
  let x = 0;
  let row = 0;
  for (const width of widths) {
    if (x > 0 && x + width > options.maxWidth) {
      row += 1;
      x = 0;
    }
    positions.push({
      x: options.left + x,
      y: options.top + row * (options.rowHeight + options.rowGap),
    });
    x += width + options.gap;
  }
  return { positions, height: (row + 1) * options.rowHeight + row * options.rowGap };
}

/** Width of `content` in the display-medium face at `size`. */
export function widthOf(content: string, font: FontId, size: number): number {
  return layoutText(content, { font, size }).width;
}

/**
 * Wraps `children` in a group carrying an animation class and delay.
 * Animated elements must not carry a `transform` attribute themselves
 * (CSS transforms would override it), so animation always lives on a wrapper.
 */
export function animated(
  className: string,
  delayMs: number,
  children: string | readonly string[],
  extraStyle?: string,
): string {
  const style = [`animation-delay:${Math.round(delayMs)}ms`, extraStyle]
    .filter((s) => s !== undefined && s !== '')
    .join(';');
  return `<g class="${className}" style="${style}">${joinChildren(children)}</g>`;
}

/** Formats an ISO timestamp as `5 Sep 2026`. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${date.getUTCFullYear()}`;
}
