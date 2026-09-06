/**
 * @module primitives/pill
 * A rounded chip with an optional brand icon and outlined label. Used by the
 * tech stack, project language tags and the contact buttons.
 */

import type { Fragment } from '../core/fragment.ts';
import { el, num } from '../core/svg.ts';
import { layoutText } from '../core/text.ts';
import type { Theme } from '../core/types.ts';
import { icon } from './icon.ts';

export interface PillOptions {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly theme: Theme;
  /** simple-icons slug or custom glyph name. */
  readonly icon?: string;
  /** Icon colour; defaults to the theme's primary accent. */
  readonly iconColor?: string;
  /** Total height. Default 34. */
  readonly height?: number;
  /** Label size. Default 14. */
  readonly fontSize?: number;
  /** Attributes (class, style) for the inner group, so CSS animations never clash with the positioning transform. */
  readonly attrs?: Readonly<Record<string, string | number | undefined>>;
  /** Fill/stroke override for emphasised pills (e.g. contact buttons). */
  readonly variant?: 'surface' | 'accent';
}

/** A rendered pill plus its measured width, so callers can flow pills in a row. */
export interface PillResult extends Fragment {
  readonly width: number;
}

const PADDING_X = 14;
const ICON_GAP = 8;

/** Measures and renders one pill. */
export function pill(options: PillOptions): PillResult {
  const { theme, height = 34, fontSize = 14, variant = 'surface' } = options;
  const { palette } = theme;
  const iconSize = Math.round(fontSize * 1.15);
  const layout = layoutText(options.label, { font: 'displayMedium', size: fontSize });
  const hasIcon = options.icon !== undefined;
  const width = PADDING_X * 2 + (hasIcon ? iconSize + ICON_GAP : 0) + layout.width;
  const baseline = height / 2 + layout.metrics.capHeight / 2;
  const iconColor = options.iconColor ?? palette.accent.primary;
  const isAccent = variant === 'accent';

  const parts = [
    el('rect', {
      width,
      height,
      rx: height / 2,
      fill: isAccent ? palette.accent.primary : palette.surface,
      'fill-opacity': isAccent ? 0.12 : undefined,
      stroke: isAccent ? palette.accent.primary : palette.surfaceBorder,
      'stroke-opacity': isAccent ? 0.55 : undefined,
    }),
    options.icon !== undefined
      ? icon(options.icon, {
          x: PADDING_X,
          y: (height - iconSize) / 2,
          size: iconSize,
          fill: iconColor,
        })
      : '',
    el('path', {
      d: layout.glyphs.map((glyph) => glyph.d).join(''),
      fill: palette.text.primary,
      transform: `translate(${num(PADDING_X + (hasIcon ? iconSize + ICON_GAP : 0))} ${num(baseline)})`,
    }),
  ];
  const body = el(
    'g',
    { transform: `translate(${num(options.x)} ${num(options.y)})` },
    el('g', { ...options.attrs }, parts),
  );
  return { body, width };
}
