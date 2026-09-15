/**
 * @module primitives/typewriter
 * Text that types itself character by character with a following cursor,
 * optionally cycling through several lines forever.
 *
 * Implemented purely with CSS keyframes so `prefers-reduced-motion` can
 * collapse it to a static first line. Each glyph is an outlined path with its
 * own animation delay; the per-line keyframes are generated from a timeline
 * so the arithmetic lives in {@link buildTimeline} and is unit-testable.
 */

import { ANIM } from '../core/animation.ts';
import { DURATION, EASING } from '../core/easing.ts';
import type { Fragment } from '../core/fragment.ts';
import { el, num } from '../core/svg.ts';
import { layoutText, type FontId, type TextLayout } from '../core/text.ts';

export interface TypewriterOptions {
  readonly lines: readonly string[];
  readonly x: number;
  /** Baseline of the text. */
  readonly y: number;
  readonly font: FontId;
  readonly size: number;
  readonly fill: string;
  readonly cursorFill: string;
  /** Milliseconds per character. Default {@link DURATION.typingStep}. */
  readonly step?: number;
  /** How long a finished line stays before fading. Default 2400. */
  readonly hold?: number;
  /** Fade-out length. Default 500. */
  readonly fadeOut?: number;
  /** Pause between lines. Default 350. */
  readonly gap?: number;
  /** Delay before the first character, ms. Default 0. */
  readonly startDelay?: number;
}

/** Absolute timings (ms) for one line inside the cycle. */
export interface LineTiming {
  readonly start: number;
  readonly typing: number;
  readonly hold: number;
  readonly fadeOut: number;
}

/** The whole schedule: per-line timings and the cycle length. */
export interface Timeline {
  readonly step: number;
  readonly cycle: number;
  readonly cycling: boolean;
  readonly lines: readonly LineTiming[];
}

/**
 * Computes the schedule. Every line gets an equal slot sized for the longest
 * line so the rhythm is steady; a single line never cycles.
 */
export function buildTimeline(
  lengths: readonly number[],
  options: { step?: number; hold?: number; fadeOut?: number; gap?: number } = {},
): Timeline {
  const step = options.step ?? DURATION.typingStep;
  const hold = options.hold ?? 2400;
  const fadeOut = options.fadeOut ?? 500;
  const gap = options.gap ?? 350;
  const longest = Math.max(0, ...lengths) * step;
  const slot = longest + hold + fadeOut + gap;
  const cycling = lengths.length > 1;
  const lines = lengths.map((length, index) => ({
    start: index * slot,
    typing: length * step,
    hold,
    fadeOut,
  }));
  return { step, cycle: cycling ? slot * lengths.length : slot, cycling, lines };
}

const CLASS = {
  line: 'tw-line',
  char: 'tw-char',
  cursor: 'tw-cur',
  cursorEnd: 'tw-cur-end',
} as const;

/** Formats a time as a keyframe percentage of the cycle. */
function pct(ms: number, cycle: number): string {
  return `${num(Math.min(100, (ms / cycle) * 100))}%`;
}

