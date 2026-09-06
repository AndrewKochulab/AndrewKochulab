/**
 * @module renderers/project-card
 * One featured repository: name, blurb, language and live star/fork counts
 * on the same aurora glass ground as the activity widgets.
 *
 * `projects.layout` picks the wide shape. `row` spans the whole column and
 * puts the numbers on the title line, which is what keeps four projects
 * legible on a phone; `grid` keeps the narrower card that pairs up two to a
 * line whenever the column is wide enough for both.
 */

import { ANIM } from '../core/animation.ts';
import type { ProjectItem, SiteConfig } from '../config/types.ts';
import { combine, type Fragment } from '../core/fragment.ts';
import { compact, el } from '../core/svg.ts';
import { measureText, outlineText } from '../core/text.ts';
import type {
  AssetRenderer,
  AssetSize,
  RenderContext,
  RepoStats,
  Viewport,
} from '../core/types.ts';
import { glyph } from '../primitives/glyphs.ts';
import { odometer } from '../primitives/odometer.ts';
import { animated, assemble, wrapText } from './shared.ts';

interface ProjectLayout extends AssetSize {
  readonly left: number;
  readonly nameY: number;
  readonly nameSize: number;
  readonly blurbY: number;
  readonly blurbSize: number;
  readonly blurbLines: number;
  readonly blurbLeading: number;
  readonly blurbRight: number;
  /** Baseline of the meta row; `right` puts it on the title line instead. */
  readonly metaY: number;
  readonly metaSize: number;
  readonly metaAlign: 'left' | 'right';
  readonly metaRight: number;
  readonly arrow: { readonly cx: number; readonly cy: number; readonly r: number };
}

/** Full-column row: name and numbers on one line, blurb beneath. */
const WIDE_ROW: ProjectLayout = {
  width: 1200,
  height: 136,
  display: 880,
  left: 44,
  nameY: 54,
  nameSize: 21,
  blurbY: 88,
  blurbSize: 15,
  blurbLines: 2,
  blurbLeading: 21,
  blurbRight: 1010,
  metaY: 54,
  metaSize: 13.5,
  metaAlign: 'right',
  metaRight: 1104,
  arrow: { cx: 1146, cy: 68, r: 19 },
};

/** Half-column card: the original stacked shape. */
const WIDE_CARD: ProjectLayout = {
  width: 580,
  height: 150,
  display: 430,
  left: 26,
  nameY: 42,
  nameSize: 18,
  blurbY: 70,
  blurbSize: 13.5,
  blurbLines: 2,
  blurbLeading: 19,
  blurbRight: 490,
  metaY: 124,
  metaSize: 12.5,
  metaAlign: 'left',
  metaRight: 554,
  arrow: { cx: 536, cy: 75, r: 17 },
};

const COMPACT: ProjectLayout = {
  width: 400,
  height: 162,
  display: 400,
  left: 22,
  nameY: 40,
  nameSize: 18,
  blurbY: 68,
  blurbSize: 14,
  blurbLines: 3,
  blurbLeading: 19,
  blurbRight: 378,
  metaY: 140,
  metaSize: 13,
  metaAlign: 'left',
  metaRight: 378,
  arrow: { cx: 356, cy: 34, r: 15 },
};

const EMPTY_STATS: RepoStats = { stars: 0, forks: 0, language: null, languageColor: null };

function heading(ctx: RenderContext, project: ProjectItem, layout: ProjectLayout): string {
  const { palette } = ctx.theme;
  const glyphSize = layout.nameSize * 0.9;
  return animated(ANIM.rise, 120, [
    glyph('repo', {
      x: layout.left,
      y: layout.nameY - glyphSize,
      size: glyphSize,
      fill: palette.accent.primary,
    }),
    outlineText(project.repo, {
      font: 'displaySemiBold',
      size: layout.nameSize,
      x: layout.left + glyphSize + 9,
      y: layout.nameY,
      fill: palette.text.primary,
    }),
  ]);
}

function blurb(ctx: RenderContext, project: ProjectItem, layout: ProjectLayout): string {
  const { palette } = ctx.theme;
  if (project.blurb === '') return '';
  const lines = wrapText(
    project.blurb,
    { font: 'displayMedium', size: layout.blurbSize },
    layout.blurbRight - layout.left,
    layout.blurbLines,
  );
  return animated(
    ANIM.rise,
    220,
    lines.map((line, index) =>
      outlineText(line, {
        font: 'displayMedium',
        size: layout.blurbSize,
        x: layout.left,
        y: layout.blurbY + index * layout.blurbLeading,
        fill: palette.text.secondary,
      }),
    ),
  );
}

