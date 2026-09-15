/**
 * @module renderers
 * The asset registry. Which assets exist, and in what order, follows
 * `sections` in `data/config.json`; the pipeline and the README generator
 * discover everything through this list.
 */

import type { SectionId, SiteConfig } from '../config/types.ts';
import type { AssetRenderer } from '../core/types.ts';
import { createContactRenderer } from './contact.ts';
import { contributionsRenderer } from './contributions.ts';
import { createHeroRenderer } from './hero.ts';
import { createLanguagesRenderer } from './languages-card.ts';
import { createProjectCardRenderer } from './project-card.ts';
import { createStatsRenderer } from './stats-card.ts';

/** The renderers one section contributes, in drawing order. */
function renderersForSection(section: SectionId, config: SiteConfig): AssetRenderer[] {
  switch (section) {
    case 'hero':
      return [createHeroRenderer(config)];
    case 'activity':
      return [createStatsRenderer(config), createLanguagesRenderer(config)];
    case 'projects':
      return config.projects.items.map((project) => createProjectCardRenderer(project, config));
    case 'contributions':
      return [contributionsRenderer];
    case 'contact':
      return config.links.map(createContactRenderer);
    default:
      return [];
  }
}

/** Whether a section is left off the page on a phone. */
export function hiddenOnMobile(config: SiteConfig, section: SectionId): boolean {
  return config.appearance.mobile.hide.includes(section);
}

/**
 * Builds the ordered list of renderers for the given configuration. A section
 * that phones never see has no compact layout to render, so its renderers are
 * narrowed to the wide viewport and the build skips half their output.
 */
export function buildRegistry(config: SiteConfig): AssetRenderer[] {
  return config.sections.flatMap((section) => {
    const renderers = renderersForSection(section, config);
    if (!hiddenOnMobile(config, section)) return renderers;
    return renderers.map((renderer) => ({ ...renderer, viewports: ['wide' as const] }));
  });
}

/** Looks a renderer up by id, failing loudly so a template can never point at nothing. */
export function rendererById(renderers: readonly AssetRenderer[], id: string): AssetRenderer {
  const renderer = renderers.find((candidate) => candidate.id === id);
  if (!renderer) throw new Error(`No renderer registered with id "${id}"`);
  return renderer;
}
