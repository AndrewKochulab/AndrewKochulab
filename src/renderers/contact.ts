/**
 * @module renderers/contact
 * One button per social link, dressed in that network's own brand colours:
 * Instagram's sunset gradient, LinkedIn's blue. White mark and label, a soft
 * shadow and a periodic sheen.
 */

import { ANIM, animationCss } from '../core/animation.ts';
import { el, num, svgDocument } from '../core/svg.ts';
import { layoutText, outlineText } from '../core/text.ts';
import type { LinkItem } from '../config/types.ts';
import type { AssetRenderer } from '../core/types.ts';
import { FALLBACK_BRAND } from '../config/defaults.ts';
import { icon } from '../primitives/icon.ts';

const HEIGHT = 46;
const FONT_SIZE = 15;
const PAD_X = 20;
const ICON = 20;
const GAP = 10;
const SHADOW = 10;

/**
 * Creates the renderer for one contact button. Colours come from the link's
 * own `gradient`/`angle`, which `config/parse` has already filled in from the
 * known brands where the config stayed silent.
 */
export function createContactRenderer(link: LinkItem): AssetRenderer {
  const label = layoutText(link.label, { font: 'displaySemiBold', size: FONT_SIZE });
  const buttonWidth = Math.ceil(PAD_X + ICON + GAP + label.width + PAD_X);
  const width = buttonWidth + SHADOW * 2;
  const height = HEIGHT + SHADOW * 2;
  const stops = link.gradient ?? FALLBACK_BRAND.gradient;
  const brand = { stops, angle: link.angle ?? FALLBACK_BRAND.angle };
  const renderer: AssetRenderer = {
    id: `contact-${link.id}`,
    // A button is already phone-sized; one variant serves both viewports.
    viewports: ['wide'],
    size: () => ({ width, height, display: width }),
    render(ctx) {
      const gradientId = `brand-${link.id}`;
      const rad = (brand.angle * Math.PI) / 180;
      const defs = [
        el(
          'linearGradient',
          {
            id: gradientId,
            x1: num(0.5 - Math.cos(rad) / 2),
            y1: num(0.5 + Math.sin(rad) / 2),
            x2: num(0.5 + Math.cos(rad) / 2),
            y2: num(0.5 - Math.sin(rad) / 2),
          },
          brand.stops.map((color, i) =>
            el('stop', {
              offset: num(i / Math.max(1, brand.stops.length - 1)),
              'stop-color': color,
            }),
          ),
        ),
        el('linearGradient', { id: 'sheen', x1: '0', y1: '0', x2: '0', y2: '1' }, [
          el('stop', { offset: '0', 'stop-color': '#ffffff', 'stop-opacity': 0.28 }),
          el('stop', { offset: '0.5', 'stop-color': '#ffffff', 'stop-opacity': 0.04 }),
          el('stop', { offset: '1', 'stop-color': '#ffffff', 'stop-opacity': 0 }),
        ]),
        el(
          'filter',
          { id: 'shadow', x: '-20%', y: '-40%', width: '140%', height: '200%' },
          el('feGaussianBlur', { stdDeviation: 5 }),
        ),
        el(
          'clipPath',
          { id: 'button-clip' },
          el('rect', { width: buttonWidth, height: HEIGHT, rx: HEIGHT / 2 }),
        ),
      ];
      const shape = { width: buttonWidth, height: HEIGHT, rx: HEIGHT / 2 };
      const body = el('g', { transform: `translate(${SHADOW} ${SHADOW})` }, [
        el('g', { class: ANIM.pop, style: 'animation-delay:80ms' }, [
          el('rect', {
            ...shape,
            y: 4,
            fill: brand.stops[Math.floor(brand.stops.length / 2)] ?? '#000',
            opacity: ctx.theme.name === 'dark' ? 0.5 : 0.35,
            filter: 'url(#shadow)',
          }),
          el('rect', { ...shape, fill: `url(#${gradientId})` }),
          el('rect', { ...shape, fill: 'url(#sheen)' }),
          el('rect', {
            x: 0.5,
            y: 0.5,
            width: buttonWidth - 1,
            height: HEIGHT - 1,
            rx: HEIGHT / 2 - 0.5,
            fill: 'none',
            stroke: '#ffffff',
            'stroke-opacity': 0.25,
          }),
          icon(link.icon ?? link.id, {
            x: PAD_X,
            y: (HEIGHT - ICON) / 2,
            size: ICON,
            fill: '#ffffff',
          }),
          outlineText(link.label, {
            font: 'displaySemiBold',
            size: FONT_SIZE,
            x: PAD_X + ICON + GAP,
            y: HEIGHT / 2 + label.metrics.capHeight / 2,
            fill: '#ffffff',
          }),
          el(
            'g',
            { 'clip-path': 'url(#button-clip)' },
            el(
              'g',
              { transform: 'skewX(-20)' },
              el('rect', {
                x: 0,
                y: 0,
                width: 34,
                height: HEIGHT,
                fill: '#ffffff',
                opacity: 0.18,
                class: ANIM.sweep,
                style: `--from:-80px;--to:${num(buttonWidth + 60)}px;--period:6000ms`,
              }),
            ),
          ),
        ]),
      ]);
      return svgDocument({
        width,
        height,
        title: `${link.label}: ${link.url}`,
        defs,
        css: animationCss(),
        children: [body],
      });
    },
  };
  return renderer;
}
