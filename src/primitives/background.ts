/**
 * @module primitives/background
 * The ground every asset sits on: a rounded clip, a soft gradient, drifting
 * aurora blobs and a hairline border with a top highlight, in the manner of
 * Apple's glass surfaces.
 */

import { ANIM } from '../core/animation.ts';
import type { Fragment } from '../core/fragment.ts';
import { el, num } from '../core/svg.ts';
import type { Theme } from '../core/types.ts';
import { radialGlowDef } from './glow.ts';

export interface FrameOptions {
  readonly width: number;
  readonly height: number;
  readonly theme: Theme;
  /** Multiplier on the palette's ambient blob opacity. Default 1. */
  readonly intensity?: number;
}

/** `clip-path` value for content that must stay inside the rounded frame. */
export const FRAME_CLIP = 'url(#frame-clip)';

/**
 * The one aurora composition every widget shares, as fractions of the frame.
 * Left and right carry the same blue at the same strength so neighbouring
 * widgets meet without a visible seam; a fainter teal sits along the top.
 */
const BLOBS = [
  {
    accent: 'secondary',
    x: 0.1,
    y: 0.4,
    radius: 0.62,
    strength: 1,
    dx: 0.04,
    dy: 0.1,
    period: 18000,
  },
  {
    accent: 'secondary',
    x: 0.9,
    y: 0.6,
    radius: 0.62,
    strength: 1,
    dx: -0.04,
    dy: -0.1,
    period: 20000,
  },
  {
    accent: 'primary',
    x: 0.5,
    y: 0.05,
    radius: 0.45,
    strength: 0.5,
    dx: 0.05,
    dy: 0.08,
    period: 16000,
  },
] as const;

/** Slowly drifting radial gradients that give the ground colour and depth. */
export function aurora(options: FrameOptions): Fragment {
  const { width, height, theme, intensity = 1 } = options;
  const { palette } = theme;
  const scale = Math.max(width, height);
  const defs: string[] = [];
  const body: string[] = [];
  BLOBS.forEach((blob, i) => {
    const id = `aurora-${i}`;
    defs.push(
      radialGlowDef(id, palette.accent[blob.accent], palette.ambient * intensity * blob.strength),
    );
    body.push(
      el('circle', {
        cx: num(width * blob.x),
        cy: num(height * blob.y),
        r: num(scale * blob.radius),
        fill: `url(#${id})`,
        class: ANIM.drift,
        style: `--dx:${num(width * blob.dx)}px;--dy:${num(height * blob.dy)}px;--period:${blob.period}ms;animation-delay:-${i * 5000}ms`,
      }),
    );
  });
  return { body: body.join(''), defs };
}

/** Builds the background frame. Place its body first in the document. */
export function frame(options: FrameOptions): Fragment {
  const { width, height, theme } = options;
  const { palette, radius } = theme;
  const blobs = aurora(options);
  const defs = [
    el('linearGradient', { id: 'frame-bg', x1: '0', y1: '0', x2: '0', y2: '1' }, [
      el('stop', { offset: '0', 'stop-color': palette.background.from }),
      el('stop', { offset: '1', 'stop-color': palette.background.to }),
    ]),
    el('linearGradient', { id: 'frame-highlight', x1: '0', y1: '0', x2: '1', y2: '0' }, [
      el('stop', { offset: '0', 'stop-color': palette.highlight, 'stop-opacity': 0 }),
      el('stop', { offset: '0.5', 'stop-color': palette.highlight }),
      el('stop', { offset: '1', 'stop-color': palette.highlight, 'stop-opacity': 0 }),
    ]),
    el('clipPath', { id: 'frame-clip' }, el('rect', { width, height, rx: radius })),
    ...(blobs.defs ?? []),
  ];
  const body = el('g', { 'clip-path': FRAME_CLIP }, [
    el('rect', { width, height, fill: 'url(#frame-bg)' }),
    blobs.body,
    el('rect', {
      x: 0.5,
      y: 0.5,
      width: width - 1,
      height: height - 1,
      rx: radius - 0.5,
      fill: 'none',
      stroke: palette.surfaceBorder,
    }),
    el('rect', {
      x: radius,
      y: 0.5,
      width: width - radius * 2,
      height: 1,
      fill: 'url(#frame-highlight)',
    }),
  ]);
  return { body, defs };
}
