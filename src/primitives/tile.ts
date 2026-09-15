/**
 * @module primitives/tile
 * An app-icon style tile: a squircle with a vivid gradient, a glossy top
 * highlight, a soft coloured shadow and a white brand mark. The visual
 * vocabulary of an App Store feature.
 */

import { el, num } from '../core/svg.ts';
import { icon } from './icon.ts';

export interface TileOptions {
  /** Centre of the tile. */
  readonly cx: number;
  readonly cy: number;
  readonly size: number;
  /** simple-icons slug drawn in white. */
  readonly slug: string;
  /** Two-stop gradient, top-left to bottom-right. */
  readonly gradient: readonly [string, string];
  /** Unique per document. */
  readonly id: string;
  /** Extra attributes for the group holding the tile (class, style). */
  readonly attrs?: Readonly<Record<string, string | number | undefined>>;
}

/** Path of a squircle (superellipse) centred at the origin. */
export function squirclePath(size: number): string {
  const r = size / 2;
  // Control point factor giving Apple's continuous-corner look.
  const k = 0.6;
  const c = r * k;
  return [
    `M 0 ${num(-r)}`,
    `C ${num(r - c)} ${num(-r)} ${num(r)} ${num(-(r - c))} ${num(r)} 0`,
    `C ${num(r)} ${num(r - c)} ${num(r - c)} ${num(r)} 0 ${num(r)}`,
    `C ${num(-(r - c))} ${num(r)} ${num(-r)} ${num(r - c)} ${num(-r)} 0`,
    `C ${num(-r)} ${num(-(r - c))} ${num(-(r - c))} ${num(-r)} 0 ${num(-r)}`,
    'Z',
  ].join(' ');
}

/** Renders a tile. Returns defs (gradients, shadow filter) and the body. */
export function tile(options: TileOptions): { readonly defs: string[]; readonly body: string } {
  const { cx, cy, size, slug, gradient, id } = options;
  const [from, to] = gradient;
  const gradientId = `tile-${id}`;
  const glossId = `tile-${id}-gloss`;
  const shadowId = `tile-${id}-shadow`;
  const defs = [
    el('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '1', y2: '1' }, [
      el('stop', { offset: '0', 'stop-color': from }),
      el('stop', { offset: '1', 'stop-color': to }),
    ]),
    el('linearGradient', { id: glossId, x1: '0', y1: '0', x2: '0', y2: '1' }, [
      el('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': 0.35 }),
      el('stop', { offset: '0.55', 'stop-color': '#ffffff', 'stop-opacity': 0 }),
    ]),
    el(
      'filter',
      { id: shadowId, x: '-60%', y: '-60%', width: '220%', height: '220%' },
      el('feGaussianBlur', { stdDeviation: size * 0.16 }),
    ),
  ];
  const d = squirclePath(size);
  const iconSize = size * 0.5;
  const body = el('g', { transform: `translate(${num(cx)} ${num(cy)})` }, [
    el('g', { ...options.attrs }, [
      el('path', {
        d,
        fill: to,
        opacity: 0.55,
        filter: `url(#${shadowId})`,
        transform: `translate(0 ${num(size * 0.16)})`,
      }),
      el('path', { d, fill: `url(#${gradientId})` }),
      el('path', { d, fill: `url(#${glossId})` }),
      el('path', {
        d,
        fill: 'none',
        stroke: '#ffffff',
        'stroke-opacity': 0.25,
        'stroke-width': 1,
        transform: 'scale(0.985)',
      }),
      icon(slug, { x: -iconSize / 2, y: -iconSize / 2, size: iconSize, fill: '#ffffff' }),
    ]),
  ]);
  return { defs, body };
}
