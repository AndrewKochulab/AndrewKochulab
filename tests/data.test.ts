import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GitHubClient,
  type ContributionDayNode,
  type GraphQLTransport,
  type RawProfile,
} from '../src/data/github-client.ts';
import { computeLanguageShare } from '../src/data/languages.ts';
import { assembleSnapshot, parseSnapshot } from '../src/data/stats-source.ts';
import { preserveRicherSnapshot } from '../src/data/merge.ts';
import { computeStreaks } from '../src/data/streaks.ts';
import { fixtureStats } from './helpers.ts';

const day = (date: string, contributionCount: number): ContributionDayNode => ({
  date,
  contributionCount,
  contributionLevel: contributionCount === 0 ? 'NONE' : 'SECOND_QUARTILE',
});

describe('streaks', () => {
  it('counts current and longest runs', () => {
    const days = [
      day('01', 1),
      day('02', 1),
      day('03', 0),
      day('04', 2),
      day('05', 3),
      day('06', 1),
    ];
    assert.deepEqual(computeStreaks(days), { current: 3, longest: 3 });
  });

  it('does not break the current streak on an empty today', () => {
    const days = [day('01', 1), day('02', 1), day('03', 0)];
    assert.deepEqual(computeStreaks(days), { current: 2, longest: 2 });
  });

  it('handles an empty calendar', () => {
    assert.deepEqual(computeStreaks([]), { current: 0, longest: 0 });
  });
});

describe('language share', () => {
  it('aggregates bytes across repos, ignores noise and limits the list', () => {
    const share = computeLanguageShare(
      [
        { name: 'Swift', color: '#f05138', bytes: 300 },
        { name: 'Swift', color: '#f05138', bytes: 100 },
        { name: 'TypeScript', color: '#3178c6', bytes: 600 },
        { name: 'Makefile', color: null, bytes: 9999 },
        { name: 'Shell', color: null, bytes: 200 },
      ],
      2,
    );
    assert.deepEqual(
      share.map((s) => [s.name, s.percent]),
      [
        ['TypeScript', 60],
        ['Swift', 40],
      ],
    );
    assert.equal(share[0]?.color, '#3178c6');
  });

  it('returns nothing without data', () => {
    assert.deepEqual(computeLanguageShare([]), []);
  });
});

describe('snapshot assembly', () => {
  const raw: RawProfile = {
    viewerLogin: 'Someone',
    followers: 3,
    publicSourceRepos: 2,
    commits: 10,
    pullRequests: 1,
    totalContributions: 12,
    calendarDays: [day('2026-01-01', 1), day('2026-01-02', 0), day('2026-01-03', 1)],
    repositories: [
      {
        name: 'Public',
        isPrivate: false,
        stargazerCount: 5,
        forkCount: 1,
        primaryLanguage: { name: 'Swift', color: '#f05138' },
        languages: { edges: [{ size: 10, node: { name: 'Swift', color: '#f05138' } }] },
      },
      {
        name: 'Secret',
        isPrivate: true,
        stargazerCount: 2,
        forkCount: 0,
        primaryLanguage: null,
        languages: { edges: [{ size: 30, node: { name: 'Python', color: null } }] },
      },
    ],
  };

  it('keeps private repos out of the repo map but in the totals', () => {
    const snapshot = assembleSnapshot(raw, 'someone', new Date('2026-09-05T00:00:00Z'));
    assert.equal(snapshot.scope, 'private-included');
    assert.deepEqual(Object.keys(snapshot.repos), ['Public']);
    assert.equal(snapshot.starsEarned, 7);
    assert.equal(snapshot.activeDaysLastYear, 2);
    assert.deepEqual(
      snapshot.calendar.map((cell) => cell.level),
      [2, 0, 2],
    );
    assert.equal(snapshot.languages[0]?.name, 'Python');
    assert.equal(snapshot.generatedAt, '2026-09-05T00:00:00.000Z');
  });

  it('marks public scope when another account fetched', () => {
    assert.equal(assembleSnapshot(raw, 'other', new Date()).scope, 'public');
  });

  it('round-trips through JSON and rejects incomplete documents', () => {
    const snapshot = assembleSnapshot(raw, 'someone', new Date());
    assert.deepEqual(parseSnapshot(JSON.stringify(snapshot)), snapshot);
    assert.throws(() => parseSnapshot('{"followers":1}'), /missing/);
    assert.throws(() => parseSnapshot('[]'), /missing/);
  });
});

describe('GitHub client', () => {
  it('paginates repositories and flattens the calendar', async () => {
    const calls: string[] = [];
    const transport: GraphQLTransport = {
      query<T>(document: string, variables: Record<string, unknown>): Promise<T> {
        calls.push(
          document.includes('Repositories') ? `repos:${String(variables['after'])}` : 'profile',
        );
        if (document.includes('Repositories')) {
          const first = variables['after'] === null;
          return Promise.resolve({
            user: {
              repositories: {
                pageInfo: { hasNextPage: first, endCursor: first ? 'c1' : null },
                nodes: [
                  {
                    name: first ? 'a' : 'b',
                    isPrivate: false,
                    stargazerCount: 1,
                    forkCount: 0,
                    primaryLanguage: null,
                    languages: { edges: [] },
                  },
                ],
              },
            },
          } as T);
        }
        return Promise.resolve({
          viewer: { login: 'x' },
          user: {
            followers: { totalCount: 1 },
            publicSource: { totalCount: 2 },
            contributionsCollection: {
              totalCommitContributions: 3,
              totalPullRequestContributions: 4,
              contributionCalendar: {
                totalContributions: 5,
                weeks: [{ contributionDays: [day('d1', 1)] }, { contributionDays: [day('d2', 0)] }],
              },
            },
          },
        } as T);
      },
    };
    const profile = await new GitHubClient(transport).fetchProfile('x');
    assert.deepEqual(
      profile.repositories.map((r) => r.name),
      ['a', 'b'],
    );
    assert.deepEqual(
      profile.calendarDays.map((d) => d.date),
      ['d1', 'd2'],
    );
    assert.deepEqual(calls.sort(), ['profile', 'repos:c1', 'repos:null']);
  });
});

describe('snapshot merge', () => {
  it('keeps private-derived figures when the new fetch is public-only', () => {
    const next = {
      ...fixtureStats,
      scope: 'public' as const,
      contributionsLastYear: 60,
      followers: 31,
      calendar: [],
    };
    const { snapshot, preserved } = preserveRicherSnapshot(fixtureStats, next);
    assert.equal(preserved, true);
    assert.equal(snapshot.scope, 'private-included');
    assert.equal(snapshot.contributionsLastYear, fixtureStats.contributionsLastYear);
    assert.equal(snapshot.calendar.length, fixtureStats.calendar.length);
    assert.equal(snapshot.followers, 31);
  });

  it('takes the new snapshot whenever it is at least as rich', () => {
    const richer = { ...fixtureStats, followers: 40 };
    assert.deepEqual(preserveRicherSnapshot(fixtureStats, richer), {
      snapshot: richer,
      preserved: false,
    });
    assert.deepEqual(preserveRicherSnapshot(undefined, richer), {
      snapshot: richer,
      preserved: false,
    });
    const publicOnly = { ...fixtureStats, scope: 'public' as const };
    assert.equal(preserveRicherSnapshot(publicOnly, publicOnly).preserved, false);
  });
});
