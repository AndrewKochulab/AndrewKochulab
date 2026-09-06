/**
 * @module renderers/hero
 * The banner at the top of the profile: name, title and a typed tagline,
 * beside (wide) or above (compact) a cluster of floating app-icon tiles.
 *
 * Everything it draws — the name, the chips, which tiles float — comes from
 * `data/config.json`; the two layouts below only decide where it all sits.
 */

import { ANIM } from '../core/animation.ts';
import { format } from '../config/format.ts';
import type { HeroTile, SiteConfig } from '../config/types.ts';
import type { Fragment } from '../core/fragment.ts';
import { el } from '../core/svg.ts';
import { outlineText } from '../core/text.ts';
import type { AssetRenderer, AssetSize, RenderContext, Viewport } from '../core/types.ts';
import { FRAME_CLIP } from '../primitives/background.ts';
import { GLOW } from '../primitives/glow.ts';
import { glyph } from '../primitives/glyphs.ts';
import { iconBrandColor } from '../primitives/icon.ts';
import { pill, pillWidth } from '../primitives/pill.ts';
import { tile } from '../primitives/tile.ts';
import { typewriter } from '../primitives/typewriter.ts';
import { animated, assemble, eyebrow, fitSize, flowRows, pad, seeded } from './shared.ts';

/** Where each line sits, per viewport. */
interface HeroLayout extends AssetSize {
  readonly left: number;
  /** Right edge available to the text column. */
  readonly textRight: number;
  readonly locationY: number;
  readonly nameY: number;
  readonly nameSize: number;
  readonly titleY: number;
  readonly titleSize: number;
  readonly taglineY: number;
  readonly taglineSize: number;
  readonly pillTop: number;
  readonly pillHeight: number;
  readonly pillFontSize: number;
  /** Cluster centre; `row` lays the tiles out in one line instead. */
  readonly cluster: { readonly x: number; readonly y: number; readonly row: boolean };
  /** Region the sparkles are scattered over. */
  readonly sparkleBox: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  };
}

const WIDE: HeroLayout = {
  width: 1200,
  height: 400,
  display: 880,
  left: 72,
  textRight: 660,
  locationY: 95,
  nameY: 168,
  nameSize: 58,
  titleY: 208,
  titleSize: 22,
  taglineY: 268,
  taglineSize: 17,
  pillTop: 300,
  pillHeight: 32,
  pillFontSize: 13,
  cluster: { x: 940, y: 200, row: false },
  sparkleBox: { x: 700, y: 30, w: 460, h: 340 },
};

const COMPACT: HeroLayout = {
  width: 400,
  height: 344,
  display: 400,
  left: 20,
  textRight: 380,
  locationY: 40,
  nameY: 84,
  nameSize: 34,
  titleY: 110,
  titleSize: 16,
  taglineY: 146,
  taglineSize: 12.5,
  pillTop: 162,
  pillHeight: 30,
  pillFontSize: 12.5,
  cluster: { x: 200, y: 280, row: true },
  sparkleBox: { x: 24, y: 220, w: 352, h: 110 },
};

/**
 * Cluster arrangements, as offsets from the centre and a tile diameter.
 * Positions are part of the layout rather than the config so that adding a
 * tile to `hero.tiles` never means hand-placing it.
 */
