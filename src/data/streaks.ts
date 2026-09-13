/**
 * @module data/streaks
 * Pure streak arithmetic over a contribution calendar.
 */

import type { Streaks } from '../core/types.ts';

/** One calendar day as GitHub's GraphQL API reports it. */
export interface CalendarDay {
  /** `YYYY-MM-DD`. */
  readonly date: string;
  readonly contributionCount: number;
}

/**
 * Computes current and longest streaks from days sorted ascending by date.
 *
 * The current streak counts back from the last day in the calendar; a zero on
 * the final day (today, not yet contributed to) does not break it, matching
 * how the popular streak widgets behave.
 */
export function computeStreaks(days: readonly CalendarDay[]): Streaks {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    run = day.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  let current = 0;
  let index = days.length - 1;
  if (index >= 0 && days[index]?.contributionCount === 0) index -= 1;
  for (; index >= 0; index -= 1) {
    const day = days[index];
    if (day === undefined || day.contributionCount === 0) break;
    current += 1;
  }
  return { current, longest };
}
