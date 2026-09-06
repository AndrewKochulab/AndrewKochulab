/**
 * @module renderers/stats-card
 * Activity card: a ring of active days around the yearly contribution count,
 * with a grid of configurable figures beside it (wide) or below it (compact).
 */

import { ANIM } from '../core/animation.ts';
import { format } from '../config/format.ts';
import type { SiteConfig, StatTileId } from '../config/types.ts';
import type { Fragment } from '../core/fragment.ts';
import { compact, el, grouped, num } from '../core/svg.ts';
import { outlineText } from '../core/text.ts';
import type { AssetRenderer, AssetSize, RenderContext, Viewport } from '../core/types.ts';
import { glyph, type GlyphName } from '../primitives/glyphs.ts';
import { odometer } from '../primitives/odometer.ts';
import { progressRing } from '../primitives/ring.ts';
import { animated, assemble, eyebrow, formatDate, pad, wrapText } from './shared.ts';

interface StatsLayout extends AssetSize {
  readonly headerY: number;
  readonly headerSize: number;
  readonly headerSpacing: number;
  readonly captionSize: number;
  /** Caption on the header row (wide) or on its own line below it (compact). */
  readonly captionOwnLine: boolean;
  readonly ring: {
    readonly cx: number;
    readonly cy: number;
    readonly r: number;
    readonly stroke: number;
  };
  readonly ringValueSize: number;
  readonly activeDaysY: number;
  readonly activeDaysAnchor: 'middle' | 'start';
  /** Vertical rule between ring and grid (wide) or horizontal rule above it (compact). */
  readonly divider: 'vertical' | 'horizontal';
  readonly dividerAt: number;
  readonly columns: readonly number[];
  readonly rows: readonly number[];
  readonly valueSize: number;
  readonly labelSize: number;
  /** Size of the "N active days" line under the ring. */
  readonly footnoteSize: number;
  readonly columnWidth: number;
}

const WIDE: StatsLayout = {
  width: 580,
  height: 260,
  display: 405,
  headerY: 44,
  headerSize: 11,
  headerSpacing: 1.6,
  captionSize: 10.5,
  captionOwnLine: false,
  ring: { cx: 112, cy: 152, r: 62, stroke: 9 },
  ringValueSize: 30,
  activeDaysY: 244,
  activeDaysAnchor: 'middle',
  divider: 'vertical',
  dividerAt: 204,
  columns: [232, 412],
  rows: [118, 200],
  valueSize: 28,
  labelSize: 11.5,
  footnoteSize: 10.5,
  columnWidth: 132,
};

const COMPACT: StatsLayout = {
  width: 400,
  height: 380,
  display: 400,
  headerY: 34,
  headerSize: 10,
  headerSpacing: 1.2,
  captionSize: 10,
  captionOwnLine: false,
  ring: { cx: 200, cy: 128, r: 54, stroke: 9 },
  ringValueSize: 30,
  activeDaysY: 212,
  activeDaysAnchor: 'middle',
  divider: 'horizontal',
  dividerAt: 236,
  columns: [24, 208],
  rows: [282, 340],
  valueSize: 28,
  labelSize: 12,
  footnoteSize: 11.5,
  columnWidth: 172,
};

/** Layouts for one configuration; the compact card shrinks to the rows it uses. */
function layoutsFor(config: SiteConfig): Record<Viewport, StatsLayout> {
  const rows = Math.max(1, Math.ceil(config.stats.tiles.length / 2));
  const lastRow = COMPACT.rows[rows - 1] ?? COMPACT.rows[0] ?? 0;
  return {
    wide: WIDE,
    compact: { ...COMPACT, height: lastRow + 40 },
  };
}

function header(ctx: RenderContext, layout: StatsLayout): string {
  const { palette } = ctx.theme;
  const { stats } = ctx.data;
  const { text } = ctx.data.config;
  const inset = pad(ctx.viewport);
  const scope = stats.scope === 'private-included' ? text.scopePrivate : text.scopePublic;
  const caption = format(text.statsCaption, { date: formatDate(stats.generatedAt), scope });
  return animated(ANIM.rise, 40, [
    eyebrow(text.statsTitle, inset, layout.headerY, palette.text.muted, {
      size: layout.headerSize,
      letterSpacing: layout.headerSpacing,
    }),
    outlineText(caption, {
      font: 'mono',
      size: layout.captionSize,
      x: layout.captionOwnLine ? inset : layout.width - inset,
      y: layout.captionOwnLine ? layout.headerY + 16 : layout.headerY,
      anchor: layout.captionOwnLine ? 'start' : 'end',
      fill: palette.text.muted,
    }),
  ]);
}

