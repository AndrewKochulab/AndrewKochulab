/**
 * @module renderers/contributions
 * The last year of contributions as a calendar with a snake hunting through
 * it. Cells are coloured on a blue → purple → pink ramp. The snake always
 * heads for the nearest uneaten contribution, walks there one cell at a
 * time along the grid, and each cell it reaches pops and dims. At the end of
 * a lap the snake fades out, the calendar regrows, and the hunt restarts.
 *
 * Snake and cells are both driven by SMIL (`animateMotion` and `animate`),
 * which every browser runs inside `<img>` SVGs on one shared timeline, so
 * the eating can never drift out of step with the head. Reduced-motion
 * viewers get the calendar without the snake.
 */

import { ANIM } from '../core/animation.ts';
import { format } from '../config/format.ts';
import type { Fragment } from '../core/fragment.ts';
import { el, grouped, num } from '../core/svg.ts';
import { outlineText } from '../core/text.ts';
import type {
  AssetRenderer,
  AssetSize,
  CalendarCell,
  RenderContext,
  Theme,
  Viewport,
} from '../core/types.ts';
import { animated, assemble, eyebrow, pad } from './shared.ts';

const COLUMNS = 53;

/** Geometry of the calendar for one viewport. */
interface CalendarLayout extends AssetSize {
  readonly cell: number;
  readonly gap: number;
  readonly gridTop: number;
  readonly headerY: number;
  readonly headerSize: number;
  readonly headerSpacing: number;
  readonly captionSize: number;
  /** Put the caption on its own line, for headers that cannot share one. */
  readonly captionOwnLine: boolean;
  readonly monthSize: number;
  /** Draw a month label only every nth column that starts a month. */
  readonly monthEvery: number;
  readonly weekdays: boolean;
  readonly legendSize: number;
}

const WIDE: CalendarLayout = {
  width: 1200,
  height: 250,
  display: 880,
  cell: 16,
  gap: 4,
  gridTop: 74,
  headerY: 40,
  headerSize: 11,
  headerSpacing: 1.6,
  captionSize: 10.5,
  captionOwnLine: false,
  monthSize: 10,
  monthEvery: 1,
  weekdays: true,
  legendSize: 10,
};

const COMPACT: CalendarLayout = {
  width: 400,
  height: 172,
  display: 400,
  cell: 5.2,
  gap: 1.4,
  gridTop: 78,
  headerY: 30,
  headerSize: 9,
  headerSpacing: 1,
  captionSize: 8.5,
  captionOwnLine: true,
  monthSize: 8,
  monthEvery: 2,
  weekdays: false,
  legendSize: 8.5,
};

function layoutFor(viewport: Viewport): CalendarLayout {
  return viewport === 'compact' ? COMPACT : WIDE;
}

/** Step between column origins. */
function step(layout: CalendarLayout): number {
  return layout.cell + layout.gap;
}

/** Left edge of the grid, centred in the frame. */
function gridLeft(layout: CalendarLayout): number {
  return (layout.width - COLUMNS * step(layout) + layout.gap) / 2;
}
/** Milliseconds per one-cell step of the snake. */
const STEP_MS = 95;
/** A lap never takes longer than this; the step shortens if the hunt is long. */
const MAX_LAP_MS = 60000;
/** Pause at the end of a lap before the calendar regrows. */
const LAP_PAUSE = 2200;
/** Body blocks behind the head, each one step behind the previous. */
const BODY_SEGMENTS = 3;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS: Readonly<Record<number, string>> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };

/** A calendar cell placed on the grid. */
interface PlacedCell {
  readonly cell: CalendarCell;
  readonly column: number;
  readonly row: number;
  readonly x: number;
  readonly y: number;
}

/** Colours for levels 1–4. */
function ramp(theme: Theme): readonly string[] {
  const { accent } = theme.palette;
  return theme.name === 'dark'
    ? ['rgba(90,200,250,0.45)', accent.primary, accent.secondary, accent.tertiary]
    : ['#bfe3ff', accent.primary, accent.secondary, accent.tertiary];
}

/** Lays the calendar out in GitHub's column-per-week arrangement (weeks start on Sunday). */
export function placeCells(
  calendar: readonly CalendarCell[],
  layout: CalendarLayout = WIDE,
): PlacedCell[] {
  const first = calendar[0];
  if (first === undefined) return [];
  const offset = new Date(`${first.date}T00:00:00Z`).getUTCDay();
  const left = gridLeft(layout);
  const pitch = step(layout);
  return calendar.map((cell, index) => {
    const slot = index + offset;
    const column = Math.floor(slot / 7);
    const row = slot % 7;
    return { cell, column, row, x: left + column * pitch, y: layout.gridTop + row * pitch };
  });
}

