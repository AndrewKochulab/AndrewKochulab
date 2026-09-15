/**
 * @module data/load
 * Reads `data/config.json` and joins it with a stats snapshot into the
 * {@link ProfileData} renderers consume.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseConfigJson } from '../config/parse.ts';
import type { SiteConfig } from '../config/types.ts';
import type { ProfileData } from '../core/types.ts';
import type { StatsSource } from './stats-source.ts';
import { CachedStatsSource } from './stats-source.ts';

/** Absolute path of the repository root. */
export const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url));

/** Absolute path of a file under `data/`. */
export function dataPath(file: string): string {
  return fileURLToPath(new URL(`../../data/${file}`, import.meta.url));
}

/** Loads and validates the configuration. */
export async function loadConfig(): Promise<SiteConfig> {
  return parseConfigJson(await readFile(dataPath('config.json'), 'utf8'));
}

/** Loads everything a build needs, taking stats from `source` (cached file by default). */
export async function loadProfileData(
  source: StatsSource = new CachedStatsSource(dataPath('stats.json')),
): Promise<ProfileData> {
  const [config, stats] = await Promise.all([loadConfig(), source.load()]);
  return { config, stats };
}
