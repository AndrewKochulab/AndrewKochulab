/**
 * @module data/load
 * Reads the authored JSON files under `data/` and joins them with a stats
 * snapshot into the {@link ProfileData} renderers consume.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { FeaturedProject, Profile, ProfileData } from '../core/types.ts';
import type { StatsSource } from './stats-source.ts';
import { CachedStatsSource } from './stats-source.ts';

/** Absolute path of the repository root. */
export const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url));

/** Absolute path of a file under `data/`. */
export function dataPath(file: string): string {
  return fileURLToPath(new URL(`../../data/${file}`, import.meta.url));
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(dataPath(file), 'utf8')) as T;
}

/** Loads the static profile facts, without stats. */
export async function loadAuthoredData(): Promise<Omit<ProfileData, 'stats'>> {
  const [profile, projects] = await Promise.all([
    readJson<Profile>('profile.json'),
    readJson<FeaturedProject[]>('projects.json'),
  ]);
  return { profile, projects };
}

/** Loads everything a build needs, taking stats from `source` (cached file by default). */
export async function loadProfileData(
  source: StatsSource = new CachedStatsSource(dataPath('stats.json')),
): Promise<ProfileData> {
  const [authored, stats] = await Promise.all([loadAuthoredData(), source.load()]);
  return { ...authored, stats };
}