/** A grid position the snake passes through (it may be an empty corner with no cell). */
export interface Step {
  readonly column: number;
  readonly row: number;
}

/** The snake's route for one lap and when each contribution cell is eaten. */
export interface Hunt {
  readonly steps: readonly Step[];
  /** Step index at which the cell at `column:row` is eaten. */
  readonly eatenAt: ReadonlyMap<string, number>;
}

const key = (column: number, row: number): string => `${column}:${row}`;

/**
 * Greedy hunt: from the current position, walk to the nearest contribution
 * cell (Manhattan distance, ties broken left to right), one cell per step,
 * covering the longer axis first so the route looks deliberate. Any
 * contribution passed over on the way is eaten too.
 */
export function huntPath(cells: readonly PlacedCell[]): Hunt {
  const food = new Set(
    cells.filter((cell) => cell.cell.level > 0).map((cell) => key(cell.column, cell.row)),
  );
  const start = cells[0] ?? { column: 0, row: 0 };
  let position: Step = { column: start.column, row: start.row };
  const steps: Step[] = [position];
  const eatenAt = new Map<string, number>();
  const eat = (at: Step): void => {
    const k = key(at.column, at.row);
    if (food.delete(k)) eatenAt.set(k, steps.length - 1);
  };
  eat(position);
  while (food.size > 0) {
    let target: Step | undefined;
    let best = Number.POSITIVE_INFINITY;
    for (const k of food) {
      const [column, row] = k.split(':').map(Number) as [number, number];
      const distance = Math.abs(column - position.column) + Math.abs(row - position.row);
      if (
        distance < best ||
        (distance === best && target !== undefined && column < target.column)
      ) {
        best = distance;
        target = { column, row };
      }
    }
    if (target === undefined) break;
    const dc = target.column - position.column;
    const dr = target.row - position.row;
    const axes: ('column' | 'row')[] =
      Math.abs(dc) >= Math.abs(dr) ? ['column', 'row'] : ['row', 'column'];
    for (const axis of axes) {
      const delta = axis === 'column' ? dc : dr;
      const direction = Math.sign(delta);
      for (let i = 0; i < Math.abs(delta); i += 1) {
        position =
          axis === 'column'
            ? { column: position.column + direction, row: position.row }
            : { column: position.column, row: position.row + direction };
        steps.push(position);
        eat(position);
      }
    }
  }
  return { steps, eatenAt };
}

/** Centre of a grid position in user units. */
function centre(at: Step, layout: CalendarLayout): { readonly x: number; readonly y: number } {
  const pitch = step(layout);
  return {
    x: gridLeft(layout) + at.column * pitch + layout.cell / 2,
    y: layout.gridTop + at.row * pitch + layout.cell / 2,
  };
}

function monthLabels(
  ctx: RenderContext,
  placed: readonly PlacedCell[],
  layout: CalendarLayout,
): string {
  const { palette } = ctx.theme;
  const seen = new Set<number>();
  const labels: string[] = [];
  let shown = 0;
  for (const item of placed) {
    const month = Number(item.cell.date.slice(5, 7)) - 1;
    const day = Number(item.cell.date.slice(8, 10));
    if (day > 7 || seen.has(item.column) || item.row !== 0) continue;
    seen.add(item.column);
    if (shown % layout.monthEvery !== 0) {
      shown += 1;
      continue;
    }
    shown += 1;
    labels.push(
      outlineText(MONTHS[month] ?? '', {
        font: 'mono',
        size: layout.monthSize,
        x: item.x,
        y: layout.gridTop - layout.monthSize - 2,
        fill: palette.text.muted,
      }),
    );
  }
  return labels.join('');
}

function weekdayLabels(ctx: RenderContext, layout: CalendarLayout): string {
  if (!layout.weekdays) return '';
  const { palette } = ctx.theme;
  return Object.entries(WEEKDAYS)
    .map(([row, label]) =>
      outlineText(label, {
        font: 'mono',
        size: layout.monthSize,
        x: gridLeft(layout) - 10,
        y: layout.gridTop + Number(row) * step(layout) + layout.cell / 2 + 3.5,
        anchor: 'end',
        fill: palette.text.muted,
      }),
    )
    .join('');
}

interface Timeline {
  readonly stepMs: number;
  readonly lap: number;
  readonly cycle: number;
}

function timeline(hunt: Hunt): Timeline {
  const moves = Math.max(1, hunt.steps.length - 1);
  const stepMs = Math.min(STEP_MS, MAX_LAP_MS / moves);
  const lap = moves * stepMs;
  return { stepMs, lap, cycle: lap + LAP_PAUSE };
}

/** How long the snake takes to fade at the start and end of a lap. */
const SNAKE_FADE = 500;
/** How long the eaten cells take to regrow at the end of the pause. */
const REGROW = 900;

