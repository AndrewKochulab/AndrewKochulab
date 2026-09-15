/**
 * @module core/easing
 * The single source of truth for motion curves and durations.
 *
 * Renderers never write a cubic-bezier or a millisecond literal themselves;
 * they pick a named curve and a named duration from here so the whole page
 * moves with one character.
 */

/** Cubic-bezier curves. `out` for entrances, `inOut` for ambient loops, `standard` for state changes. */
export const EASING = {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.45, 0, 0.55, 1)',
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  linear: 'linear',
} as const;

export type EasingName = keyof typeof EASING;

/** Durations in milliseconds. */
export const DURATION = {
  /** Fast local state change. */
  quick: 320,
  /** Element entrance. */
  entrance: 800,
  /** Slow, weighty entrance for hero-scale elements. */
  entranceLong: 1100,
  /** Numbers rolling to their final value. */
  countUp: 1400,
  /** Continuous gentle loops (pulse, float). */
  ambient: 7000,
  /** One revolution of an orbit. */
  orbit: 24000,
  /** One pass of the light sweep. */
  sweep: 9000,
  /** One breath of an aurora blob. */
  drift: 16000,
  /** Delay between two typed characters. */
  typingStep: 45,
} as const;

export type DurationName = keyof typeof DURATION;

/** Stagger schedule: element `index` starts `base + index * step` ms after load. */
export interface Stagger {
  readonly base: number;
  readonly step: number;
}

/** Default stagger for lists of siblings. */
export const STAGGER: Stagger = { base: 120, step: 70 };

/** Computes the delay for the `index`-th element of a staggered group. */
export function staggerDelay(index: number, stagger: Stagger = STAGGER): number {
  return stagger.base + index * stagger.step;
}
