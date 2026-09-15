/**
 * @module pipeline/blank
 * A 1×1 transparent image.
 *
 * Markdown has nowhere to put a media query except `<source media>`, so a
 * section that phones should not see cannot simply be dropped from the page:
 * the `<img>` is always there. Pointing the narrow source at this file is the
 * one way to make the block disappear below the breakpoint — the picture
 * resolves to something with no ink and next to no size.
 */

/** Where the build writes it, relative to the repository root. */
export const BLANK_PATH = 'assets/blank.svg';

/** The document itself: no colour, no animation, one user unit square. */
export function blankSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="1" height="1" role="presentation" aria-hidden="true"><title>Hidden on this screen</title></svg>';
}
