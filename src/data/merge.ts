/**
 * @module data/merge
 * Protects a rich snapshot from being overwritten by a poorer one.
 *
 * The daily refresh runs with whatever token it has. Two things can be
 * hidden from it, independently:
 *
 * - Private contributions in the calendar, when the user does not share
 *   private contribution counts and the token is not theirs.
 * - Private repositories and private commit and pull request totals, whenever
 *   the token is not the owner's (the default `GITHUB_TOKEN`).
 *
 * Only the fields a fetch could not see are kept from the previous snapshot;
 * everything it did see refreshes. A complete calendar is never replaced by
 * an old one, so the last days always show up.
 */

import type { StatsSnapshot } from '../core/types.ts';

/** Fields that depend on the calendar counting private contributions. */
const CALENDAR_SENSITIVE = [
  'contributionsLastYear',
  'activeDaysLastYear',
  'streaks',
  'calendar',
] as const satisfies readonly (keyof StatsSnapshot)[];

/** Fields that depend on the owner's token seeing private repositories and totals. */
const OWNER_SENSITIVE = [
  'commitsLastYear',
  'pullRequestsLastYear',
  'languages',
] as const satisfies readonly (keyof StatsSnapshot)[];

type Carried = Partial<
  Pick<StatsSnapshot, (typeof CALENDAR_SENSITIVE)[number] | (typeof OWNER_SENSITIVE)[number]>
>;

/** Which groups of fields were carried over from the previous snapshot. */
export interface Preserved {
  readonly calendar: boolean;
  readonly owner: boolean;
}

function pick(snapshot: StatsSnapshot, keys: readonly (keyof Carried)[]): Carried {
  return Object.fromEntries(keys.map((key) => [key, snapshot[key]]));
}

/**
 * Returns `next`, with the fields it could not see taken from `previous`
 * when `previous` could see them.
 */
export function preserveRicherSnapshot(
  previous: StatsSnapshot | undefined,
  next: StatsSnapshot,
): { readonly snapshot: StatsSnapshot; readonly preserved: Preserved } {
  const calendar = previous?.scope === 'private-included' && next.scope === 'public';
  // Snapshots from before `ownerView` existed were only ever rich when the owner fetched.
  const owner =
    previous !== undefined &&
    next.ownerView === false &&
    (previous.ownerView ?? previous.scope === 'private-included');
  if (previous === undefined || (!calendar && !owner)) {
    return { snapshot: next, preserved: { calendar: false, owner: false } };
  }
  const snapshot: StatsSnapshot = {
    ...next,
    ...(calendar ? { ...pick(previous, CALENDAR_SENSITIVE), scope: previous.scope } : {}),
    ...(owner ? { ...pick(previous, OWNER_SENSITIVE), ownerView: true } : {}),
  };
  return { snapshot, preserved: { calendar, owner } };
}
