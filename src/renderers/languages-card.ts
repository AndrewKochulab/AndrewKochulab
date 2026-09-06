/**
 * @module renderers/languages-card
 * Language share as a self-drawing donut with a legend of animated bars.
 * The legend sits beside the donut when there is room and beneath it on a
 * phone, where a full-width bar is far easier to read.
 */

import { ANIM } from '../core/animation.ts';
import type { SiteConfig } from '../config/types.ts';
import type { Fragment } from '../core/fragment.ts';
import { el, num } from '../core/svg.ts';
import { outlineText } from '../core/text.ts';
import type {
  AssetRenderer,
  AssetSize,
  LanguageShare,
  RenderContext,
  Viewport,
} from '../core/types.ts';
import { odometer } from '../primitives/odometer.ts';
import { animated, assemble, eyebrow, pad } from './shared.ts';

interface LanguagesLayout extends AssetSize {
  readonly headerY: number;
  readonly headerSize: number;
  readonly headerSpacing: number;
  readonly captionSize: number;
  readonly donut: {
    readonly cx: number;
    readonly cy: number;
    readonly r: number;
    readonly stroke: number;
  };
  readonly donutValueSize: number;
  readonly legend: {
    readonly x: number;
    readonly right: number;
    readonly top: number;
    readonly rowGap: number;
    readonly nameSize: number;
    readonly valueSize: number;
  };
}

const WIDE: LanguagesLayout = {
  width: 580,
  height: 260,
  display: 405,
  headerY: 44,
  headerSize: 11,
  headerSpacing: 1.6,
  captionSize: 10.5,
  donut: { cx: 112, cy: 152, r: 64, stroke: 18 },
  donutValueSize: 26,
  legend: { x: 232, right: 544, top: 92, rowGap: 30, nameSize: 13, valueSize: 11.5 },
};

const COMPACT: LanguagesLayout = {
  width: 400,
  height: 380,
  display: 400,
  headerY: 34,
  headerSize: 10,
  headerSpacing: 1.2,
  captionSize: 10,
  donut: { cx: 200, cy: 130, r: 58, stroke: 17 },
  donutValueSize: 26,
  legend: { x: 24, right: 376, top: 236, rowGap: 32, nameSize: 14, valueSize: 12.5 },
};

/** Layouts for one configuration; both grow with the number of legend rows. */
function layoutsFor(config: SiteConfig): Record<Viewport, LanguagesLayout> {
  const rows = Math.max(1, config.languages.count);
  const heightFor = (layout: LanguagesLayout): number =>
    Math.max(layout.height, layout.legend.top + (rows - 1) * layout.legend.rowGap + 24);
  return {
    wide: { ...WIDE, height: heightFor(WIDE) },
    compact: { ...COMPACT, height: heightFor(COMPACT) },
  };
}

function header(ctx: RenderContext, layout: LanguagesLayout): string {
  const { palette } = ctx.theme;
  const { text } = ctx.data.config;
  const inset = pad(ctx.viewport);
  return animated(ANIM.rise, 40, [
    eyebrow(text.languagesTitle, inset, layout.headerY, palette.text.muted, {
      size: layout.headerSize,
      letterSpacing: layout.headerSpacing,
    }),
    outlineText(text.languagesCaption, {
      font: 'mono',
      size: layout.captionSize,
      x: layout.width - inset,
      y: layout.headerY,
      anchor: 'end',
      fill: palette.text.muted,
    }),
  ]);
}

function donut(
  ctx: RenderContext,
  layout: LanguagesLayout,
  languages: readonly LanguageShare[],
): Fragment {
  const { palette } = ctx.theme;
  const { cx, cy, r, stroke } = layout.donut;
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
        size: layout.donutValueSize,
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

function legend(
  ctx: RenderContext,
  layout: LanguagesLayout,
  languages: readonly LanguageShare[],
): string {
  const { palette } = ctx.theme;
  const { x, right, top, rowGap, nameSize, valueSize } = layout.legend;
  const barWidth = right - x;
  return languages
    .map((language, index) => {
      const y = top + index * rowGap;
      const filled = Math.max(2, (language.percent / 100) * barWidth);
      return animated(ANIM.rise, 240 + index * 90, [
        el('circle', { cx: x + 5, cy: y - 4, r: 4.5, fill: language.color }),
        outlineText(language.name, {
          font: 'displayMedium',
          size: nameSize,
          x: x + 17,
          y,
          fill: palette.text.primary,
        }),
        outlineText(`${num(language.percent)}%`, {
          font: 'mono',
          size: valueSize,
          x: right,
          y,
          anchor: 'end',
          fill: palette.text.secondary,
        }),
        el('line', {
          x1: x,
          y1: y + 9,
          x2: right,
          y2: y + 9,
          stroke: palette.surfaceBorder,
          'stroke-width': 3,
          'stroke-linecap': 'round',
        }),
        el('line', {
          x1: x,
          y1: y + 9,
          x2: x + filled,
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

/** Builds the languages renderer for one configuration. */
export function createLanguagesRenderer(config: SiteConfig): AssetRenderer {
  const sizes = layoutsFor(config);
  return {
    id: 'languages',
    viewports: ['wide', 'compact'],
    size: (viewport) => sizes[viewport],
    render(ctx) {
      const layout = sizes[ctx.viewport];
      const languages = ctx.data.stats.languages.slice(0, ctx.data.config.languages.count);
      return assemble(layout, ctx, ctx.data.config.text.languagesTitle, [
        { body: header(ctx, layout) },
        donut(ctx, layout, languages),
        { body: legend(ctx, layout, languages) },
      ]);
    },
  };
}