/** One measured piece of the meta row, so left and right alignment share the maths. */
interface MetaItem {
  readonly width: number;
  render(x: number): Fragment;
}

function metaItems(
  ctx: RenderContext,
  project: ProjectItem,
  layout: ProjectLayout,
  stats: RepoStats,
): readonly MetaItem[] {
  const { palette } = ctx.theme;
  const y = layout.metaY;
  const size = layout.metaSize;
  const items: MetaItem[] = [];
  if (stats.language !== null) {
    const language = stats.language;
    const width = 16 + measureText(language, { font: 'mono', size });
    items.push({
      width,
      render: (x) => ({
        body:
          el('circle', {
            cx: x + 5,
            cy: y - 4,
            r: 5,
            fill: stats.languageColor ?? palette.accent.primary,
          }) +
          outlineText(language, {
            font: 'mono',
            size,
            x: x + 16,
            y,
            fill: palette.text.secondary,
          }),
      }),
    });
  }
  const counts = [
    { glyph: 'star' as const, value: compact(stats.stars), id: 'stars', delay: 420 },
    { glyph: 'fork' as const, value: compact(stats.forks), id: 'forks', delay: 520 },
  ];
  for (const count of counts) {
    const width = 19 + measureText(count.value, { font: 'displaySemiBold', size: size + 0.5 });
    items.push({
      width,
      render: (x) => {
        const value = odometer({
          value: count.value,
          x: x + 19,
          y,
          font: 'displaySemiBold',
          size: size + 0.5,
          fill: palette.text.primary,
          id: `${project.repo}-${count.id}`,
          delay: count.delay,
        });
        return {
          body:
            glyph(count.glyph, {
              x,
              y: y - 11,
              size: 13,
              fill: palette.accent.secondary,
            }) + value.body,
          defs: value.defs,
          css: value.css,
        };
      },
    });
  }
  return items;
}

function meta(
  ctx: RenderContext,
  project: ProjectItem,
  layout: ProjectLayout,
  stats: RepoStats,
): Fragment {
  const items = metaItems(ctx, project, layout, stats);
  const gap = 22;
  const total = items.reduce((sum, item) => sum + item.width, 0) + gap * (items.length - 1);
  let x = layout.metaAlign === 'right' ? layout.metaRight - total : layout.left;
  const rendered = items.map((item) => {
    const piece = item.render(x);
    x += item.width + gap;
    return piece;
  });
  return {
    body: animated(
      ANIM.rise,
      300,
      rendered.map((piece) => piece.body),
    ),
    defs: rendered.flatMap((piece) => piece.defs ?? []),
    css: rendered.map((piece) => piece.css).find((css) => css !== undefined && css !== '') ?? '',
  };
}

function arrow(ctx: RenderContext, layout: ProjectLayout): string {
  const { palette } = ctx.theme;
  const { cx, cy, r } = layout.arrow;
  const size = r * 0.82;
  return animated(
    ANIM.pop,
    480,
    el('g', { class: ANIM.float, style: '--period:4200ms' }, [
      el('circle', {
        cx,
        cy,
        r,
        fill: palette.accent.primary,
        'fill-opacity': 0.12,
        stroke: palette.accent.primary,
        'stroke-opacity': 0.5,
      }),
      glyph('arrow', {
        x: cx - size / 2,
        y: cy - size / 2,
        size,
        fill: palette.accent.primary,
      }),
    ]),
  );
}

/** Creates the renderer for one featured project. */
export function createProjectCardRenderer(project: ProjectItem, config: SiteConfig): AssetRenderer {
  const wide = config.projects.layout === 'row' ? WIDE_ROW : WIDE_CARD;
  const sizes: Record<Viewport, ProjectLayout> = { wide, compact: COMPACT };
  return {
    id: `project-${project.repo.toLowerCase()}`,
    viewports: ['wide', 'compact'],
    size: (viewport) => sizes[viewport],
    render(ctx) {
      const layout = sizes[ctx.viewport];
      const stats = ctx.data.stats.repos[project.repo] ?? EMPTY_STATS;
      const content = combine(
        { body: heading(ctx, project, layout) },
        { body: blurb(ctx, project, layout) },
        meta(ctx, project, layout, stats),
        { body: arrow(ctx, layout) },
      );
      const title = project.blurb === '' ? project.repo : `${project.repo}: ${project.blurb}`;
      return assemble(layout, ctx, title, [content]);
    },
  };
}