function cells(
  ctx: RenderContext,
  placed: readonly PlacedCell[],
  hunt: Hunt,
  time: Timeline,
  layout: CalendarLayout,
): Fragment {
  const { palette } = ctx.theme;
  const colors = ramp(ctx.theme);
  const flash = ctx.theme.name === 'dark' ? '#ffffff' : '#1d1d1f';
  const body = placed.map((item) => {
    const { cell } = item;
    const base = {
      x: num(item.x),
      y: num(item.y),
      width: num(layout.cell),
      height: num(layout.cell),
      rx: num(layout.cell * 0.25),
    };
    if (cell.level === 0) {
      return el('rect', {
        ...base,
        fill: palette.surface,
        stroke: palette.surfaceBorder,
        'stroke-width': 0.5,
      });
    }
    const color = colors[cell.level - 1] ?? palette.accent.primary;
    const eatenStep = hunt.eatenAt.get(key(item.column, item.row));
    if (eatenStep === undefined) return el('rect', { ...base, fill: color });
    // Moments within the cycle (0–1): reached, flashed, settled, regrown.
    const reached = (eatenStep * time.stepMs) / time.cycle;
    const flashed = reached + 120 / time.cycle;
    const settled = Math.min(0.99, reached + 420 / time.cycle);
    const regrow = Math.max(settled + 0.001, 1 - REGROW / time.cycle);
    const keyTimes = `0;${num(reached)};${num(flashed)};${num(settled)};${num(regrow)};1`;
    // An explicit begin keeps every cell on the same timeline as the snake's animateMotion.
    const timing = {
      begin: '0ms',
      dur: `${time.cycle}ms`,
      repeatCount: 'indefinite',
      keyTimes,
      calcMode: 'linear',
    };
    return el(
      'rect',
      {
        ...base,
        fill: color,
        stroke: color,
        'stroke-width': 0,
        'stroke-opacity': 0.55,
        class: 'cell',
      },
      [
        el('animate', { attributeName: 'opacity', values: '1;1;1;0.16;0.16;1', ...timing }),
        el('animate', {
          attributeName: 'fill',
          values: `${color};${color};${flash};${color};${color};${color}`,
          ...timing,
        }),
        el('animate', {
          attributeName: 'stroke-width',
          values: `0;0;${num(layout.cell * 0.44)};0;0;0`,
          ...timing,
        }),
      ],
    );
  });
  const css = `@media (prefers-reduced-motion:reduce){.snake{display:none}}`;
  return { body: body.join(''), css };
}

function snake(ctx: RenderContext, hunt: Hunt, time: Timeline, layout: CalendarLayout): Fragment {
  const { palette } = ctx.theme;
  if (hunt.steps.length < 2) return { body: '' };
  const path = hunt.steps
    .map((at, i) => {
      const { x, y } = centre(at, layout);
      return `${i === 0 ? 'M' : 'L'} ${num(x)} ${num(y)}`;
    })
    .join(' ');
  // Every part starts together: a segment waits on the first cell for its lag,
  // travels at the head's speed, then parks on the last cell until the lap
  // restarts. Nothing ever sits off the grid.
  const motion = (lag: number): string =>
    el('animateMotion', {
      dur: `${time.cycle}ms`,
      repeatCount: 'indefinite',
      begin: '0ms',
      path,
      keyPoints: '0;0;1;1',
      keyTimes: `0;${num(lag / time.cycle)};${num((time.lap + lag) / time.cycle)};1`,
      calcMode: 'linear',
      rotate: 'auto',
    });
  const fadeIn = SNAKE_FADE / time.cycle;
  const fadeOutStart = (time.lap - SNAKE_FADE) / time.cycle;
  const fade = el('animate', {
    attributeName: 'opacity',
    values: '0;1;1;0;0',
    keyTimes: `0;${num(fadeIn)};${num(fadeOutStart)};${num(time.lap / time.cycle)};1`,
    begin: '0ms',
    dur: `${time.cycle}ms`,
    repeatCount: 'indefinite',
    calcMode: 'linear',
  });
  const defs = [
    el('linearGradient', { id: 'snake-grad', x1: '0', y1: '0', x2: '1', y2: '0' }, [
      el('stop', { offset: '0', 'stop-color': palette.accent.secondary }),
      el('stop', { offset: '1', 'stop-color': palette.accent.primary }),
    ]),
  ];
  const at = (children: readonly string[]): string => el('g', {}, children);
  const segments: string[] = [];
  for (let i = BODY_SEGMENTS; i >= 1; i -= 1) {
    const t = i / (BODY_SEGMENTS + 1);
    const size = layout.cell * (0.92 - t * 0.28);
    segments.push(
      at([
        el('rect', {
          x: num(-size / 2),
          y: num(-size / 2),
          width: num(size),
          height: num(size),
          rx: num(size * 0.3),
          fill: 'url(#snake-grad)',
          opacity: num(1 - t * 0.5),
        }),
        motion(i * time.stepMs),
      ]),
    );
  }
  // The head is drawn against a 16-unit cell and scaled to whatever the
  // viewport uses, so it stays exactly one cell wide on a phone too.
  const k = layout.cell / 16;
  const head = at([
    el('rect', {
      x: num(-12 * k),
      y: num(-12 * k),
      width: num(24 * k),
      height: num(24 * k),
      rx: num(9 * k),
      fill: palette.accent.primary,
      opacity: 0.35,
      filter: 'url(#glow-soft)',
    }),
    el('rect', {
      x: num(-9.5 * k),
      y: num(-9.5 * k),
      width: num(19 * k),
      height: num(19 * k),
      rx: num(6.5 * k),
      fill: 'url(#snake-grad)',
    }),
    el('circle', { cx: num(3.5 * k), cy: num(-4 * k), r: num(3 * k), fill: '#ffffff' }),
    el('circle', { cx: num(3.5 * k), cy: num(4 * k), r: num(3 * k), fill: '#ffffff' }),
    el('circle', { cx: num(4.5 * k), cy: num(-4 * k), r: num(1.5 * k), fill: '#1d1d1f' }),
    el('circle', { cx: num(4.5 * k), cy: num(4 * k), r: num(1.5 * k), fill: '#1d1d1f' }),
    motion(0),
  ]);
  return { body: el('g', { class: 'snake', opacity: 0 }, [...segments, head, fade]), defs };
}

