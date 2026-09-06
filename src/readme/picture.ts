/**
 * @module readme/picture
 * Emits the `<picture>` markup GitHub needs to pick an asset variant.
 *
 * Two axes are selected in the markup: the colour scheme, and the width of
 * the viewer's screen. GitHub's markdown pipeline keeps `media` on `<source>`
 * verbatim, so a phone gets the tall layout of the same widget while a laptop
 * gets the wide one. The narrow sources come first because the first source
 * whose media query matches wins.
 *
 * Sizing is left to the images themselves wherever possible: each `<svg>`
 * carries an intrinsic width, and GitHub's `img{max-width:100%}` shrinks it on
 * anything narrower. A card that asks for less than half the column therefore
 * shares a row on a laptop and takes the full width on a phone, with no width
 * attribute in the markup — which is the only place a media query cannot
 * reach.
 */

import type { AssetRenderer, ThemeName, Viewport } from '../core/types.ts';
import { assetPath } from '../pipeline/build.ts';

export interface PictureOptions {
  /** Explicit width attribute; omit to let the asset's intrinsic size decide. */
  readonly width?: number | string;
  readonly height?: number;
  /** Wraps the picture in a link. */
  readonly href?: string;
  readonly alt: string;
  /** Viewport width below which the phone variant is used; omit to disable it. */
  readonly mobileBreakpoint?: number | undefined;
}

const SCHEMES: readonly ThemeName[] = ['dark', 'light'];

function source(id: string, theme: ThemeName, viewport: Viewport, media: string): string {
  return `<source media="${media}" srcset="${assetPath(id, theme, viewport)}">`;
}

/** Markup for one asset, ready to paste into README.md. */
export function picture(
  renderer: Pick<AssetRenderer, 'id' | 'viewports'>,
  options: PictureOptions,
): string {
  const { id } = renderer;
  const sources: string[] = [];
  const compact = options.mobileBreakpoint !== undefined && renderer.viewports.includes('compact');
  if (compact) {
    for (const theme of SCHEMES) {
      sources.push(
        source(
          id,
          theme,
          'compact',
          `(prefers-color-scheme: ${theme}) and (max-width: ${String(options.mobileBreakpoint)}px)`,
        ),
      );
    }
  }
  for (const theme of SCHEMES) {
    sources.push(source(id, theme, 'wide', `(prefers-color-scheme: ${theme})`));
  }
  const size = [
    options.width === undefined ? '' : ` width="${String(options.width)}"`,
    options.height === undefined ? '' : ` height="${String(options.height)}"`,
  ].join('');
  // One line, no whitespace between elements: inside a link, whitespace text
  // nodes would render as an underlined stray dash.
  const markup =
    '<picture>' +
    sources.join('') +
    `<img alt="${options.alt}" src="${assetPath(id, 'dark')}"${size}>` +
    '</picture>';
  return options.href === undefined ? markup : `<a href="${options.href}">${markup}</a>`;
}
