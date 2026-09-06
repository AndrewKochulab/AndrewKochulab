/**
 * @module renderers/project-card
 * One featured repository: name, blurb, language and live star/fork counts
 * on the same aurora glass ground as the activity widgets.
 */

import { ANIM } from '../core/animation.ts';
import { combine, type Fragment } from '../core/fragment.ts';
import { compact, el } from '../core/svg.ts';
import { outlineText } from '../core/text.ts';
import type { AssetRenderer, FeaturedProject, RenderContext, RepoStats } from '../core/types.ts';
import { glyph } from '../primitives/glyphs.ts';
import { odometer } from '../primitives/odometer.ts';
import { animated, assemble, wrapText } from './shared.ts';

const WIDTH = 580;
const HEIGHT = 150;
const LEFT = 26;

const EMPTY_STATS: RepoStats = { stars: 0, forks: 0, language: null, languageColor: null };

function heading(ctx: RenderContext, project: FeaturedProject): string {
  const { palette } = ctx.theme;
  return animated(ANIM.rise, 120, [
    glyph('repo', { x: LEFT, y: 28, size: 16, fill: palette.accent.primary }),
    outlineText(project.repo, {
      font: 'displaySemiBold',
      size: 18,
      x: LEFT + 26,
      y: 42,
      fill: palette.text.primary,
    }),
  ]);
}

function blurb(ctx: RenderContext, project: FeaturedProject): string {
  const { palette } = ctx.theme;
  const lines = wrapText(
    project.blurb,
    { font: 'displayMedium', size: 13.5 },
    WIDTH - LEFT - 90,
    2,
  );
  return animated(
    ANIM.rise,
    220,
    lines.map((line, index) =>
      outlineText(line, {
        font: 'displayMedium',
        size: 13.5,
        x: LEFT,
        y: 70 + index * 19,
        fill: palette.text.secondary,
      }),
    ),
  );
}

function meta(ctx: RenderContext, project: FeaturedProject, stats: RepoStats): Fragment {
  const { palette } = ctx.theme;
  const y = 124;
  const parts: string[] = [];
  let x = LEFT;
  if (stats.language !== null) {
    parts.push(
      el('circle', {
        cx: x + 5,
        cy: y - 4,
        r: 5,
        fill: stats.languageColor ?? palette.accent.primary,
      }),
      outlineText(stats.language, {
        font: 'mono',
        size: 12,
        x: x + 16,
        y,
        fill: palette.text.secondary,
      }),
    );
    x += 16 + stats.language.length * 7.4 + 22;
  }
  const stars = odometer({
    value: compact(stats.stars),
    x: x + 19,
    y,
    font: 'displaySemiBold',
    size: 13,
    fill: palette.text.primary,
    id: `${project.repo}-stars`,
    delay: 420,
  });
  parts.push(glyph('star', { x, y: y - 11, size: 13, fill: palette.accent.secondary }), stars.body);
  x += 19 + stars.width + 22;
  const forks = odometer({
    value: compact(stats.forks),
    x: x + 19,
    y,
    font: 'displaySemiBold',
    size: 13,
    fill: palette.text.primary,
    id: `${project.repo}-forks`,
    delay: 520,
  });
  parts.push(glyph('fork', { x, y: y - 11, size: 13, fill: palette.accent.secondary }), forks.body);
  return {
    body: animated(ANIM.rise, 300, parts),
    defs: [...(stars.defs ?? []), ...(forks.defs ?? [])],
    css: stars.css,
  };
}

function arrow(ctx: RenderContext): string {
  const { palette } = ctx.theme;
  const cx = WIDTH - 44;
  const cy = HEIGHT / 2;
  return animated(
    ANIM.pop,
    480,
    el('g', { class: ANIM.float, style: '--period:4200ms' }, [
      el('circle', {
        cx,
        cy,
        r: 17,
        fill: palette.accent.primary,
        'fill-opacity': 0.12,
        stroke: palette.accent.primary,
        'stroke-opacity': 0.5,
      }),
      glyph('arrow', { x: cx - 7, y: cy - 7, size: 14, fill: palette.accent.primary }),
    ]),
  );
}

/** Creates the renderer for one featured project. */
export function createProjectCardRenderer(project: FeaturedProject): AssetRenderer {
  const renderer: AssetRenderer = {
    id: `project-${project.repo.toLowerCase()}`,
    width: WIDTH,
    height: HEIGHT,
    render(ctx) {
      const stats = ctx.data.stats.repos[project.repo] ?? EMPTY_STATS;
      const content = combine(
        { body: heading(ctx, project) },
        { body: blurb(ctx, project) },
        meta(ctx, project, stats),
        { body: arrow(ctx) },
      );
      return assemble(renderer, ctx, `${project.repo}: ${project.blurb}`, [content]);
    },
  };
  return renderer;
}
