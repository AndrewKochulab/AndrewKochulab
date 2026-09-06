/**
 * @module readme/picture
 * Emits the `<picture>` markup GitHub needs to swap an asset between its
 * dark and light variants, using the same path convention as the build.
 */

import type { AssetRenderer } from '../core/types.ts';
import { assetPath } from '../pipeline/build.ts';

export interface PictureOptions {
  /** Rendered width attribute; omit for 100%. */
  readonly width?: number | string;
  readonly height?: number;
  /** Wraps the picture in a link. */
  readonly href?: string;
  readonly alt: string;
}

/** Markup for one asset, ready to paste into README.md. */
export function picture(renderer: Pick<AssetRenderer, 'id'>, options: PictureOptions): string {
  const dark = assetPath(renderer.id, 'dark');
  const light = assetPath(renderer.id, 'light');
  const size = [
    options.width === undefined ? '' : ` width="${String(options.width)}"`,
    options.height === undefined ? '' : ` height="${String(options.height)}"`,
  ].join('');
  // One line, no whitespace between elements: inside a link, whitespace text
  // nodes would render as an underlined stray dash.
  const markup =
    '<picture>' +
    `<source media="(prefers-color-scheme: dark)" srcset="${dark}">` +
    `<source media="(prefers-color-scheme: light)" srcset="${light}">` +
    `<img alt="${options.alt}" src="${dark}"${size}>` +
    '</picture>';
  return options.href === undefined ? markup : `<a href="${options.href}">${markup}</a>`;
}
