/**
 * @module core/animation
 * CSS-keyframe animation vocabulary shared by every asset.
 *
 * All motion is expressed as CSS classes inside the SVG's own `<style>`
 * block (which GitHub renders when the SVG is loaded through `<img>`).
 * Using CSS rather than SMIL lets one `prefers-reduced-motion` rule freeze
 * every animation at its final frame.
 *
 * Usage: give an element the class from {@link ANIM} and, for staggered
 * entrances, an inline `style` from {@link delayStyle}. Include
 * {@link animationCss} once per document.
 */

import { DURATION, EASING, staggerDelay, type Stagger } from './easing.ts';

/** Class names for the shared keyframe animations. */
export const ANIM = {
  /** Fade + slide up 14px. Entrance. */
  rise: 'a-rise',
  /** Fade only. Entrance. */
  fade: 'a-fade',
  /** Scale from 0.92 + fade. Entrance for badges and rings. */
  pop: 'a-pop',
  /** Full rotation about the local origin, linear, infinite. Set `--orbit` to override duration. */
  spin: 'a-spin',
  /** Full reverse rotation, linear, infinite. */
  spinReverse: 'a-spin-reverse',
  /** Opacity breathing 0.55 → 1 → 0.55, infinite. */
  pulse: 'a-pulse',
  /** Vertical drift ±6px, infinite. */
  float: 'a-float',
  /** Stroke draw-in; element sets `--len` and `stroke-dasharray`. */
  draw: 'a-draw',
  /** Horizontal light sweep; element sets `--from` and `--to` in px. */
  sweep: 'a-sweep',
  /** Cursor blink, steps, infinite. */
  blink: 'a-blink',
  /** Slow drift of a background blob; element sets `--dx`, `--dy` (px) and optionally `--period`. */
  drift: 'a-drift',
} as const;

export type AnimName = (typeof ANIM)[keyof typeof ANIM];

/** Every class that starts hidden and must be revealed when motion is reduced. */
const ENTRANCE_CLASSES = [ANIM.rise, ANIM.fade, ANIM.pop] as const;
const DRAW_CLASSES = [ANIM.draw] as const;

/**
 * The stylesheet declaring all keyframes and classes above, plus the
 * reduced-motion override. Include exactly once per SVG document.
 */
export function animationCss(): string {
  const entrance = ENTRANCE_CLASSES.map((c) => `.${c}`).join(',');
  const draw = DRAW_CLASSES.map((c) => `.${c}`).join(',');
  return [
    `@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`,
    `@keyframes fade{from{opacity:0}to{opacity:1}}`,
    `@keyframes pop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}`,
    `@keyframes spin{to{transform:rotate(360deg)}}`,
    `@keyframes spin-reverse{to{transform:rotate(-360deg)}}`,
    `@keyframes pulse{0%,100%{opacity:.55}50%{opacity:1}}`,
    `@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`,
    `@keyframes draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}`,
    `@keyframes sweep{0%{transform:translateX(var(--from))}55%,100%{transform:translateX(var(--to))}}`,
    `@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}`,
    `@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(var(--dx),var(--dy)) scale(1.08)}}`,
    `.${ANIM.rise}{opacity:0;animation:rise ${DURATION.entrance}ms ${EASING.out} both}`,
    `.${ANIM.fade}{opacity:0;animation:fade ${DURATION.entrance}ms ${EASING.out} both}`,
    `.${ANIM.pop}{opacity:0;animation:pop ${DURATION.entrance}ms ${EASING.out} both;transform-box:fill-box;transform-origin:center}`,
    `.${ANIM.spin}{animation:spin var(--orbit,${DURATION.orbit}ms) ${EASING.linear} infinite;transform-box:view-box;transform-origin:0 0}`,
    `.${ANIM.spinReverse}{animation:spin-reverse var(--orbit,${DURATION.orbit}ms) ${EASING.linear} infinite;transform-box:view-box;transform-origin:0 0}`,
    `.${ANIM.pulse}{animation:pulse var(--period,${DURATION.ambient}ms) ${EASING.inOut} infinite}`,
    `.${ANIM.float}{animation:float var(--period,${DURATION.ambient}ms) ${EASING.inOut} infinite}`,
    `.${ANIM.draw}{stroke-dashoffset:var(--len);animation:draw var(--dur,${DURATION.countUp}ms) ${EASING.out} both}`,
    `.${ANIM.sweep}{animation:sweep var(--period,${DURATION.sweep}ms) ${EASING.inOut} infinite}`,
    `.${ANIM.blink}{animation:blink 1s step-end infinite}`,
    `.${ANIM.drift}{animation:drift var(--period,${DURATION.drift}ms) ${EASING.inOut} infinite;transform-box:fill-box;transform-origin:center}`,
    `@media (prefers-reduced-motion:reduce){` +
      `${entrance}{animation:none;opacity:1;transform:none}` +
      `${draw}{animation:none;stroke-dashoffset:0}` +
      `.${ANIM.spin},.${ANIM.spinReverse},.${ANIM.pulse},.${ANIM.float},.${ANIM.sweep},.${ANIM.blink},.${ANIM.drift}{animation:none}` +
      `}`,
  ].join('\n');
}

/** Inline `style` value that delays an animation by `ms`. */
export function delayStyle(ms: number): string {
  return `animation-delay:${Math.round(ms)}ms`;
}

/** Inline `style` for the `index`-th sibling of a staggered group. */
export function staggerStyle(index: number, stagger?: Stagger): string {
  return delayStyle(staggerDelay(index, stagger));
}

/** Joins inline style declarations, skipping empties. */
export function styles(...declarations: readonly (string | undefined)[]): string {
  return declarations.filter((d): d is string => d !== undefined && d !== '').join(';');
}