function legend(ctx: RenderContext, layout: CalendarLayout): string {
  const { palette } = ctx.theme;
  const { text } = ctx.data.config;
  const colors = [palette.surface, ...ramp(ctx.theme)];
  const swatch = layout.legendSize + 2;
  const pitch = swatch + 4;
  const y = layout.height - swatch - 18;
  const x0 = layout.width - pad(ctx.viewport) - colors.length * pitch - 62;
  return [
    outlineText(text.legendLess, {
      font: 'mono',
      size: layout.legendSize,
      x: x0 - 8,
      y: y + swatch - 2,
      anchor: 'end',
      fill: palette.text.muted,
    }),
    ...colors.map((color, i) =>
      el('rect', {
        x: num(x0 + i * pitch),
        y: num(y),
        width: num(swatch),
        height: num(swatch),
        rx: 3,
        fill: color,
        stroke: i === 0 ? palette.surfaceBorder : 'none',
        'stroke-width': 0.5,
      }),
    ),
    outlineText(text.legendMore, {
      font: 'mono',
      size: layout.legendSize,
      x: x0 + colors.length * pitch + 4,
      y: y + swatch - 2,
      fill: palette.text.muted,
    }),
  ].join('');
}

function header(ctx: RenderContext, layout: CalendarLayout): string {
  const { palette } = ctx.theme;
  const { stats } = ctx.data;
  const { text } = ctx.data.config;
  const inset = pad(ctx.viewport);
  const scope =
    stats.scope === 'private-included' ? text.calendarScopePrivate : text.calendarScopePublic;
  return animated(ANIM.rise, 40, [
    eyebrow(text.contributionsTitle, inset, layout.headerY, palette.text.muted, {
      size: layout.headerSize,
      letterSpacing: layout.headerSpacing,
    }),
    outlineText(
      format(text.contributionsCaption, {
        contributions: grouped(stats.contributionsLastYear),
        scope,
      }),
      {
        font: 'mono',
        size: layout.captionSize,
        x: layout.captionOwnLine ? inset : layout.width - inset,
        y: layout.captionOwnLine ? layout.headerY + 16 : layout.headerY,
        anchor: layout.captionOwnLine ? 'start' : 'end',
        fill: palette.text.muted,
      },
    ),
  ]);
}

/** The contribution calendar renderer. */
export const contributionsRenderer: AssetRenderer = {
  id: 'contributions',
  viewports: ['wide', 'compact'],
  size: layoutFor,
  render(ctx) {
    const layout = layoutFor(ctx.viewport);
    const placed = placeCells(ctx.data.stats.calendar, layout);
    const hunt = huntPath(placed);
    const time = timeline(hunt);
    return assemble(layout, ctx, ctx.data.config.text.contributionsTitle, [
      { body: header(ctx, layout) },
      {
        body: animated(
          ANIM.fade,
          200,
          monthLabels(ctx, placed, layout) + weekdayLabels(ctx, layout),
        ),
      },
      cells(ctx, placed, hunt, time, layout),
      ctx.data.config.contributions.snake ? snake(ctx, hunt, time, layout) : { body: '' },
      { body: animated(ANIM.fade, 400, legend(ctx, layout)) },
    ]);
  },
};
