/**
 * @module renderers/languages-card
 * Language share as a self-drawing donut with a legend of animated bars.
 */

import { ANIM } from '../core/animation.ts';
import type { Fragment } from '../core/fragment.ts';
import { el, num } from '../core/svg.ts';
import { outlineText } from '../core/text.ts';
import type { AssetRenderer, LanguageShare, RenderContext } from '../core/types.ts';
import { odometer } from '../primitives/odometer.ts';
import { PAD, animated, assemble, eyebrow } from './shared.ts';

const WIDTH = 580;
const HEIGHT = 260;
const DONUT = { cx: 112, cy: 152, r: 64, stroke: 18 };
const LEGEND = { x: 232, right: WIDTH - PAD, top: 92, rowGap: 30 };

function header(ctx: RenderContext): string {
  const { palette } = ctx.theme;
  return animated(ANIM.rise, 40, [
    eyebrow('Languages', PAD, 44, palette.text.muted),
    outlineText('by bytes · own source repos', {
      font: 'mono',
      size: 10.5,
      x: WIDTH - PAD,
      y: 44,
      anchor: 'end',
      fill: palette.text.muted,
    }),
  ]);
}

function donut(ctx: RenderContext, languages: readonly LanguageShare[]): Fragment {
  const { palette } = ctx.theme;
  const { cx, cy, r, stroke } = DONUT;
  const circumference = 2 * Math.PI * r;
  const gap = 3;
  let offset = 0;
  const segments = languages.map((language, index) => {
    const length = Math.max(0, (language.percent / 100) * circumference - gap);
    const rotation = -90 + (offset / circumference) * 360;
    offset += (language.percent / 100) * circumference;
    return el('circle', {
      cx,
      cy,
      r,
      fill: 'none',
      stroke: language.color,
      'stroke-width': stroke,
      'stroke-linecap': 'butt',
      'stroke-dasharray': `${num(length)} ${num(circumference)}`,
      transform: `rotate(${num(rotation)} ${num(cx)} ${num(cy)})`,
      class: ANIM.draw,
      style: `--len:${num(length)};--dur:1100ms;animation-delay:${200 + index * 140}ms`,
    });
  });
  const top = languages[0];
  const center = top
    ? odometer({
        value: `${Math.round(top.percent)}%`,
        x: cx,
        y: cy + 6,
        font: 'displayBold',
        size: 26,
        fill: palette.text.primary,
        id: 'lang-top',
        anchor: 'middle',
        delay: 400,
      })
    : { body: '', defs: [], css: '', width: 0 };
  const caption = top
    ? animated(
        ANIM.fade,
        600,
        outlineText(top.name, {
          font: 'displayMedium',
          size: 11,
          x: cx,
          y: cy + 24,
          anchor: 'middle',
          fill: palette.text.muted,
        }),
      )
    : '';
  const track = el('circle', {
    cx,
    cy,
    r,
    fill: 'none',
    stroke: palette.surfaceBorder,
    'stroke-width': stroke,
  });
  return {
    body: track + segments.join('') + center.body + caption,
    defs: center.defs,
    css: center.css,
  };
}

function legend(ctx: RenderContext, languages: readonly LanguageShare[]): string {
  const { palette } = ctx.theme;
  const barWidth = LEGEND.right - LEGEND.x;
  return languages
    .map((language, index) => {
      const y = LEGEND.top + index * LEGEND.rowGap;
      const filled = Math.max(2, (language.percent / 100) * barWidth);
      return animated(ANIM.rise, 240 + index * 90, [
        el('circle', { cx: LEGEND.x + 5, cy: y - 4, r: 4.5, fill: language.color }),
        outlineText(language.name, {
          font: 'displayMedium',
          size: 13,
          x: LEGEND.x + 17,
          y,
          fill: palette.text.primary,
        }),
        outlineText(`${num(language.percent)}%`, {
          font: 'mono',
          size: 11.5,
          x: LEGEND.right,
          y,
          anchor: 'end',
          fill: palette.text.secondary,
        }),
        el('line', {
          x1: LEGEND.x,
          y1: y + 9,
          x2: LEGEND.right,
          y2: y + 9,
          stroke: palette.surfaceBorder,
          'stroke-width': 3,
          'stroke-linecap': 'round',
        }),
        el('line', {
          x1: LEGEND.x,
          y1: y + 9,
          x2: LEGEND.x + filled,
          y2: y + 9,
          stroke: language.color,
          'stroke-width': 3,
          'stroke-linecap': 'round',
          'stroke-dasharray': num(filled),
          class: ANIM.draw,
          style: `--len:${num(filled)};--dur:1200ms;animation-delay:${420 + index * 110}ms`,
        }),
      ]);
    })
    .join('');
}

/** The languages renderer. */
export const languagesRenderer: AssetRenderer = {
  id: 'languages',
  width: WIDTH,
  height: HEIGHT,
  render(ctx) {
    const languages = ctx.data.stats.languages.slice(0, 5);
    return assemble(languagesRenderer, ctx, 'Top languages', [
      { body: header(ctx) },
      donut(ctx, languages),
      { body: legend(ctx, languages) },
    ]);
  },
};
