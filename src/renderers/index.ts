/**
 * @module renderers
 * The asset registry. Which assets exist, and in what order, follows
 * `sections` in `data/config.json`; the pipeline and the README generator
 * discover everything through this list.
 */

import type { SiteConfig } from '../config/types.ts';
import type { AssetRenderer } from '../core/types.ts';
import { createContactRenderer } from './contact.ts';
import { contributionsRenderer } from './contributions.ts';
import { createHeroRenderer } from './hero.ts';
import { createLanguagesRenderer } from './languages-card.ts';
import { createProjectCardRenderer } from './project-card.ts';
import { createStatsRenderer } from './stats-card.ts';

/** The renderers one section contributes, in drawing order. */
function renderersForSection(section: string, config: SiteConfig): AssetRenderer[] {
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

/** Builds the ordered list of renderers for the given configuration. */
export function buildRegistry(config: SiteConfig): AssetRenderer[] {
  return config.sections.flatMap((section) => renderersForSection(section, config));
}

/** Looks a renderer up by id, failing loudly so a template can never point at nothing. */
export function rendererById(renderers: readonly AssetRenderer[], id: string): AssetRenderer {
  const renderer = renderers.find((candidate) => candidate.id === id);
  if (!renderer) throw new Error(`No renderer registered with id "${id}"`);
  return renderer;
}
