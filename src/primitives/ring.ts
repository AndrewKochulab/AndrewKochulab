/**
 * @module primitives/ring
 * Circular strokes: a progress ring that draws itself in, and thin orbit
 * rings used as decoration around the hero core.
 */

import { ANIM, styles, delayStyle } from '../core/animation.ts';
import { el, num } from '../core/svg.ts';

export interface ProgressRingOptions {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly stroke: string;
  readonly trackStroke: string;
  readonly strokeWidth: number;
  /** 0–1 portion of the circle to fill. */
  readonly progress: number;
  readonly delay?: number;
  readonly duration?: number;
}

/** A ring whose arc draws from 12 o'clock clockwise to `progress`. */
export function progressRing(options: ProgressRingOptions): string {
  const { cx, cy, r, progress } = options;
  const circumference = 2 * Math.PI * r;
  const visible = circumference * Math.min(Math.max(progress, 0), 1);
  return el('g', {}, [
    el('circle', {
      cx,
      cy,
      r,
      fill: 'none',
      stroke: options.trackStroke,
      'stroke-width': options.strokeWidth,
    }),
    el('circle', {
      cx,
      cy,
      r,
      fill: 'none',
      stroke: options.stroke,
      'stroke-width': options.strokeWidth,
      'stroke-linecap': 'round',
      'stroke-dasharray': `${num(visible)} ${num(circumference)}`,
      transform: `rotate(-90 ${num(cx)} ${num(cy)})`,
      class: ANIM.draw,
      style: styles(
        `--len:${num(visible)}`,
        options.duration === undefined ? undefined : `--dur:${options.duration}ms`,
        options.delay === undefined ? undefined : delayStyle(options.delay),
      ),
    }),
  ]);
}

export interface OrbitRingOptions {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly rotate: number;
  readonly stroke: string;
  readonly opacity?: number;
}

/** A tilted elliptical orbit path (decorative, no animation of its own). */
export function orbitRing(options: OrbitRingOptions): string {
  return el('ellipse', {
    cx: options.cx,
    cy: options.cy,
    rx: options.rx,
    ry: options.ry,
    fill: 'none',
    stroke: options.stroke,
    'stroke-width': 1,
    opacity: options.opacity ?? 0.5,
    transform: `rotate(${num(options.rotate)} ${num(options.cx)} ${num(options.cy)})`,
  });
}
