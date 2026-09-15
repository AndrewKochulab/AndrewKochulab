/**
 * @module primitives/odometer
 * A number whose digits roll into place like a mechanical counter.
 *
 * Each digit is a clipped column of the glyphs 0–9 that slides to the target
 * digit with an ease-out curve; columns start left to right for a cascading
 * feel. Non-digit characters (separators, suffixes) are static.
 */

import { DURATION, EASING } from '../core/easing.ts';
import type { Fragment } from '../core/fragment.ts';
import { el, num } from '../core/svg.ts';
import { anchorOffset, layoutText, type Anchor, type FontId } from '../core/text.ts';

export interface OdometerOptions {
  /** Already formatted value, e.g. `"1,247"` or `"12.3k"`. */
  readonly value: string;
  readonly x: number;
  /** Baseline. */
  readonly y: number;
  readonly font: FontId;
  readonly size: number;
  readonly fill: string;
  /** Unique per document; used for clip-path ids. */
  readonly id: string;
  readonly anchor?: Anchor;
  /** Start delay for the first column, ms. */
  readonly delay?: number;
  /** Extra delay per column, ms. Default 70. */
  readonly columnStagger?: number;
}

const CLASS = 'odo';

/** CSS for the roll animation. Include once per document that uses odometers. */
export function odometerCss(): string {
  return [
    `@keyframes odo{from{transform:translateY(0)}to{transform:translateY(var(--shift))}}`,
    `.${CLASS}{animation:odo ${DURATION.countUp}ms ${EASING.out} both}`,
    `@media (prefers-reduced-motion:reduce){.${CLASS}{animation:none;transform:translateY(var(--shift))}}`,
  ].join('\n');
}

/** Renders the odometer. Width of the final value is returned for layout. */
export function odometer(options: OdometerOptions): Fragment & { readonly width: number } {
  const { font, size, fill, id, delay = 0, columnStagger = 70 } = options;
  const layout = layoutText(options.value, { font, size });
  const dx = options.x + anchorOffset(layout.width, options.anchor);
  const { capHeight } = layout.metrics;
  const pad = size * 0.14;
  const lineHeight = capHeight + pad * 2;
  const defs: string[] = [];
  const children: string[] = [];
  let column = 0;

  layout.glyphs.forEach((glyph, index) => {
    if (!/\d/.test(glyph.char)) {
      if (glyph.d !== '') children.push(el('path', { d: glyph.d, fill }));
      return;
    }
    const digit = Number(glyph.char);
    const clipId = `${id}-c${index}`;
    defs.push(
      el(
        'clipPath',
        { id: clipId },
        el('rect', {
          x: num(glyph.x - 1),
          y: num(-capHeight - pad),
          width: num(glyph.advance + 2),
          height: num(lineHeight),
        }),
      ),
    );
    const strip = Array.from({ length: 10 }, (_, k) => {
      const path = layoutText(String(k), { font, size }).glyphs[0];
      const d = path?.d ?? '';
      return el('path', {
        d,
        fill,
        transform: `translate(${num(glyph.x)} ${num(k * lineHeight)})`,
      });
    });
    children.push(
      el(
        'g',
        { 'clip-path': `url(#${clipId})` },
        el(
          'g',
          {
            class: CLASS,
            style: `--shift:${num(-digit * lineHeight)}px;animation-delay:${num(delay + column * columnStagger)}ms`,
          },
          strip,
        ),
      ),
    );
    column += 1;
  });

  const body = el('g', { transform: `translate(${num(dx)} ${num(options.y)})` }, children);
  return { body, defs, css: odometerCss(), width: layout.width };
}
