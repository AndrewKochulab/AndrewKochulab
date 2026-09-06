/**
 * @module config/parse
 * Turns the raw `data/config.json` document into a {@link SiteConfig}.
 *
 * Errors name the exact JSON path that is wrong, because the file is the one
 * thing a fork is expected to edit and a stack trace is no help there.
 */

import {
  BRAND_GRADIENTS,
  DEFAULT_APPEARANCE,
  DEFAULT_CONTRIBUTIONS,
  DEFAULT_HERO,
  DEFAULT_LANGUAGES,
  DEFAULT_SECTIONS,
  DEFAULT_STATS,
  DEFAULT_TEXT,
  STAT_TILE_IDS,
} from './defaults.ts';
import type {
  AppearanceConfig,
  ContributionsConfig,
  HeroConfig,
  HeroTile,
  LanguagesConfig,
  LinkItem,
  ProfileConfig,
  ProjectItem,
  ProjectsConfig,
  SectionId,
  SiteConfig,
  StackItem,
  StatTileId,
  StatsConfig,
  TextConfig,
} from './types.ts';

/** Thrown when the config file cannot be understood. */
export class ConfigError extends Error {
  constructor(path: string, message: string) {
    super(`data/config.json: ${path} ${message}`);
    this.name = 'ConfigError';
  }
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(value: unknown, path: string): Json {
  if (value === undefined) return {};
  if (!isObject(value)) throw new ConfigError(path, 'must be an object');
  return value;
}

function requiredString(source: Json, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigError(`${path}.${key}`, 'is required and must be a non-empty string');
  }
  return value;
}

function optionalString(source: Json, key: string, path: string): string | undefined {
  const value = source[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new ConfigError(`${path}.${key}`, 'must be a string');
  return value;
}

function stringOr(source: Json, key: string, path: string, fallback: string): string {
  return optionalString(source, key, path) ?? fallback;
}

function booleanOr(source: Json, key: string, path: string, fallback: boolean): boolean {
  const value = source[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new ConfigError(`${path}.${key}`, 'must be true or false');
  return value;
}

function numberOr(
  source: Json,
  key: string,
  path: string,
  fallback: number,
  range: { readonly min: number; readonly max: number },
): number {
  const value = source[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ConfigError(`${path}.${key}`, 'must be a number');
  }
  if (value < range.min || value > range.max) {
    throw new ConfigError(`${path}.${key}`, `must be between ${range.min} and ${range.max}`);
  }
  return value;
}

function array(value: unknown, path: string): readonly unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ConfigError(path, 'must be an array');
  return value;
}

function stringArray(value: unknown, path: string): readonly string[] {
  return array(value, path).map((entry, index) => {
    if (typeof entry !== 'string') throw new ConfigError(`${path}[${index}]`, 'must be a string');
    return entry;
  });
}

function oneOf<T extends string>(value: string, allowed: readonly T[], path: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ConfigError(path, `must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

function profile(raw: unknown): ProfileConfig {
  const source = object(raw, 'profile');
  if (Object.keys(source).length === 0) throw new ConfigError('profile', 'is required');
  return {
    login: requiredString(source, 'login', 'profile'),
    name: requiredString(source, 'name', 'profile'),
    title: stringOr(source, 'title', 'profile', ''),
    location: stringOr(source, 'location', 'profile', ''),
    taglines: stringArray(source['taglines'], 'profile.taglines'),
  };
}

function appearance(raw: unknown): AppearanceConfig {
  const source = object(raw, 'appearance');
  const mobile = object(source['mobile'], 'appearance.mobile');
  return {
    palette: stringOr(source, 'palette', 'appearance', DEFAULT_APPEARANCE.palette),
    radius: numberOr(source, 'radius', 'appearance', DEFAULT_APPEARANCE.radius, {
      min: 0,
      max: 64,
    }),
    mobile: {
      enabled: booleanOr(mobile, 'enabled', 'appearance.mobile', DEFAULT_APPEARANCE.mobile.enabled),
      breakpoint: numberOr(
        mobile,
        'breakpoint',
        'appearance.mobile',
        DEFAULT_APPEARANCE.mobile.breakpoint,
        { min: 200, max: 1600 },
      ),
    },
  };
}

const SECTION_IDS: readonly SectionId[] = [
  'hero',
  'activity',
  'projects',
  'contributions',
  'contact',
];

function sections(raw: unknown): readonly SectionId[] {
  if (raw === undefined) return DEFAULT_SECTIONS;
  const listed = stringArray(raw, 'sections');
  return listed.map((entry, index) => oneOf(entry, SECTION_IDS, `sections[${index}]`));
}

function stack(raw: unknown): readonly StackItem[] {
  return array(raw, 'hero.stack').map((entry, index) => {
    const path = `hero.stack[${index}]`;
    const source = object(entry, path);
    const slug = requiredString(source, 'slug', path);
    return {
      slug,
      label: stringOr(source, 'label', path, slug),
      color: optionalString(source, 'color', path),
    };
  });
}

function tiles(raw: unknown): readonly HeroTile[] {
  return array(raw, 'hero.tiles').map((entry, index) => {
    const path = `hero.tiles[${index}]`;
    const source = object(entry, path);
    const gradient =
      source['gradient'] === undefined
        ? undefined
        : stringArray(source['gradient'], `${path}.gradient`);
    if (gradient !== undefined && gradient.length !== 2) {
      throw new ConfigError(`${path}.gradient`, 'must hold exactly two colours');
    }
    return {
      slug: requiredString(source, 'slug', path),
      gradient:
        gradient === undefined ? undefined : ([gradient[0], gradient[1]] as [string, string]),
      scale:
        source['scale'] === undefined
          ? undefined
          : numberOr(source, 'scale', path, 1, { min: 0.5, max: 1.6 }),
    };
  });
}

function hero(raw: unknown): HeroConfig {
  const source = object(raw, 'hero');
  return {
    stack: stack(source['stack']),
    tiles: tiles(source['tiles']),
    sparkles: numberOr(source, 'sparkles', 'hero', DEFAULT_HERO.sparkles, { min: 0, max: 40 }),
  };
}

function stats(raw: unknown): StatsConfig {
  const source = object(raw, 'stats');
  if (source['tiles'] === undefined) return DEFAULT_STATS;
  const listed = stringArray(source['tiles'], 'stats.tiles').map((entry, index) =>
    oneOf<StatTileId>(entry, STAT_TILE_IDS, `stats.tiles[${index}]`),
  );
  if (listed.length === 0) throw new ConfigError('stats.tiles', 'must list at least one figure');
  return { tiles: listed.slice(0, 4) };
}

function languages(raw: unknown): LanguagesConfig {
  const source = object(raw, 'languages');
  return {
    count: numberOr(source, 'count', 'languages', DEFAULT_LANGUAGES.count, { min: 1, max: 6 }),
  };
}

function projects(raw: unknown, login: string): ProjectsConfig {
  const source = object(raw, 'projects');
  const items: ProjectItem[] = array(source['items'], 'projects.items').map((entry, index) => {
    const path = `projects.items[${index}]`;
    const item = object(entry, path);
    const repo = requiredString(item, 'repo', path);
    const owner = optionalString(item, 'owner', path) ?? login;
    return {
      repo,
      blurb: stringOr(item, 'blurb', path, ''),
      owner,
      url: optionalString(item, 'url', path) ?? `https://github.com/${owner}/${repo}`,
    };
  });
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.repo.toLowerCase();
    if (seen.has(key)) throw new ConfigError('projects.items', `lists "${item.repo}" twice`);
    seen.add(key);
  }
  return {
    items,
    layout: oneOf(
      stringOr(source, 'layout', 'projects', 'row'),
      ['row', 'grid'],
      'projects.layout',
    ),
  };
}

