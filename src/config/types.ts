/**
 * @module config/types
 * The shape of `data/config.json` after defaults have been applied.
 *
 * Every value a viewer can see — copy, order, colours, which widgets exist —
 * is declared here, so forking the repository never means editing TypeScript.
 * The raw file may omit anything with a sensible default; {@link parseConfig}
 * fills the gaps and returns the resolved structure below.
 */

/** Where an asset is rendered: the wide README column, or a phone. */
export type Viewport = 'wide' | 'compact';

/** Blocks the README is assembled from, in the order they are listed. */
export type SectionId = 'hero' | 'activity' | 'projects' | 'contributions' | 'contact';

/** Figures the activity card can show in its tile grid. */
export type StatTileId =
  | 'stars'
  | 'repos'
  | 'followers'
  | 'streak'
  | 'commits'
  | 'pullRequests'
  | 'activeDays'
  | 'contributions';

/** Static facts about the person. */
export interface ProfileConfig {
  /** GitHub login; also the account the stats are fetched for. */
  readonly login: string;
  readonly name: string;
  readonly title: string;
  /** Shown above the name; empty string hides the line. */
  readonly location: string;
  /** Lines the hero types out one after another. Empty hides the prompt. */
  readonly taglines: readonly string[];
}

/** One chip under the hero tagline. */
export interface StackItem {
  /** simple-icons slug, e.g. `swift`. */
  readonly slug: string;
  readonly label: string;
  /** Icon colour; defaults to the brand colour, then the theme accent. */
  readonly color?: string | undefined;
}

/** One floating app tile in the hero cluster. */
export interface HeroTile {
  readonly slug: string;
  /** Two-stop gradient, top-left to bottom-right. Defaults to the brand colour. */
  readonly gradient?: readonly [string, string] | undefined;
  /** Relative weight of the tile, 0.6–1.4. Drives its size in the cluster. */
  readonly scale?: number | undefined;
}

export interface HeroConfig {
  readonly stack: readonly StackItem[];
  /**
   * Whether the chips also appear on a phone. Off by default: the tiles below
   * them already name the same stack, and two rows of chips crowd the card.
   */
  readonly stackOnMobile: boolean;
  readonly tiles: readonly HeroTile[];
  /** Number of drifting sparkles behind the cluster; 0 disables them. */
  readonly sparkles: number;
}

export interface StatsConfig {
  /** Up to four figures, laid out in a 2×2 grid. */
  readonly tiles: readonly StatTileId[];
}

export interface LanguagesConfig {
  /** How many languages the donut and legend show. */
  readonly count: number;
}

/** One featured repository. */
export interface ProjectItem {
  readonly repo: string;
  readonly blurb: string;
  /** Owner of the repository; defaults to the profile login. */
  readonly owner?: string | undefined;
  /** Link target; defaults to `https://github.com/<owner>/<repo>`. */
  readonly url?: string | undefined;
}

export interface ProjectsConfig {
  readonly items: readonly ProjectItem[];
  /**
   * `row` gives every project the full column width, which reads well on a
   * phone. `grid` keeps two cards per row at their natural width; they fall
   * back to one per row whenever the column is too narrow for both.
   */
  readonly layout: 'row' | 'grid';
}

export interface ContributionsConfig {
  /** Whether the snake hunts across the calendar. */
  readonly snake: boolean;
}

/** One social button on the contact strip. */
export interface LinkItem {
  readonly id: string;
  readonly label: string;
  readonly url: string;
  /** Icon slug; defaults to `id`. */
  readonly icon?: string | undefined;
  /** Button gradient. Defaults to the brand colours, then a theme accent. */
  readonly gradient?: readonly string[] | undefined;
  /** Gradient angle in degrees. Default 45. */
  readonly angle?: number | undefined;
}

export interface AppearanceConfig {
  /** Palette variant id from `src/theme/tokens.ts`. */
  readonly palette: string;
  /** Corner radius of every card frame. */
  readonly radius: number;
  readonly mobile: {
    /** Render and reference phone-sized variants of every asset. */
    readonly enabled: boolean;
    /** Viewport width, in CSS pixels, below which they are used. */
    readonly breakpoint: number;
  };
}

/**
 * Every string a viewer reads. `{placeholders}` are substituted with the
 * values named in each comment, so the copy can be reworded or translated
 * without touching a renderer.
 */
export interface TextConfig {
  readonly statsTitle: string;
  /** `{date}`, `{scope}` */
  readonly statsCaption: string;
  readonly scopePrivate: string;
  readonly scopePublic: string;
  readonly contributionsUnit: string;
  /** `{days}`, `{percent}` */
  readonly activeDays: string;
  readonly statStars: string;
  readonly statRepos: string;
  readonly statFollowers: string;
  /** `{best}` */
  readonly statStreak: string;
  readonly statCommits: string;
  readonly statPullRequests: string;
  readonly statActiveDays: string;
  readonly statContributions: string;
  readonly languagesTitle: string;
  readonly languagesCaption: string;
  readonly contributionsTitle: string;
  /** `{contributions}`, `{scope}` */
  readonly contributionsCaption: string;
  readonly calendarScopePrivate: string;
  readonly calendarScopePublic: string;
  readonly legendLess: string;
  readonly legendMore: string;
  /** Alt text for the hero image. `{name}`, `{title}` */
  readonly heroAlt: string;
}

/** The resolved configuration renderers and the README generator read. */
export interface SiteConfig {
  readonly profile: ProfileConfig;
  readonly appearance: AppearanceConfig;
  readonly sections: readonly SectionId[];
  readonly hero: HeroConfig;
  readonly stats: StatsConfig;
  readonly languages: LanguagesConfig;
  readonly projects: ProjectsConfig;
  readonly contributions: ContributionsConfig;
  readonly links: readonly LinkItem[];
  readonly text: TextConfig;
}