const CLUSTERS: Readonly<Record<number, readonly { x: number; y: number; size: number }[]>> = {
  1: [{ x: 0, y: 0, size: 124 }],
  2: [
    { x: -74, y: -22, size: 112 },
    { x: 78, y: 30, size: 98 },
  ],
  3: [
    { x: -122, y: -22, size: 104 },
    { x: 10, y: -92, size: 84 },
    { x: 118, y: 40, size: 112 },
  ],
  4: [
    { x: -150, y: -46, size: 104 },
    { x: 8, y: -122, size: 82 },
    { x: -30, y: 84, size: 88 },
    { x: 150, y: 22, size: 112 },
  ],
  5: [
    { x: -162, y: -40, size: 100 },
    { x: -20, y: -118, size: 80 },
    { x: -54, y: 82, size: 86 },
    { x: 132, y: 34, size: 108 },
    { x: 154, y: -96, size: 72 },
  ],
  6: [
    { x: -170, y: -34, size: 96 },
    { x: -44, y: -122, size: 78 },
    { x: -74, y: 80, size: 84 },
    { x: 112, y: 44, size: 102 },
    { x: 162, y: -92, size: 70 },
    { x: 34, y: 116, size: 74 },
  ],
};

/** Gradient for a tile: the configured pair, else the brand colour shaded. */
function tileGradient(item: HeroTile): readonly [string, string] {
  if (item.gradient !== undefined) return item.gradient;
  const brand = iconBrandColor(item.slug) ?? '#5ac8fa';
  return [brand, brand];
}

function nameBlock(ctx: RenderContext, layout: HeroLayout): Fragment {
  const { palette } = ctx.theme;
  const { profile } = ctx.data.config;
  const available = layout.textRight - layout.left;
  const defs = [
    el('linearGradient', { id: 'hero-title', x1: '0', y1: '0', x2: '1', y2: '0' }, [
      el('stop', { offset: '0', 'stop-color': palette.accent.primary }),
      el('stop', { offset: '0.5', 'stop-color': palette.accent.secondary }),
      el('stop', { offset: '1', 'stop-color': palette.accent.tertiary }),
    ]),
  ];
  const name = {
    font: 'displayBold',
    size: fitSize(profile.name, 'displayBold', available, layout.nameSize, layout.nameSize * 0.55),
    x: layout.left,
    y: layout.nameY,
  } as const;
  const glowLayer = el(
    'g',
    {
      filter: GLOW.strong,
      opacity: ctx.theme.name === 'dark' ? 0.35 : 0.18,
      class: ANIM.pulse,
      style: '--period:6000ms',
    },
    outlineText(profile.name, { ...name, fill: 'url(#hero-title)' }),
  );
  const parts = [
    profile.location === ''
      ? ''
      : animated(ANIM.rise, 60, [
          glyph('pin', {
            x: layout.left,
            y: layout.locationY - 11,
            size: 12,
            fill: palette.accent.primary,
          }),
          eyebrow(profile.location, layout.left + 18, layout.locationY, palette.text.muted, {
            size: layout.nameSize > 40 ? 11 : 10,
          }),
        ]),
    animated(ANIM.rise, 140, [
      glowLayer,
      outlineText(profile.name, { ...name, fill: 'url(#hero-title)' }),
    ]),
    profile.title === ''
      ? ''
      : animated(
          ANIM.rise,
          240,
          outlineText(profile.title, {
            font: 'displayMedium',
            size: fitSize(
              profile.title,
              'displayMedium',
              available,
              layout.titleSize,
              layout.titleSize * 0.7,
            ),
            x: layout.left,
            y: layout.titleY,
            fill: palette.text.secondary,
          }),
        ),
  ];
  return { body: parts.join(''), defs };
}

function taglineBlock(ctx: RenderContext, layout: HeroLayout): Fragment {
  const { palette } = ctx.theme;
  const { taglines } = ctx.data.config.profile;
  if (taglines.length === 0) return { body: '' };
  const prompt = animated(
    ANIM.fade,
    420,
    outlineText('›', {
      font: 'monoMedium',
      size: layout.taglineSize + 1,
      x: layout.left,
      y: layout.taglineY,
      fill: palette.accent.primary,
    }),
  );
  const typed = typewriter({
    lines: taglines,
    x: layout.left + layout.taglineSize + 5,
    y: layout.taglineY,
    font: 'mono',
    size: layout.taglineSize,
    fill: palette.text.primary,
    cursorFill: palette.accent.primary,
    startDelay: 700,
  });
  return { body: prompt + typed.body, css: typed.css };
}

