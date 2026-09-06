import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { combine } from '../src/core/fragment.ts';
import { icon, iconBrandColor, iconPath } from '../src/primitives/icon.ts';
import { odometer } from '../src/primitives/odometer.ts';
import { pill } from '../src/primitives/pill.ts';
import { squirclePath, tile } from '../src/primitives/tile.ts';
import { progressRing } from '../src/primitives/ring.ts';
import { buildTimeline, typewriter, typewriterCss } from '../src/primitives/typewriter.ts';
import { darkTheme } from '../src/theme/tokens.ts';

describe('fragments', () => {
  it('merges bodies, defs and css in order', () => {
    const merged = combine(
      { body: 'a', defs: ['d1'], css: 'c1' },
      { body: 'b' },
      { body: 'c', defs: ['d2'], css: 'c2' },
    );
    assert.deepEqual(merged, { body: 'abc', defs: ['d1', 'd2'], css: 'c1\nc2' });
  });
});

describe('icons', () => {
  it('resolves simple-icons slugs and custom glyphs', () => {
    assert.ok(iconPath('swift')?.startsWith('M'));
    assert.ok(iconPath('linkedin')?.startsWith('M'));
    assert.equal(iconPath('nope'), undefined);
    assert.equal(iconBrandColor('swift'), '#F05138');
    assert.equal(iconBrandColor('linkedin'), undefined);
  });

  it('scales into the requested box', () => {
    assert.ok(
      icon('swift', { x: 1, y: 2, size: 12, fill: '#fff' }).includes('translate(1 2) scale(0.5)'),
    );
    assert.throws(() => icon('nope', { x: 0, y: 0, size: 1, fill: '' }), /Unknown icon/);
  });
});

describe('pill', () => {
  it('widens with an icon and keeps positioning on the outer group', () => {
    const plain = pill({ x: 10, y: 5, label: 'Swift', theme: darkTheme });
    const withIcon = pill({
      x: 10,
      y: 5,
      label: 'Swift',
      theme: darkTheme,
      icon: 'swift',
      attrs: { class: 'a-pop' },
    });
    assert.ok(withIcon.width > plain.width);
    assert.ok(withIcon.body.startsWith('<g transform="translate(10 5)"><g class="a-pop">'));
  });
});

describe('typewriter timeline', () => {
  it('gives each line an equal slot sized for the longest line', () => {
    const timeline = buildTimeline([10, 20], { step: 50, hold: 1000, fadeOut: 200, gap: 100 });
    assert.equal(timeline.cycling, true);
    assert.equal(timeline.cycle, 2 * (1000 + 1000 + 200 + 100));
    assert.deepEqual(
      timeline.lines.map((l) => l.start),
      [0, 2300],
    );
    assert.deepEqual(
      timeline.lines.map((l) => l.typing),
      [500, 1000],
    );
  });

  it('keeps every character hidden before its next re-type', () => {
    // A character must switch off before the same slot begins in the next cycle.
    const timeline = buildTimeline([46, 40, 39]);
    for (const line of timeline.lines) {
      const lastCharOff = line.start + line.typing + line.typing + line.hold + line.fadeOut;
      assert.ok(lastCharOff <= line.start + timeline.cycle, 'char off before next cycle');
    }
  });

  it('does not cycle a single line', () => {
    const timeline = buildTimeline([5]);
    assert.equal(timeline.cycling, false);
    const css = typewriterCss(timeline);
    assert.ok(css.includes('tw-char-0'));
    assert.ok(!css.includes('infinite both}\n@keyframes tw-char-1'));
  });

  it('renders a path per visible character with increasing delays', () => {
    const fragment = typewriter({
      lines: ['ab c'],
      x: 0,
      y: 0,
      font: 'mono',
      size: 12,
      fill: '#fff',
      cursorFill: '#0ff',
    });
    const delays = [
      ...fragment.body.matchAll(/class="tw-char tw-char-0" style="animation-delay:(\d+)ms"/g),
    ].map((m) => Number(m[1]));
    assert.deepEqual(delays, [0, 45, 135]);
    assert.ok(fragment.css?.includes('prefers-reduced-motion'));
  });
});

describe('odometer', () => {
  it('creates one rolling column per digit and leaves separators static', () => {
    const result = odometer({
      value: '1,204',
      x: 0,
      y: 0,
      font: 'displayBold',
      size: 20,
      fill: '#fff',
      id: 'n',
    });
    assert.equal((result.body.match(/class="odo"/g) ?? []).length, 4);
    assert.equal(result.defs?.length, 4);
    assert.ok(result.body.includes('--shift:0px'));
    assert.ok(result.width > 0);
  });
});

describe('rings', () => {
  it('draws the ring arc proportionally', () => {
    const ring = progressRing({
      cx: 0,
      cy: 0,
      r: 10,
      stroke: '#fff',
      trackStroke: '#000',
      strokeWidth: 2,
      progress: 0.5,
    });
    const circumference = 2 * Math.PI * 10;
    assert.ok(ring.includes(`--len:${(circumference / 2).toFixed(3)}`));
  });
});

describe('tile', () => {
  it('draws a closed squircle and a white brand mark', () => {
    assert.ok(squirclePath(40).endsWith('Z'));
    const rendered = tile({
      cx: 10,
      cy: 20,
      size: 40,
      slug: 'swift',
      gradient: ['#000', '#fff'],
      id: 't',
    });
    assert.equal(rendered.defs.length, 3);
    assert.ok(rendered.body.includes('translate(10 20)'));
    assert.ok(rendered.body.includes('fill="#ffffff"'));
  });
});
