/**
 * @module primitives/glow
 * Static blur filters. Glow is never animated per frame; instead the layer
 * that carries it pulses in opacity, which stays GPU-friendly.
 */

import { el } from '../core/svg.ts';

/** Filter ids exposed to renderers. */
export const GLOW = {
  soft: 'url(#glow-soft)',
  strong: 'url(#glow-strong)',
} as const;

/** `<defs>` entries for both glow filters. Include once per document that uses {@link GLOW}. */
export function glowDefs(): string[] {
  const filter = (id: string, deviation: number): string =>
    el('filter', { id, x: '-40%', y: '-40%', width: '180%', height: '180%' }, [
      el('feGaussianBlur', { stdDeviation: deviation, result: 'blur' }),
      el('feMerge', {}, [
        el('feMergeNode', { in: 'blur' }),
        el('feMergeNode', { in: 'SourceGraphic' }),
      ]),
    ]);
  return [filter('glow-soft', 4), filter('glow-strong', 10)];
}

/** A radial "light source" gradient def; use as `fill="url(#<id>)"` on a circle. */
export function radialGlowDef(id: string, color: string, peakOpacity = 0.5): string {
  return el('radialGradient', { id }, [
    el('stop', { offset: '0', 'stop-color': color, 'stop-opacity': peakOpacity }),
    el('stop', { offset: '1', 'stop-color': color, 'stop-opacity': 0 }),
  ]);
}
