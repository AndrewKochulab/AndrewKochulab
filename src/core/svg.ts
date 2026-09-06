/**
 * @module core/svg
 * A minimal, dependency-free SVG element builder.
 *
 * Every byte of SVG in this project is produced through {@link el} so that
 * escaping, attribute formatting and document framing live in one place.
 */

/** Attribute values accepted by {@link el}. `undefined`/`null`/`false` drop the attribute. */
export type AttrValue = string | number | boolean | undefined | null;
export type Attrs = Readonly<Record<string, AttrValue>>;
export type Children = string | readonly string[] | undefined;

/** Escapes text for use as element content or attribute value. */
export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Formats a number for an attribute: at most 3 decimals, no trailing zeros. */
export function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
}

function formatAttrs(attrs: Attrs): string {
  const parts: string[] = [];
  for (const [key, raw] of Object.entries(attrs)) {
    if (raw === undefined || raw === null || raw === false) continue;
    const value = raw === true ? '' : typeof raw === 'number' ? num(raw) : escapeXml(raw);
    parts.push(raw === true ? key : `${key}="${value}"`);
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

/**
 * Builds one element. Children are inserted verbatim (they are already SVG);
 * use {@link text} for human-readable strings.
 */
export function el(tag: string, attrs: Attrs = {}, children?: Children): string {
  const inner = joinChildren(children);
  return inner === ''
    ? `<${tag}${formatAttrs(attrs)}/>`
    : `<${tag}${formatAttrs(attrs)}>${inner}</${tag}>`;
}

/** Flattens `Children` into one string. */
export function joinChildren(children: Children): string {
  if (children === undefined) return '';
  return typeof children === 'string' ? children : children.join('');
}

/** A `<text>` element with escaped content. */
export function text(content: string, attrs: Attrs = {}): string {
  return el('text', attrs, escapeXml(content));
}

/** A `<style>` element wrapping raw CSS. */
export function style(css: string): string {
  return el('style', {}, css);
}

/** Groups children under `<g>`; a convenience over `el('g', …)`. */
export function g(attrs: Attrs, children: Children): string {
  return el('g', attrs, children);
}

export interface DocumentOptions {
  readonly width: number;
  readonly height: number;
  /** Accessible name announced by screen readers. */
  readonly title: string;
  /** Contents of `<defs>` (gradients, filters, clip paths). */
  readonly defs?: readonly string[];
  /** CSS placed in a `<style>` element at the top of the document. */
  readonly css?: string;
  readonly children: readonly string[];
}

/**
 * Frames content as a complete, standalone SVG document with a `viewBox`,
 * an accessible `<title>`, optional `<defs>` and `<style>`.
 */
export function svgDocument(options: DocumentOptions): string {
  const { width, height, title, defs = [], css, children } = options;
  const head = [
    el('title', {}, escapeXml(title)),
    css === undefined ? '' : style(css),
    defs.length > 0 ? el('defs', {}, defs) : '',
  ];
  return el(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: `0 0 ${num(width)} ${num(height)}`,
      width,
      height,
      role: 'img',
      'aria-label': title,
    },
    [...head, ...children],
  );
}

/** Formats a count compactly the way GitHub does: 950 → "950", 1234 → "1.2k", 12345 → "12.3k". */
export function compact(value: number): string {
  if (value < 1000) return String(value);
  const thousands = value / 1000;
  const digits = thousands < 10 ? 1 : thousands < 100 ? 1 : 0;
  return `${thousands.toFixed(digits).replace(/\.0$/, '')}k`;
}

/** Formats an integer with thousands separators: 1234 → "1,234". */
export function grouped(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}
