/**
 * @module data/merge
 * Protects a rich snapshot from being overwritten by a poorer one.
 *
 * The daily refresh runs with whatever token it has. Without `PROFILE_TOKEN`
 * GitHub hides private contributions, which would silently shrink the
 * calendar and the yearly total. When that happens, the fields that depend
 * on private visibility are kept from the previous snapshot while public
 * facts (stars, forks, followers, repositories) still refresh.
 */

import type { StatsSnapshot } from '../core/types.ts';

/** Fields whose values depend on seeing private contributions. */
const PRIVATE_SENSITIVE = [
  'contributionsLastYear',
  'activeDaysLastYear',
  'commitsLastYear',
  'pullRequestsLastYear',
  'streaks',
  'calendar',
  'languages',
] as const satisfies readonly (keyof StatsSnapshot)[];

/**
 * Returns `next`, unless it is public-only while `previous` included private
 * data; then the private-sensitive fields of `previous` are carried over and
 * the scope stays `private-included`.
 */
export function preserveRicherSnapshot(
  previous: StatsSnapshot | undefined,
  next: StatsSnapshot,
): { readonly snapshot: StatsSnapshot; readonly preserved: boolean } {
  if (previous?.scope !== 'private-included' || next.scope !== 'public') {
    return { snapshot: next, preserved: false };
  }
  const carried = Object.fromEntries(PRIVATE_SENSITIVE.map((key) => [key, previous[key]])) as Pick<
    StatsSnapshot,
    (typeof PRIVATE_SENSITIVE)[number]
  >;
  return { snapshot: { ...next, ...carried, scope: 'private-included' }, preserved: true };
}
