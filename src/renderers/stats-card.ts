/**
 * @module renderers/stats-card
 * Activity card: a ring of active days around the yearly contribution count,
 * beside a grid of stars, repositories, followers and streak.
 */

import { ANIM } from '../core/animation.ts';
import type { Fragment } from '../core/fragment.ts';
import { compact, el, grouped, num } from '../core/svg.ts';
import { outlineText } from '../core/text.ts';
import type { AssetRenderer, RenderContext } from '../core/types.ts';
import { glyph, type GlyphName } from '../primitives/glyphs.ts';
import { odometer } from '../primitives/odometer.ts';
import { progressRing } from '../primitives/ring.ts';
import { PAD, animated, assemble, eyebrow, formatDate } from './shared.ts';

const WIDTH = 580;
const HEIGHT = 260;
const RING = { cx: 112, cy: 152, r: 62 };

function header(ctx: RenderContext): string {
  const { palette } = ctx.theme;
  const { stats } = ctx.data;
  const scope = stats.scope === 'private-included' ? 'incl. private' : 'public only';
  return animated(ANIM.rise, 40, [
    eyebrow('GitHub activity', PAD, 44, palette.text.muted),
    outlineText(`synced ${formatDate(stats.generatedAt)} · ${scope}`, {
      font: 'mono',
      size: 10.5,
      x: WIDTH - PAD,
      y: 44,
      anchor: 'end',
      fill: palette.text.muted,
    }),
  ]);
}

function contributionRing(ctx: RenderContext): Fragment {
  const { palette } = ctx.theme;
  const { stats } = ctx.data;
  const share = Math.min(1, stats.activeDaysLastYear / 365);
  const count = odometer({
    value: grouped(stats.contributionsLastYear),
    x: RING.cx,
    y: RING.cy + 4,
    font: 'displayBold',
    size: 30,
    fill: palette.text.primary,
    id: 'contrib',
    anchor: 'middle',
    delay: 300,
  });
  const body = [
    animated(ANIM.pop, 120, [
      progressRing({
        ...RING,
        stroke: 'url(#ring-grad)',
        trackStroke: palette.surfaceBorder,
        strokeWidth: 9,
        progress: share,
        delay: 260,
        duration: 1600,
      }),
    ]),
    count.body,
    animated(ANIM.fade, 500, [
      outlineText('contributions', {
        font: 'displayMedium',
        size: 11,
        x: RING.cx,
        y: RING.cy + 24,
        anchor: 'middle',
        fill: palette.text.muted,
      }),
      outlineText(
        `${stats.activeDaysLastYear} active days · ${Math.round(share * 100)}% of the year`,
        {
          font: 'mono',
          size: 10.5,
          x: RING.cx,
          y: RING.cy + RING.r + 30,
          anchor: 'middle',
          fill: palette.text.secondary,
        },
      ),
    ]),
  ].join('');
  const defs = [
    ...(count.defs ?? []),
    el('linearGradient', { id: 'ring-grad', x1: '0', y1: '0', x2: '1', y2: '1' }, [
      el('stop', { offset: '0', 'stop-color': palette.accent.primary }),
      el('stop', { offset: '1', 'stop-color': palette.accent.secondary }),
    ]),
  ];
  return { body, defs, css: count.css };
}

interface StatTile {
  readonly glyph: GlyphName;
  readonly label: string;
  readonly value: string;
}

function tiles(ctx: RenderContext): readonly StatTile[] {
  const { stats } = ctx.data;
  return [
    { glyph: 'star', label: 'Stars earned', value: compact(stats.starsEarned) },
    { glyph: 'repo', label: 'Public repos', value: String(stats.publicRepos) },
    { glyph: 'people', label: 'Followers', value: compact(stats.followers) },
    {
      glyph: 'flame',
      label: `Day streak · best ${stats.streaks.longest}`,
      value: String(stats.streaks.current),
    },
  ];
}

function statGrid(ctx: RenderContext): Fragment {
  const { palette } = ctx.theme;
  const columns = [232, 412];
  const rows = [118, 200];
  const fragments = tiles(ctx).map((tile, index) => {
    const x = columns[index % 2] ?? PAD;
    const y = rows[Math.floor(index / 2)] ?? 0;
    const value = odometer({
      value: tile.value,
      x,
      y,
      font: 'displayBold',
      size: 28,
      fill: palette.text.primary,
      id: `tile${index}`,
      delay: 320 + index * 110,
    });
    const body =
      value.body +
      animated(ANIM.rise, 260 + index * 90, [
        glyph(tile.glyph, { x, y: y + 9, size: 12, fill: palette.accent.secondary }),
        outlineText(tile.label, {
          font: 'displayMedium',
          size: 11.5,
          x: x + 18,
          y: y + 19,
          fill: palette.text.secondary,
        }),
      ]);
    return { body, defs: value.defs, css: value.css };
  });
  return {
    body: fragments.map((f) => f.body).join(''),
    defs: fragments.flatMap((f) => f.defs ?? []),
    css: fragments[0]?.css ?? '',
  };
}

function divider(ctx: RenderContext): string {
  const x = 204;
  return el('line', {
    x1: x,
    y1: 72,
    x2: x,
    y2: HEIGHT - 32,
    stroke: ctx.theme.palette.surfaceBorder,
    'stroke-dasharray': num(HEIGHT - 104),
    class: ANIM.draw,
    style: `--len:${num(HEIGHT - 104)};animation-delay:200ms`,
  });
}

/** The activity stats renderer. */
export const statsRenderer: AssetRenderer = {
  id: 'stats',
  width: WIDTH,
  height: HEIGHT,
  render(ctx) {
    return assemble(statsRenderer, ctx, 'GitHub activity', [
      { body: header(ctx) },
      contributionRing(ctx),
      { body: divider(ctx) },
      statGrid(ctx),
    ]);
  },
};
