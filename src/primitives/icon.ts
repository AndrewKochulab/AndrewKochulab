/**
 * @module primitives/icon
 * Brand icons as inline paths. Resolves simple-icons slugs and a few
 * hand-authored glyphs for brands the library no longer ships.
 */

import * as simpleIcons from 'simple-icons';
import { el, num } from '../core/svg.ts';

/** Native viewBox size of every simple-icons path. */
const ICON_BOX = 24;

/** Glyphs not available in simple-icons, drawn in the same 24×24 box. */
const CUSTOM_PATHS: Readonly<Record<string, string>> = {
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
};

interface SimpleIcon {
  readonly path: string;
  readonly hex: string;
}

function isSimpleIcon(value: unknown): value is SimpleIcon {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SimpleIcon).path === 'string' &&
    typeof (value as SimpleIcon).hex === 'string'
  );
}

/** Looks up an icon path by slug; `undefined` when unknown. */
export function iconPath(slug: string): string | undefined {
  const custom = CUSTOM_PATHS[slug];
  if (custom !== undefined) return custom;
  const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
  const candidate: unknown = (simpleIcons as Record<string, unknown>)[key];
  return isSimpleIcon(candidate) ? candidate.path : undefined;
}

/** Brand colour for a simple-icons slug, as `#rrggbb`; `undefined` for custom or unknown icons. */
export function iconBrandColor(slug: string): string | undefined {
  const key = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
  const candidate: unknown = (simpleIcons as Record<string, unknown>)[key];
  return isSimpleIcon(candidate) ? `#${candidate.hex}` : undefined;
}

export interface IconOptions {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly fill: string;
  readonly attrs?: Readonly<Record<string, string | number | undefined>>;
}

/** Renders the icon for `slug` with its top-left corner at (`x`, `y`). Throws for unknown slugs. */
export function icon(slug: string, options: IconOptions): string {
  const d = iconPath(slug);
  if (d === undefined) throw new Error(`Unknown icon slug: ${slug}`);
  const scale = options.size / ICON_BOX;
  return el('path', {
    d,
    fill: options.fill,
    transform: `translate(${num(options.x)} ${num(options.y)}) scale(${num(scale)})`,
    ...options.attrs,
  });
}
