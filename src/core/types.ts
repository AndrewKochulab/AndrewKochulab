/**
 * @module core/types
 * Shared domain types for the profile generator.
 *
 * Everything that crosses a module boundary is declared here so that
 * renderers, data sources and the pipeline agree on one vocabulary.
 */

import type { SiteConfig, Viewport } from '../config/types.ts';

export type { Viewport } from '../config/types.ts';

/** The two colour schemes GitHub can render a README in. */
export type ThemeName = 'dark' | 'light';

/** Colour tokens for one theme. Values are CSS colour strings. */
export interface Palette {
  /** Two-stop background gradient (top-left → bottom-right). */
  readonly background: { readonly from: string; readonly to: string };
  /** Fill for raised surfaces such as cards and pills. */
  readonly surface: string;
  /** 1px border for surfaces. */
  readonly surfaceBorder: string;
  /** Thin highlight along the top edge of glass surfaces. */
  readonly highlight: string;
  /** Text colours by emphasis. */
  readonly text: { readonly primary: string; readonly secondary: string; readonly muted: string };
  /** Vivid accents in the spirit of Apple's system colours: blue, purple, pink, orange. */
  readonly accent: {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly warm: string;
  };
  /** Soft glow colour used behind accent elements. */
  readonly glow: string;
  /** Peak opacity of the aurora blobs on a standard card; renderers scale it. */
  readonly ambient: number;
  /** Semantic "good" colour (streaks, growth). */
  readonly positive: string;
}

/** Font stacks used for live `<text>` (outlined text embeds its own glyphs). */
export interface Typography {
  readonly sans: string;
  readonly mono: string;
}

/** A complete theme: identity plus every design token a renderer may need. */
export interface Theme {
  readonly name: ThemeName;
  readonly palette: Palette;
  readonly typography: Typography;
  /** Corner radius used by the outermost frame of every asset. */
  readonly radius: number;
}

/** Live numbers for one repository. */
export interface RepoStats {
  readonly stars: number;
  readonly forks: number;
  readonly language: string | null;
  readonly languageColor: string | null;
}

/** Share of one language across the user's own source repositories. */
export interface LanguageShare {
  readonly name: string;
  readonly color: string;
  readonly bytes: number;
  /** 0–100, rounded to one decimal. */
  readonly percent: number;
}

/** One day of the contribution calendar. `level` is GitHub's 0–4 intensity bucket. */
export interface CalendarCell {
  readonly date: string;
  readonly count: number;
  readonly level: 0 | 1 | 2 | 3 | 4;
}

/** Contribution streaks derived from the calendar. Lengths are in days. */
export interface Streaks {
  readonly current: number;
  readonly longest: number;
}

/** Everything the CI fetch step learns from GitHub, persisted as `data/stats.json`. */
export interface StatsSnapshot {
  /** ISO-8601 timestamp of the fetch. */
  readonly generatedAt: string;
  /** Whether private contributions were visible to the token that fetched. */
  readonly scope: 'public' | 'private-included';
  readonly followers: number;
  readonly publicRepos: number;
  readonly starsEarned: number;
  readonly contributionsLastYear: number;
  /** Days in the last year with at least one contribution. */
  readonly activeDaysLastYear: number;
  readonly commitsLastYear: number;
  readonly pullRequestsLastYear: number;
  readonly streaks: Streaks;
  /** The last year of days, oldest first, as GitHub lays them out (weeks of 7). */
  readonly calendar: readonly CalendarCell[];
  readonly languages: readonly LanguageShare[];
  /** Keyed by repository name (without owner). */
  readonly repos: Readonly<Record<string, RepoStats>>;
}

/** All data a renderer may read. Assembled once per build. */
export interface ProfileData {
  /** The resolved contents of `data/config.json`. */
  readonly config: SiteConfig;
  readonly stats: StatsSnapshot;
}

/** What a renderer receives: the theme, the data, and the width it is drawn for. */
export interface RenderContext {
  readonly theme: Theme;
  readonly data: ProfileData;
  /** `wide` for the README column, `compact` for phones. */
  readonly viewport: Viewport;
}

/** The viewBox of one asset variant, plus the CSS size it is served at. */
export interface AssetSize {
  /** User units of the viewBox. */
  readonly width: number;
  readonly height: number;
  /**
   * Intrinsic width in CSS pixels, written into the `width` attribute of the
   * `<svg>` root. It decides how much room the image asks for in the README,
   * and therefore whether two cards share a row; `max-width:100%` in GitHub's
   * stylesheet shrinks it on anything narrower.
   */
  readonly display: number;
}

/**
 * A pure producer of one SVG asset. The pipeline calls `render` once per
 * viewport and theme, writing to `assets/<id>[-mobile]-<theme>.svg`.
 */
export interface AssetRenderer {
  /** Stable identifier; becomes part of the output file name. */
  readonly id: string;
  /** Viewports this asset has a layout for. A missing `compact` reuses `wide`. */
  readonly viewports: readonly Viewport[];
  /** Geometry for one viewport. */
  size(viewport: Viewport): AssetSize;
  render(ctx: RenderContext): string;
}
