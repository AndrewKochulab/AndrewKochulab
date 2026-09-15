/**
 * @module core/fragment
 * A renderable piece of an SVG document.
 *
 * Primitives return fragments so that the `<defs>` and CSS they need travel
 * with their markup; the renderer merges them into one document.
 */

export interface Fragment {
  /** Markup placed in the document body. */
  readonly body: string;
  /** Entries for `<defs>` (gradients, filters, clip paths). */
  readonly defs?: readonly string[] | undefined;
  /** CSS rules for the document `<style>`. */
  readonly css?: string | undefined;
}

/** A fragment with every part present. */
export interface MergedFragment {
  readonly body: string;
  readonly defs: readonly string[];
  readonly css: string;
}

/** Merges fragments in order, concatenating bodies, defs and CSS. */
export function combine(...fragments: readonly Fragment[]): MergedFragment {
  return {
    body: fragments.map((f) => f.body).join(''),
    defs: fragments.flatMap((f) => f.defs ?? []),
    css: fragments
      .map((f) => f.css)
      .filter((css): css is string => css !== undefined && css !== '')
      .join('\n'),
  };
}

/** Wraps plain markup as a fragment with no defs or CSS. */
export function markup(body: string): Fragment {
  return { body };
}
