/**
 * @module data/stats-source
 * Where a build gets its {@link StatsSnapshot} from.
 *
 * `LiveStatsSource` talks to GitHub (used by the daily refresh); `CachedStatsSource`
 * reads the committed `data/stats.json` (used by local builds, CI checks and tests).
 * Both implement the same one-method interface so the pipeline does not care.
 */

import { readFile } from 'node:fs/promises';
import type { CalendarCell, RepoStats, StatsSnapshot } from '../core/types.ts';
import type { ContributionLevel, GitHubClient, RawProfile } from './github-client.ts';
import { computeLanguageShare } from './languages.ts';
import { computeStreaks } from './streaks.ts';

export interface StatsSource {
  load(): Promise<StatsSnapshot>;
}

const LEVELS: Readonly<Record<ContributionLevel, CalendarCell['level']>> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

/**
 * Pure conversion from the API shape to the snapshot the renderers consume.
 * Private repositories contribute to language share and star totals only when
 * the token could see them; their names never leave the CI job because the
 * `repos` map is restricted to public repositories.
 */
export function assembleSnapshot(raw: RawProfile, login: string, now: Date): StatsSnapshot {
  const publicRepos = raw.repositories.filter((repo) => !repo.isPrivate);
  const repos: Record<string, RepoStats> = {};
  for (const repo of publicRepos) {
    repos[repo.name] = {
      stars: repo.stargazerCount,
      forks: repo.forkCount,
      language: repo.primaryLanguage?.name ?? null,
      languageColor: repo.primaryLanguage?.color ?? null,
    };
  }
  const languageEdges = raw.repositories.flatMap((repo) =>
    repo.languages.edges.map((edge) => ({
      name: edge.node.name,
      color: edge.node.color,
      bytes: edge.size,
    })),
  );
  return {
    generatedAt: now.toISOString(),
    scope: raw.viewerLogin.toLowerCase() === login.toLowerCase() ? 'private-included' : 'public',
    followers: raw.followers,
    publicRepos: raw.publicSourceRepos,
    starsEarned: raw.repositories.reduce((sum, repo) => sum + repo.stargazerCount, 0),
    contributionsLastYear: raw.totalContributions,
    activeDaysLastYear: raw.calendarDays.filter((day) => day.contributionCount > 0).length,
    commitsLastYear: raw.commits,
    pullRequestsLastYear: raw.pullRequests,
    streaks: computeStreaks(raw.calendarDays),
    calendar: raw.calendarDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: LEVELS[day.contributionLevel],
    })),
    languages: computeLanguageShare(languageEdges),
    repos,
  };
}

/** Fetches a fresh snapshot from GitHub. */
export class LiveStatsSource implements StatsSource {
  readonly #client: GitHubClient;
  readonly #login: string;
  readonly #clock: () => Date;

  constructor(client: GitHubClient, login: string, clock: () => Date = () => new Date()) {
    this.#client = client;
    this.#login = login;
    this.#clock = clock;
  }

  async load(): Promise<StatsSnapshot> {
    const raw = await this.#client.fetchProfile(this.#login);
    return assembleSnapshot(raw, this.#login, this.#clock());
  }
}

/** Reads a previously fetched snapshot from disk. */
export class CachedStatsSource implements StatsSource {
  readonly #path: string;

  constructor(path: string) {
    this.#path = path;
  }

  async load(): Promise<StatsSnapshot> {
    const json = await readFile(this.#path, 'utf8');
    return parseSnapshot(json);
  }
}

/** Parses and shallow-validates a snapshot document. */
export function parseSnapshot(json: string): StatsSnapshot {
  const value: unknown = JSON.parse(json);
  if (typeof value !== 'object' || value === null) throw new Error('stats.json is not an object');
  const snapshot = value as Partial<StatsSnapshot>;
  const required: (keyof StatsSnapshot)[] = [
    'generatedAt',
    'scope',
    'followers',
    'publicRepos',
    'starsEarned',
    'contributionsLastYear',
    'activeDaysLastYear',
    'streaks',
    'calendar',
    'languages',
    'repos',
  ];
  for (const key of required) {
    if (snapshot[key] === undefined) throw new Error(`stats.json is missing "${key}"`);
  }
  return snapshot as StatsSnapshot;
}