function contributions(raw: unknown): ContributionsConfig {
  const source = object(raw, 'contributions');
  return {
    snake: booleanOr(source, 'snake', 'contributions', DEFAULT_CONTRIBUTIONS.snake),
  };
}

function links(raw: unknown): readonly LinkItem[] {
  return array(raw, 'links').map((entry, index) => {
    const path = `links[${index}]`;
    const source = object(entry, path);
    const id = requiredString(source, 'id', path);
    const brand = BRAND_GRADIENTS[id];
    const gradient =
      source['gradient'] === undefined
        ? brand?.gradient
        : stringArray(source['gradient'], `${path}.gradient`);
    if (gradient?.length === 0) {
      throw new ConfigError(`${path}.gradient`, 'must hold at least one colour');
    }
    return {
      id,
      label: stringOr(source, 'label', path, id),
      url: requiredString(source, 'url', path),
      icon: optionalString(source, 'icon', path) ?? id,
      gradient,
      angle:
        source['angle'] === undefined
          ? brand?.angle
          : numberOr(source, 'angle', path, 45, { min: -360, max: 360 }),
    };
  });
}

function text(raw: unknown): TextConfig {
  const source = object(raw, 'text');
  const resolved: Record<string, string> = { ...DEFAULT_TEXT };
  for (const [key, value] of Object.entries(source)) {
    if (!Object.hasOwn(DEFAULT_TEXT, key)) {
      throw new ConfigError(`text.${key}`, `is not a known string; see docs/CONFIGURATION.md`);
    }
    if (typeof value !== 'string') throw new ConfigError(`text.${key}`, 'must be a string');
    resolved[key] = value;
  }
  return resolved as unknown as TextConfig;
}

/** Validates a parsed JSON document and fills in every default. */
export function parseConfig(raw: unknown): SiteConfig {
  if (!isObject(raw)) throw new ConfigError('document', 'must be a JSON object');
  const person = profile(raw['profile']);
  return {
    profile: person,
    appearance: appearance(raw['appearance']),
    sections: sections(raw['sections']),
    hero: hero(raw['hero']),
    stats: stats(raw['stats']),
    languages: languages(raw['languages']),
    projects: projects(raw['projects'], person.login),
    contributions: contributions(raw['contributions']),
    links: links(raw['links']),
    text: text(raw['text']),
  };
}

/** Parses the JSON source of a config file. */
export function parseConfigJson(source: string): SiteConfig {
  let document: unknown;
  try {
    document = JSON.parse(source);
  } catch (error) {
    throw new ConfigError('document', `is not valid JSON (${(error as Error).message})`);
  }
  return parseConfig(document);
}