/** Keyframes and classes for a timeline. Exported for tests. */
export function typewriterCss(timeline: Timeline): string {
  const { cycle, cycling, step } = timeline;
  const iterate = cycling ? 'infinite' : '1';
  const rules: string[] = [];

  timeline.lines.forEach((line, i) => {
    const visibleUntil = line.typing + line.hold;
    const gone = visibleUntil + line.fadeOut;
    // Line container: visible from its slot start, fades after hold.
    rules.push(
      `@keyframes ${CLASS.line}-${i}{0%,${pct(visibleUntil, cycle)}{opacity:1}${pct(gone, cycle)},100%{opacity:0}}`,
      `.${CLASS.line}-${i}{animation:${CLASS.line}-${i} ${cycle}ms ${EASING.standard} ${iterate} both}`,
    );
    // Characters: appear at their own delay, disappear once the line is gone.
    const off = cycling
      ? `${pct(gone, cycle)}{opacity:1}${pct(gone + 1, cycle)},100%{opacity:0}`
      : `100%{opacity:1}`;
    rules.push(
      `@keyframes ${CLASS.char}-${i}{0%{opacity:0}0.01%{opacity:1}${off}}`,
      `.${CLASS.char}-${i}{opacity:0;animation:${CLASS.char}-${i} ${cycle}ms step-end ${iterate} both}`,
    );
    // End cursor: blinks through the hold, then hides with the line.
    const blinks: string[] = ['0%{opacity:0}', '0.01%{opacity:1}'];
    for (let t = 500; t < line.hold; t += 500) {
      blinks.push(`${pct(t, cycle)}{opacity:${(t / 500) % 2 === 0 ? 1 : 0}}`);
    }
    blinks.push(`${pct(gone - line.typing, cycle)},100%{opacity:0}`);
    const endIterate = cycling ? 'infinite' : '1';
    rules.push(
      `@keyframes ${CLASS.cursorEnd}-${i}{${blinks.join('')}}`,
      `.${CLASS.cursorEnd}-${i}{opacity:0;animation:${CLASS.cursorEnd}-${i} ${cycle}ms step-end ${endIterate} both}`,
    );
  });

  // Per-character cursor: a single set shared by every line.
  rules.push(
    `@keyframes ${CLASS.cursor}{0%{opacity:0}0.01%{opacity:1}${pct(step, cycle)},100%{opacity:0}}`,
    `.${CLASS.cursor}{opacity:0;animation:${CLASS.cursor} ${cycle}ms step-end ${iterate} both}`,
  );

  // Non-cycling: after the hold the final cursor keeps blinking forever.
  if (!cycling) {
    rules.push(`.${CLASS.cursorEnd}-0{animation:blink 1s step-end infinite}`);
  }

  rules.push(
    `@media (prefers-reduced-motion:reduce){` +
      `.${CLASS.char}{animation:none;opacity:1}` +
      `.${CLASS.line}{animation:none;opacity:0}` +
      `.${CLASS.line}-0{opacity:1}` +
      `.${CLASS.cursor}{animation:none;opacity:0}` +
      `.${CLASS.cursorEnd}{animation:none;opacity:0}` +
      `.${CLASS.cursorEnd}-0{opacity:1}` +
      `}`,
  );
  return rules.join('\n');
}

function cursorRect(
  x: number,
  layout: TextLayout,
  size: number,
  fill: string,
  attrs: Record<string, string>,
): string {
  const height = layout.metrics.capHeight * 1.25;
  return el('rect', {
    x: num(x + 2),
    y: num(-height),
    width: num(Math.max(2, size * 0.55)),
    height: num(height),
    rx: 1,
    fill,
    ...attrs,
  });
}

/** Renders the typewriter. The returned fragment includes its CSS. */
export function typewriter(options: TypewriterOptions): Fragment {
  const layouts = options.lines.map((line) =>
    layoutText(line, { font: options.font, size: options.size }),
  );
  const timeline = buildTimeline(
    layouts.map((layout) => layout.glyphs.length),
    {
      ...(options.step === undefined ? {} : { step: options.step }),
      ...(options.hold === undefined ? {} : { hold: options.hold }),
      ...(options.fadeOut === undefined ? {} : { fadeOut: options.fadeOut }),
      ...(options.gap === undefined ? {} : { gap: options.gap }),
    },
  );

  const startDelay = options.startDelay ?? 0;
  const lines = layouts.map((layout, i) => {
    const timing = timeline.lines[i];
    if (timing === undefined) throw new Error('timeline/layout length mismatch');
    const children: string[] = [];
    layout.glyphs.forEach((glyph, j) => {
      const delay = `animation-delay:${num(startDelay + timing.start + j * timeline.step)}ms`;
      if (glyph.d !== '') {
        children.push(
          el('path', {
            d: glyph.d,
            fill: options.fill,
            class: `${CLASS.char} ${CLASS.char}-${i}`,
            style: delay,
          }),
        );
      }
      children.push(
        cursorRect(glyph.x + glyph.advance, layout, options.size, options.cursorFill, {
          class: CLASS.cursor,
          style: delay,
        }),
      );
    });
    children.push(
      cursorRect(layout.width, layout, options.size, options.cursorFill, {
        class:
          `${CLASS.cursorEnd} ${CLASS.cursorEnd}-${i} ${timeline.cycling ? '' : ANIM.blink}`.trim(),
        style: `animation-delay:${num(startDelay + timing.start + timing.typing)}ms`,
      }),
    );
    return el(
      'g',
      {
        class: `${CLASS.line} ${CLASS.line}-${i}`,
        style: `animation-delay:${num(startDelay + timing.start)}ms`,
      },
      children,
    );
  });

  const body = el('g', { transform: `translate(${num(options.x)} ${num(options.y)})` }, lines);
  return { body, css: typewriterCss(timeline) };
}
