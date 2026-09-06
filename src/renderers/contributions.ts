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
import type { Fragment } from '../core/fragment.ts';
import { el, grouped, num } from '../core/svg.ts';
import { outlineText } from '../core/text.ts';
import type { AssetRenderer, CalendarCell, RenderContext, Theme } from '../core/types.ts';
import { PAD, animated, assemble, eyebrow } from './shared.ts';

const WIDTH = 1200;
const HEIGHT = 250;
const CELL = 16;
const GAP = 4;
const STEP = CELL + GAP;
const COLUMNS = 53;
const GRID_LEFT = (WIDTH - COLUMNS * STEP + GAP) / 2;
const GRID_TOP = 74;
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
export function placeCells(calendar: readonly CalendarCell[]): PlacedCell[] {
  const first = calendar[0];
  if (first === undefined) return [];
  const offset = new Date(`${first.date}T00:00:00Z`).getUTCDay();
  return calendar.map((cell, index) => {
    const slot = index + offset;
    const column = Math.floor(slot / 7);
    const row = slot % 7;
    return { cell, column, row, x: GRID_LEFT + column * STEP, y: GRID_TOP + row * STEP };
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
function centre(step: Step): { readonly x: number; readonly y: number } {
  return { x: GRID_LEFT + step.column * STEP + CELL / 2, y: GRID_TOP + step.row * STEP + CELL / 2 };
}

function monthLabels(ctx: RenderContext, placed: readonly PlacedCell[]): string {
  const { palette } = ctx.theme;
  const seen = new Set<number>();
  const labels: string[] = [];
  for (const item of placed) {
    const month = Number(item.cell.date.slice(5, 7)) - 1;
    const day = Number(item.cell.date.slice(8, 10));
    if (day > 7 || seen.has(item.column) || item.row !== 0) continue;
    seen.add(item.column);
    labels.push(
      outlineText(MONTHS[month] ?? '', {
        font: 'mono',
        size: 10,
        x: item.x,
        y: GRID_TOP - 12,
        fill: palette.text.muted,
      }),
    );
  }
  return labels.join('');
}

function weekdayLabels(ctx: RenderContext): string {
  const { palette } = ctx.theme;
  return Object.entries(WEEKDAYS)
    .map(([row, label]) =>
      outlineText(label, {
        font: 'mono',
        size: 10,
        x: GRID_LEFT - 10,
        y: GRID_TOP + Number(row) * STEP + CELL / 2 + 3.5,
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
): Fragment {
  const { palette } = ctx.theme;
  const colors = ramp(ctx.theme);
  const flash = ctx.theme.name === 'dark' ? '#ffffff' : '#1d1d1f';
  const body = placed.map((item) => {
    const { cell } = item;
    const base = { x: num(item.x), y: num(item.y), width: CELL, height: CELL, rx: 4 };
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
        el('animate', { attributeName: 'stroke-width', values: '0;0;7;0;0;0', ...timing }),
      ],
    );
  });
  const css = `@media (prefers-reduced-motion:reduce){.snake{display:none}}`;
  return { body: body.join(''), css };
}

function snake(ctx: RenderContext, hunt: Hunt, time: Timeline): Fragment {
  const { palette } = ctx.theme;
  if (hunt.steps.length < 2) return { body: '' };
  const path = hunt.steps
    .map((step, i) => {
      const { x, y } = centre(step);
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
    const size = CELL * (0.92 - t * 0.28);
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
  const head = at([
    el('rect', {
      x: -12,
      y: -12,
      width: 24,
      height: 24,
      rx: 9,
      fill: palette.accent.primary,
      opacity: 0.35,
      filter: 'url(#glow-soft)',
    }),
    el('rect', { x: -9.5, y: -9.5, width: 19, height: 19, rx: 6.5, fill: 'url(#snake-grad)' }),
    el('circle', { cx: 3.5, cy: -4, r: 3, fill: '#ffffff' }),
    el('circle', { cx: 3.5, cy: 4, r: 3, fill: '#ffffff' }),
    el('circle', { cx: 4.5, cy: -4, r: 1.5, fill: '#1d1d1f' }),
    el('circle', { cx: 4.5, cy: 4, r: 1.5, fill: '#1d1d1f' }),
    motion(0),
  ]);
  return { body: el('g', { class: 'snake', opacity: 0 }, [...segments, head, fade]), defs };
}

function legend(ctx: RenderContext): string {
  const { palette } = ctx.theme;
  const colors = [palette.surface, ...ramp(ctx.theme)];
  const y = HEIGHT - 30;
  const x0 = WIDTH - PAD - colors.length * 16 - 62;
  return [
    outlineText('Less', {
      font: 'mono',
      size: 10,
      x: x0 - 8,
      y: y + 8,
      anchor: 'end',
      fill: palette.text.muted,
    }),
    ...colors.map((color, i) =>
      el('rect', {
        x: num(x0 + i * 16),
        y: num(y - 2),
        width: 12,
        height: 12,
        rx: 3,
        fill: color,
        stroke: i === 0 ? palette.surfaceBorder : 'none',
        'stroke-width': 0.5,
      }),
    ),
    outlineText('More', {
      font: 'mono',
      size: 10,
      x: x0 + colors.length * 16 + 4,
      y: y + 8,
      fill: palette.text.muted,
    }),
  ].join('');
}

function header(ctx: RenderContext): string {
  const { palette } = ctx.theme;
  const { stats } = ctx.data;
  const scope = stats.scope === 'private-included' ? 'public + private' : 'public only';
  return animated(ANIM.rise, 40, [
    eyebrow('Contributions · last 12 months', PAD, 40, palette.text.muted),
    outlineText(`${grouped(stats.contributionsLastYear)} contributions · ${scope}`, {
      font: 'mono',
      size: 10.5,
      x: WIDTH - PAD,
      y: 40,
      anchor: 'end',
      fill: palette.text.muted,
    }),
  ]);
}

/** The contribution calendar renderer. */
export const contributionsRenderer: AssetRenderer = {
  id: 'contributions',
  width: WIDTH,
  height: HEIGHT,
  render(ctx) {
    const placed = placeCells(ctx.data.stats.calendar);
    const hunt = huntPath(placed);
    const time = timeline(hunt);
    return assemble(contributionsRenderer, ctx, 'Contribution calendar', [
      { body: header(ctx) },
      { body: animated(ANIM.fade, 200, monthLabels(ctx, placed) + weekdayLabels(ctx)) },
      cells(ctx, placed, hunt, time),
      snake(ctx, hunt, time),
      { body: animated(ANIM.fade, 400, legend(ctx)) },
    ]);
  },
};
