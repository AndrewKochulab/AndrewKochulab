/**
 * @module renderers/hero
 * The banner at the top of the profile: name, title and a typed tagline on
 * the left; a floating cluster of app-icon tiles on the right.
 */

import { ANIM } from '../core/animation.ts';
import type { Fragment } from '../core/fragment.ts';
import { el } from '../core/svg.ts';
import { outlineText } from '../core/text.ts';
import type { AssetRenderer, RenderContext } from '../core/types.ts';
import { FRAME_CLIP } from '../primitives/background.ts';
import { GLOW } from '../primitives/glow.ts';
import { glyph } from '../primitives/glyphs.ts';
import { iconBrandColor } from '../primitives/icon.ts';
import { pill } from '../primitives/pill.ts';
import { tile } from '../primitives/tile.ts';
import { typewriter } from '../primitives/typewriter.ts';
import { animated, assemble, eyebrow, seeded } from './shared.ts';

const WIDTH = 1200;
const HEIGHT = 400;
const LEFT = 72;

/** Technologies shown as pills under the tagline. */
const CORE_STACK = [
  { slug: 'swift', label: 'Swift' },
  { slug: 'react', label: 'React Native' },
  { slug: 'python', label: 'Python' },
  { slug: 'claude', label: 'Claude Code' },
] as const;

/** The tile cluster, positioned relative to the cluster centre. */
const CLUSTER = { x: 940, y: 200 };
const TILES = [
  { slug: 'swift', size: 104, x: -150, y: -46, gradient: ['#ff9f43', '#f0433a'], period: 6200 },
  { slug: 'react', size: 82, x: 8, y: -122, gradient: ['#67d6ff', '#0a84ff'], period: 7400 },
  { slug: 'python', size: 88, x: -30, y: 84, gradient: ['#4f8ff7', '#1f4fbf'], period: 6800 },
  { slug: 'claude', size: 112, x: 150, y: 22, gradient: ['#ffb08a', '#d9633f'], period: 8000 },
] as const;

function nameBlock(ctx: RenderContext): Fragment {
  const { palette } = ctx.theme;
  const defs = [
    el('linearGradient', { id: 'hero-title', x1: '0', y1: '0', x2: '1', y2: '0' }, [
      el('stop', { offset: '0', 'stop-color': palette.accent.primary }),
      el('stop', { offset: '0.5', 'stop-color': palette.accent.secondary }),
      el('stop', { offset: '1', 'stop-color': palette.accent.tertiary }),
    ]),
  ];
  const name = { font: 'displayBold', size: 58, x: LEFT, y: 168 } as const;
  const glowLayer = el(
    'g',
    {
      filter: GLOW.strong,
      opacity: ctx.theme.name === 'dark' ? 0.35 : 0.18,
      class: ANIM.pulse,
      style: '--period:6000ms',
    },
    outlineText(ctx.data.profile.name, { ...name, fill: 'url(#hero-title)' }),
  );
  const body = [
    animated(ANIM.rise, 60, [
      glyph('pin', { x: LEFT, y: 84, size: 12, fill: palette.accent.primary }),
      eyebrow(ctx.data.profile.location, LEFT + 18, 95, palette.text.muted),
    ]),
    animated(ANIM.rise, 140, [
      glowLayer,
      outlineText(ctx.data.profile.name, { ...name, fill: 'url(#hero-title)' }),
    ]),
    animated(
      ANIM.rise,
      240,
      outlineText(ctx.data.profile.title, {
        font: 'displayMedium',
        size: 22,
        x: LEFT,
        y: 208,
        fill: palette.text.secondary,
      }),
    ),
  ].join('');
  return { body, defs };
}

function taglineBlock(ctx: RenderContext): Fragment {
  const { palette } = ctx.theme;
  const prompt = animated(
    ANIM.fade,
    420,
    outlineText('›', {
      font: 'monoMedium',
      size: 18,
      x: LEFT,
      y: 268,
      fill: palette.accent.primary,
    }),
  );
  const typed = typewriter({
    lines: ctx.data.profile.taglines,
    x: LEFT + 22,
    y: 268,
    font: 'mono',
    size: 17,
    fill: palette.text.primary,
    cursorFill: palette.accent.primary,
    startDelay: 700,
  });
  return { body: prompt + typed.body, css: typed.css };
}

function pillRow(ctx: RenderContext): Fragment {
  let x = LEFT;
  const parts: string[] = [];
  CORE_STACK.forEach((item, index) => {
    const rendered = pill({
      x,
      y: 300,
      label: item.label,
      icon: item.slug,
      iconColor: iconBrandColor(item.slug) ?? ctx.theme.palette.accent.primary,
      theme: ctx.theme,
      height: 32,
      fontSize: 13,
      attrs: { class: ANIM.pop, style: `animation-delay:${520 + index * 90}ms` },
    });
    parts.push(rendered.body);
    x += rendered.width + 10;
  });
  return { body: parts.join('') };
}

function tileCluster(): Fragment {
  const defs: string[] = [];
  const parts: string[] = [];
  TILES.forEach((spec, index) => {
    const rendered = tile({
      cx: CLUSTER.x + spec.x,
      cy: CLUSTER.y + spec.y,
      size: spec.size,
      slug: spec.slug,
      gradient: spec.gradient,
      id: spec.slug,
      attrs: {
        class: ANIM.float,
        style: `--period:${spec.period}ms;animation-delay:-${index * 1300}ms`,
      },
    });
    defs.push(...rendered.defs);
    parts.push(animated(ANIM.pop, 260 + index * 120, rendered.body));
  });
  return { body: el('g', { 'clip-path': FRAME_CLIP }, parts), defs };
}

function sparkles(ctx: RenderContext): string {
  const random = seeded(20260906);
  const { palette } = ctx.theme;
  const dots: string[] = [];
  for (let i = 0; i < 9; i += 1) {
    const x = 700 + random() * 460;
    const y = 30 + random() * 340;
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
          x,
          y,
          size,
          fill: color,
          attrs: { class: ANIM.pulse, style: `--period:${period}ms`, opacity: 0.9 },
        }),
      ),
    );
  }
  return dots.join('');
}

function lightSweep(ctx: RenderContext): Fragment {
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
        width: 240,
        height: HEIGHT + 120,
        fill: 'url(#hero-sweep)',
        class: ANIM.sweep,
        style: '--from:-420px;--to:1500px;--period:11000ms',
      }),
    ),
  );
  return { body, defs };
}

/** The hero banner renderer. */
export const heroRenderer: AssetRenderer = {
  id: 'hero',
  width: WIDTH,
  height: HEIGHT,
  render(ctx) {
    return assemble(heroRenderer, ctx, `${ctx.data.profile.name} — ${ctx.data.profile.title}`, [
      tileCluster(),
      { body: sparkles(ctx) },
      nameBlock(ctx),
      taglineBlock(ctx),
      pillRow(ctx),
      lightSweep(ctx),
    ]);
  },
};
