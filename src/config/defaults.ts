/**
 * @module config/defaults
 * What `data/config.json` means when it stays silent. Every default here is
 * a presentation choice, never a fact about a person, so a fork only has to
 * supply the handful of fields that are genuinely about its owner.
 */

import type {
  AppearanceConfig,
  ContributionsConfig,
  HeroConfig,
  LanguagesConfig,
  SectionId,
  StatTileId,
  StatsConfig,
  TextConfig,
} from './types.ts';

/** Order the README is assembled in when `sections` is omitted. */
export const DEFAULT_SECTIONS: readonly SectionId[] = [
  'hero',
  'activity',
  'projects',
  'contributions',
  'contact',
];

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  palette: 'aurora',
  radius: 22,
  mobile: { enabled: true, breakpoint: 600 },
};

export const DEFAULT_HERO: HeroConfig = {
  stack: [],
  stackOnMobile: false,
  tiles: [],
  sparkles: 9,
};

export const DEFAULT_STATS: StatsConfig = {
  tiles: ['stars', 'repos', 'followers', 'streak'],
};

export const DEFAULT_LANGUAGES: LanguagesConfig = { count: 5 };

export const DEFAULT_CONTRIBUTIONS: ContributionsConfig = { snake: true };

export const DEFAULT_TEXT: TextConfig = {
  statsTitle: 'GitHub activity',
  statsCaption: 'synced {date} · {scope}',
  scopePrivate: 'incl. private',
  scopePublic: 'public only',
  contributionsUnit: 'contributions',
  activeDays: '{days} active days · {percent}% of the year',
  statStars: 'Stars earned',
  statRepos: 'Public repos',
  statFollowers: 'Followers',
  statStreak: 'Day streak · best {best}',
  statCommits: 'Commits this year',
  statPullRequests: 'Pull requests',
  statActiveDays: 'Active days',
  statContributions: 'Contributions',
  languagesTitle: 'Languages',
  languagesCaption: 'by bytes · own source repos',
  contributionsTitle: 'Contributions · last 12 months',
  contributionsCaption: '{contributions} contributions · {scope}',
  calendarScopePrivate: 'public + private',
  calendarScopePublic: 'public only',
  legendLess: 'Less',
  legendMore: 'More',
  heroAlt: '{name} — {title}',
};

/** Every figure the activity grid knows how to draw. */
export const STAT_TILE_IDS: readonly StatTileId[] = [
  'stars',
  'repos',
  'followers',
  'streak',
  'commits',
  'pullRequests',
  'activeDays',
  'contributions',
];

/**
 * Button colours for the social networks whose brands are well known. A link
 * with an unlisted id falls back to {@link FALLBACK_BRAND} unless the config
 * gives it a gradient of its own.
 */
export const BRAND_GRADIENTS: Readonly<
  Record<string, { readonly gradient: readonly string[]; readonly angle: number }>
> = {
  instagram: { gradient: ['#f9ce34', '#ee2a7b', '#6228d7'], angle: 45 },
  linkedin: { gradient: ['#0a66c2', '#0a66c2'], angle: 0 },
  x: { gradient: ['#1d1d1f', '#000000'], angle: 45 },
  github: { gradient: ['#3a3a3c', '#1d1d1f'], angle: 45 },
  mastodon: { gradient: ['#6364ff', '#563acc'], angle: 45 },
  youtube: { gradient: ['#ff0000', '#c4302b'], angle: 45 },
  telegram: { gradient: ['#37aee2', '#1e96c8'], angle: 45 },
  bluesky: { gradient: ['#0a7aff', '#0560d0'], angle: 45 },
  dribbble: { gradient: ['#ea4c89', '#c32361'], angle: 45 },
  medium: { gradient: ['#1d1d1f', '#000000'], angle: 45 },
};

export const FALLBACK_BRAND = { gradient: ['#5ac8fa', '#bf5af2'], angle: 45 } as const;