function contributionRing(ctx: RenderContext, layout: StatsLayout): Fragment {
  const { palette } = ctx.theme;
  const { stats } = ctx.data;
  const { text } = ctx.data.config;
  const { cx, cy, r, stroke } = layout.ring;
  const share = Math.min(1, stats.activeDaysLastYear / 365);
  const count = odometer({
    value: grouped(stats.contributionsLastYear),
    x: cx,
    y: cy + 4,
    font: 'displayBold',
    size: layout.ringValueSize,
    fill: palette.text.primary,
    id: 'contrib',
    anchor: 'middle',
    delay: 300,
  });
  const body = [
    animated(ANIM.pop, 120, [
      progressRing({
        cx,
        cy,
        r,
        stroke: 'url(#ring-grad)',
        trackStroke: palette.surfaceBorder,
        strokeWidth: stroke,
        progress: share,
        delay: 260,
        duration: 1600,
      }),
    ]),
    count.body,
    animated(ANIM.fade, 500, [
      outlineText(text.contributionsUnit, {
        font: 'displayMedium',
        size: 11,
        x: cx,
        y: cy + 24,
        anchor: 'middle',
        fill: palette.text.muted,
      }),
      outlineText(
        format(text.activeDays, {
          days: stats.activeDaysLastYear,
          percent: Math.round(share * 100),
        }),
        {
          font: 'mono',
          size: layout.footnoteSize,
          x: layout.activeDaysAnchor === 'middle' ? cx : pad(ctx.viewport),
          y: layout.activeDaysY,
          anchor: layout.activeDaysAnchor,
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

/** Resolves one configured figure against the snapshot. */
function tileFor(id: StatTileId, ctx: RenderContext): StatTile {
  const { stats } = ctx.data;
  const { text } = ctx.data.config;
  switch (id) {
    case 'stars':
      return { glyph: 'star', label: text.statStars, value: compact(stats.starsEarned) };
    case 'repos':
      return { glyph: 'repo', label: text.statRepos, value: String(stats.publicRepos) };
    case 'followers':
      return { glyph: 'people', label: text.statFollowers, value: compact(stats.followers) };
    case 'commits':
      return { glyph: 'commit', label: text.statCommits, value: compact(stats.commitsLastYear) };
    case 'pullRequests':
      return {
        glyph: 'pulse',
        label: text.statPullRequests,
        value: compact(stats.pullRequestsLastYear),
      };
    case 'activeDays':
      return {
        glyph: 'pulse',
        label: text.statActiveDays,
        value: String(stats.activeDaysLastYear),
      };
    case 'contributions':
      return {
        glyph: 'pulse',
        label: text.statContributions,
        value: compact(stats.contributionsLastYear),
      };
    case 'streak':
    default:
      return {
        glyph: 'flame',
        label: format(text.statStreak, { best: stats.streaks.longest }),
        value: String(stats.streaks.current),
      };
  }
}

function statGrid(ctx: RenderContext, layout: StatsLayout): Fragment {
  const { palette } = ctx.theme;
  const tiles = ctx.data.config.stats.tiles.map((id) => tileFor(id, ctx));
  const fragments = tiles.map((tile, index) => {
    const x = layout.columns[index % 2] ?? pad(ctx.viewport);
    const y = layout.rows[Math.floor(index / 2)] ?? 0;
    const value = odometer({
      value: tile.value,
      x,
      y,
      font: 'displayBold',
      size: layout.valueSize,
      fill: palette.text.primary,
      id: `tile${index}`,
      delay: 320 + index * 110,
    });
    // The label sits beside its glyph and is trimmed to the column, so a
    // renamed or translated string can never run into the next column.
    const [label = ''] = wrapText(
      tile.label,
      { font: 'displayMedium', size: layout.labelSize },
      layout.columnWidth - 18,
      1,
    );
    const body =
      value.body +
      animated(ANIM.rise, 260 + index * 90, [
        glyph(tile.glyph, { x, y: y + 9, size: 12, fill: palette.accent.secondary }),
        outlineText(label, {
          font: 'displayMedium',
          size: layout.labelSize,
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

function divider(ctx: RenderContext, layout: StatsLayout): string {
  const inset = pad(ctx.viewport);
  const vertical = layout.divider === 'vertical';
  const from = vertical ? 72 : inset;
  const to = vertical ? layout.height - 32 : layout.width - inset;
  const length = to - from;
  return el('line', {
    x1: vertical ? layout.dividerAt : from,
    y1: vertical ? from : layout.dividerAt,
    x2: vertical ? layout.dividerAt : to,
    y2: vertical ? to : layout.dividerAt,
    stroke: ctx.theme.palette.surfaceBorder,
    'stroke-dasharray': num(length),
    class: ANIM.draw,
    style: `--len:${num(length)};animation-delay:200ms`,
  });
}

/** Builds the activity renderer for one configuration. */
export function createStatsRenderer(config: SiteConfig): AssetRenderer {
  const sizes = layoutsFor(config);
  return {
    id: 'stats',
    viewports: ['wide', 'compact'],
    size: (viewport) => sizes[viewport],
    render(ctx) {
      const layout = sizes[ctx.viewport];
      return assemble(layout, ctx, ctx.data.config.text.statsTitle, [
        { body: header(ctx, layout) },
        contributionRing(ctx, layout),
        { body: divider(ctx, layout) },
        statGrid(ctx, layout),
      ]);
    },
  };
}