/** x/y of every chip, and the height the block occupies. */
function pillPositions(
  config: SiteConfig,
  layout: HeroLayout,
): {
  readonly positions: readonly { readonly x: number; readonly y: number }[];
  readonly height: number;
} {
  const widths = config.hero.stack.map((item) =>
    pillWidth(item.label, { fontSize: layout.pillFontSize, hasIcon: true }),
  );
  return flowRows(widths, {
    maxWidth: layout.textRight - layout.left,
    gap: 10,
    rowHeight: layout.pillHeight,
    rowGap: 8,
    left: layout.left,
    top: layout.pillTop,
  });
}

function pillRow(ctx: RenderContext, layout: HeroLayout): Fragment {
  const { stack } = ctx.data.config.hero;
  if (stack.length === 0) return { body: '' };
  const { positions } = pillPositions(ctx.data.config, layout);
  const parts = stack.map(
    (item, index) =>
      pill({
        x: positions[index]?.x ?? layout.left,
        y: positions[index]?.y ?? layout.pillTop,
        label: item.label,
        icon: item.slug,
        iconColor: item.color ?? iconBrandColor(item.slug) ?? ctx.theme.palette.accent.primary,
        theme: ctx.theme,
        height: layout.pillHeight,
        fontSize: layout.pillFontSize,
        attrs: { class: ANIM.pop, style: `animation-delay:${520 + index * 90}ms` },
      }).body,
  );
  return { body: parts.join('') };
}

/** Positions for the configured tiles: a cluster when wide, one row when compact. */
function placeTiles(
  tiles: readonly HeroTile[],
  layout: HeroLayout,
): readonly { readonly cx: number; readonly cy: number; readonly size: number }[] {
  if (tiles.length === 0) return [];
  if (layout.cluster.row) {
    const gap = 16;
    const available = layout.width - pad('compact') * 2;
    const size = Math.min(66, (available - gap * (tiles.length - 1)) / tiles.length);
    const total = tiles.length * size + gap * (tiles.length - 1);
    return tiles.map((item, index) => ({
      cx: layout.cluster.x - total / 2 + size / 2 + index * (size + gap),
      cy: layout.cluster.y,
      size: size * (item.scale ?? 1),
    }));
  }
  const preset = CLUSTERS[Math.min(tiles.length, 6)] ?? CLUSTERS[4];
  return tiles.map((item, index) => {
    const spot = preset?.[index % (preset.length || 1)] ?? { x: 0, y: 0, size: 96 };
    return {
      cx: layout.cluster.x + spot.x,
      cy: layout.cluster.y + spot.y,
      size: spot.size * (item.scale ?? 1),
    };
  });
}

function tileCluster(ctx: RenderContext, layout: HeroLayout): Fragment {
  const { tiles } = ctx.data.config.hero;
  const spots = placeTiles(tiles, layout);
  const defs: string[] = [];
  const parts: string[] = [];
  tiles.forEach((item, index) => {
    const spot = spots[index];
    if (spot === undefined) return;
    const rendered = tile({
      cx: spot.cx,
      cy: spot.cy,
      size: spot.size,
      slug: item.slug,
      gradient: tileGradient(item),
      id: `${item.slug}-${index}`,
      attrs: {
        class: ANIM.float,
        style: `--period:${6200 + index * 450}ms;animation-delay:-${index * 1300}ms`,
      },
    });
    defs.push(...rendered.defs);
    parts.push(animated(ANIM.pop, 260 + index * 120, rendered.body));
  });
  return { body: el('g', { 'clip-path': FRAME_CLIP }, parts), defs };
}

