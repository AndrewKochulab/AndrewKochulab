/**
 * @module readme/template
 * Produces README.md from the configuration and the registry, so asset
 * references, links and section order can never drift from what the build
 * generates.
 *
 * Layout rules of the page:
 *
 * - Every block is one centred paragraph. GitHub draws borders around table
 *   cells (and empty boxes while images load), so no tables are used.
 * - Full-width assets carry `width="100%"`; anything narrower carries no
 *   width at all and relies on its intrinsic size, which is what lets a
 *   phone stack the cards at full width. See `readme/picture.ts`.
 */

import { format } from '../config/format.ts';
import type { SectionId, SiteConfig } from '../config/types.ts';
import type { AssetRenderer } from '../core/types.ts';
import { hiddenOnMobile, rendererById } from '../renderers/index.ts';
import { picture } from './picture.ts';

/** Inline gap between two images that share a row. */
const GAP = '&nbsp;&nbsp;';

interface Context {
  readonly config: SiteConfig;
  readonly renderers: readonly AssetRenderer[];
  /** Breakpoint passed to every picture, or undefined when phone assets are off. */
  readonly breakpoint: number | undefined;
  /** The section being emitted, so a picture knows whether phones skip it. */
  readonly hideOnMobile: boolean;
}

function paragraph(...cells: readonly string[]): string {
  return `<p align="center">\n${cells.join(`\n${GAP}\n`)}\n</p>`;
}

/**
 * One full-width asset on its own line. A section phones skip cannot carry a
 * width attribute: the blank image it resolves to would be stretched to the
 * column and reappear as a gap the height of the column's width.
 */
function fullWidth(ctx: Context, id: string, alt: string, href?: string): string {
  return paragraph(
    picture(rendererById(ctx.renderers, id), {
      alt,
      ...(ctx.hideOnMobile ? {} : { width: '100%' }),
      mobileBreakpoint: ctx.breakpoint,
      hideOnMobile: ctx.hideOnMobile,
      ...(href === undefined ? {} : { href }),
    }),
  );
}

/** Two intrinsically-sized assets per row; they stack whenever the column is narrow. */
function pairs(cells: readonly string[]): string {
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 2) {
    const pair = [cells[i], cells[i + 1]].filter((cell): cell is string => cell !== undefined);
    rows.push(paragraph(...pair));
  }
  return rows.join('\n\n');
}

function activity(ctx: Context): string {
  return pairs([
    picture(rendererById(ctx.renderers, 'stats'), {
      alt: ctx.config.text.statsTitle,
      mobileBreakpoint: ctx.breakpoint,
      hideOnMobile: ctx.hideOnMobile,
    }),
    picture(rendererById(ctx.renderers, 'languages'), {
      alt: ctx.config.text.languagesTitle,
      mobileBreakpoint: ctx.breakpoint,
      hideOnMobile: ctx.hideOnMobile,
    }),
  ]);
}

function projects(ctx: Context): string {
  const { items, layout } = ctx.config.projects;
  if (items.length === 0) return '';
  if (layout === 'row') {
    return items
      .map((project) =>
        fullWidth(
          ctx,
          `project-${project.repo.toLowerCase()}`,
          project.repo,
          project.url ?? undefined,
        ),
      )
      .join('\n\n');
  }
  return pairs(
    items.map((project) =>
      picture(rendererById(ctx.renderers, `project-${project.repo.toLowerCase()}`), {
        alt: project.repo,
        ...(project.url === undefined ? {} : { href: project.url }),
        mobileBreakpoint: ctx.breakpoint,
        hideOnMobile: ctx.hideOnMobile,
      }),
    ),
  );
}

function contact(ctx: Context): string {
  if (ctx.config.links.length === 0) return '';
  return paragraph(
    ...ctx.config.links.map((link) =>
      picture(rendererById(ctx.renderers, `contact-${link.id}`), {
        alt: link.label,
        href: link.url,
        ...(ctx.hideOnMobile
          ? { mobileBreakpoint: ctx.breakpoint, hideOnMobile: true }
          : { height: 66 }),
      }),
    ),
  ).replaceAll(`\n${GAP}\n`, '\n');
}

function section(base: Context, id: SectionId): string {
  const ctx: Context = { ...base, hideOnMobile: hiddenOnMobile(base.config, id) };
  const { profile, text } = ctx.config;
  switch (id) {
    case 'hero':
      return fullWidth(
        ctx,
        'hero',
        format(text.heroAlt, { name: profile.name, title: profile.title }),
      );
    case 'activity':
      return activity(ctx);
    case 'projects':
      return projects(ctx);
    case 'contributions':
      return fullWidth(ctx, 'contributions', text.contributionsTitle);
    case 'contact':
      return contact(ctx);
    default:
      return '';
  }
}

/**
 * The complete README. No headings; spacing alone separates blocks and the
 * assets carry their own titles.
 */
export function readmeMarkdown(config: SiteConfig, renderers: readonly AssetRenderer[]): string {
  const ctx: Context = {
    config,
    renderers,
    breakpoint: config.appearance.mobile.enabled ? config.appearance.mobile.breakpoint : undefined,
    hideOnMobile: false,
  };
  const blocks = config.sections.map((id) => section(ctx, id)).filter((block) => block !== '');
  return `<!-- Generated by \`npm run readme\` from src/readme/template.ts. Edit data/config.json, not this file. -->

${blocks.join('\n\n')}
`;
}
