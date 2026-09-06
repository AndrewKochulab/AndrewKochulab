/**
 * @module renderers
 * The asset registry. Adding an asset means adding one entry here; the
 * pipeline and README generator discover everything through this list.
 */

import type { AssetRenderer, ProfileData } from '../core/types.ts';
import { createContactRenderer } from './contact.ts';
import { contributionsRenderer } from './contributions.ts';
import { heroRenderer } from './hero.ts';
import { languagesRenderer } from './languages-card.ts';
import { createProjectCardRenderer } from './project-card.ts';
import { statsRenderer } from './stats-card.ts';

/** Builds the ordered list of renderers for the given data. */
export function buildRegistry(data: Omit<ProfileData, 'stats'>): AssetRenderer[] {
  return [
    heroRenderer,
    statsRenderer,
    languagesRenderer,
    ...data.projects.map(createProjectCardRenderer),
    contributionsRenderer,
    ...data.profile.links.map(createContactRenderer),
  ];
}