function sparkles(ctx: RenderContext, layout: HeroLayout): string {
  const count = ctx.data.config.hero.sparkles;
  if (count === 0) return '';
  const random = seeded(20260906);
  const { palette } = ctx.theme;
  const { x, y, w, h } = layout.sparkleBox;
  const dots: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const size = 6 + random() * 8;
    const period = 3000 + Math.round(random() * 4000);
    const color =
      [palette.accent.primary, palette.accent.secondary, palette.accent.warm][i % 3] ??
      palette.accent.primary;
    dots.push(
      el(
        'g',
        {
          class: ANIM.float,
          style: `--period:${period * 2}ms;animation-delay:-${Math.round(random() * period)}ms`,
        },
        glyph('sparkle', {
          x: x + random() * w,
          y: y + random() * h,
          size,
          fill: color,
          attrs: { class: ANIM.pulse, style: `--period:${period}ms`, opacity: 0.9 },
        }),
      ),
    );
  }
  return el('g', { 'clip-path': FRAME_CLIP }, dots);
}

function lightSweep(ctx: RenderContext, layout: HeroLayout): Fragment {
  const light = ctx.theme.name === 'dark' ? '#ffffff' : ctx.theme.palette.accent.primary;
  const defs = [
    el('linearGradient', { id: 'hero-sweep', x1: '0', y1: '0', x2: '1', y2: '0' }, [
      el('stop', { offset: '0', 'stop-color': light, 'stop-opacity': 0 }),
      el('stop', {
        offset: '0.5',
        'stop-color': light,
        'stop-opacity': ctx.theme.name === 'dark' ? 0.06 : 0.05,
      }),
      el('stop', { offset: '1', 'stop-color': light, 'stop-opacity': 0 }),
    ]),
  ];
  const body = el(
    'g',
    { 'clip-path': FRAME_CLIP },
    el(
      'g',
      { transform: 'skewX(-18)' },
      el('rect', {
        x: 0,
        y: -60,
        width: layout.width * 0.2,
        height: layout.height + 120,
        fill: 'url(#hero-sweep)',
        class: ANIM.sweep,
        style: `--from:-${Math.round(layout.width * 0.35)}px;--to:${Math.round(layout.width * 1.25)}px;--period:11000ms`,
      }),
    ),
  );
  return { body, defs };
}

/**
 * Builds the hero renderer for one configuration. The compact layout grows
 * with the number of stack chips, so a long stack wraps instead of spilling
 * off the card.
 */
export function createHeroRenderer(config: SiteConfig): AssetRenderer {
  const sizes: Record<Viewport, HeroLayout> = {
    wide: WIDE,
    compact: compactLayout(config),
  };
  return {
    id: 'hero',
    viewports: ['wide', 'compact'],
    size: (viewport) => sizes[viewport],
    render(ctx) {
      const layout = sizes[ctx.viewport];
      const { profile, text } = ctx.data.config;
      const title = format(text.heroAlt, { name: profile.name, title: profile.title });
      return assemble(layout, ctx, title, [
        { body: sparkles(ctx, layout) },
        tileCluster(ctx, layout),
        nameBlock(ctx, layout),
        taglineBlock(ctx, layout),
        pillRow(ctx, layout),
        lightSweep(ctx, layout),
      ]);
    },
  };
}

/** The compact layout with its tile row and height adjusted to the chip rows. */
function compactLayout(config: SiteConfig): HeroLayout {
  const chips = pillPositions(config, COMPACT);
  const chipsBottom =
    config.hero.stack.length === 0 ? COMPACT.taglineY + 8 : COMPACT.pillTop + chips.height;
  const tileSize = config.hero.tiles.length === 0 ? 0 : 66;
  const clusterY = chipsBottom + 26 + tileSize / 2;
  return {
    ...COMPACT,
    cluster: { ...COMPACT.cluster, y: clusterY },
    height: tileSize === 0 ? chipsBottom + 24 : clusterY + tileSize / 2 + 24,
    sparkleBox: { x: 24, y: clusterY - 60, w: 352, h: 120 },
  };
}
