/**
 * Shared fixtures for the test-suite: a deterministic stats snapshot and the
 * authored data, so renderer snapshots never depend on the network.
 */

import type { ProfileData, StatsSnapshot } from '../src/core/types.ts';
import { loadAuthoredData } from '../src/data/load.ts';

export const fixtureStats: StatsSnapshot = {
  generatedAt: '2026-09-05T04:17:00.000Z',
  scope: 'private-included',
  followers: 29,
  publicRepos: 7,
  starsEarned: 128,
  contributionsLastYear: 919,
  activeDaysLastYear: 212,
  commitsLastYear: 640,
  pullRequestsLastYear: 48,
  streaks: { current: 6, longest: 41 },
  calendar: Array.from({ length: 371 }, (_, i) => {
    const count = (i * 7919) % 11 > 6 ? ((i * 31) % 9) + 1 : 0;
    const level = count === 0 ? 0 : count < 3 ? 1 : count < 5 ? 2 : count < 8 ? 3 : 4;
    return { date: `day-${i}`, count, level: level };
  }),
  languages: [
    { name: 'Swift', color: '#F05138', bytes: 700, percent: 37 },
    { name: 'TypeScript', color: '#3178c6', bytes: 560, percent: 29.6 },
    { name: 'Python', color: '#3572A5', bytes: 400, percent: 21.1 },
    { name: 'JavaScript', color: '#f1e05a', bytes: 200, percent: 10.6 },
    { name: 'Rust', color: '#dea584', bytes: 32, percent: 1.7 },
  ],
  repos: {
    'jarvis-dashboard': { stars: 94, forks: 25, language: 'JavaScript', languageColor: '#f1e05a' },
    'react-native-swiftui-dsl': {
      stars: 15,
      forks: 2,
      language: 'TypeScript',
      languageColor: '#3178c6',
    },
    AnalyticsSystem: { stars: 9, forks: 0, language: 'Swift', languageColor: '#F05138' },
    RealmStorage: { stars: 8, forks: 3, language: 'Swift', languageColor: '#F05138' },
  },
};

/** Authored data joined with the fixture snapshot. */
export async function fixtureData(): Promise<ProfileData> {
  return { ...(await loadAuthoredData()), stats: fixtureStats };
}
