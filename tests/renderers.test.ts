import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateSvg } from '../src/core/validate.ts';
import { buildAssets } from '../src/pipeline/build.ts';
import { MemorySink } from '../src/pipeline/file-sink.ts';
import { picture } from '../src/readme/picture.ts';
import { readmeMarkdown } from '../src/readme/template.ts';
import { buildRegistry } from '../src/renderers/index.ts';
import { THEMES } from '../src/theme/index.ts';
import type { Viewport } from '../src/core/types.ts';
import { huntPath, placeCells } from '../src/renderers/contributions.ts';
import { fixtureData } from './helpers.ts';

const VIEWPORTS: readonly Viewport[] = ['wide', 'compact'];

describe('registry and pipeline', () => {
  it('renders every asset in every theme and viewport through the sink', async () => {
    const data = await fixtureData();
    const renderers = buildRegistry(data.config);
    const sink = new MemorySink();
    const manifest = await buildAssets({ renderers, themes: THEMES, data, sink });
    const expected = renderers.reduce((sum, r) => sum + r.viewports.length, 0) * THEMES.length;
    assert.equal(manifest.length, expected);
    for (const asset of manifest) {
      const svg = sink.files.get(asset.path);
      assert.ok(svg, asset.path);
      assert.equal(validateSvg(asset.path, svg), asset.bytes);
      assert.ok(svg.includes('prefers-reduced-motion'), `${asset.path} honours reduced motion`);
    }
  });

  it('writes the phone variants under a -mobile name', async () => {
    const data = await fixtureData();
    const sink = new MemorySink();
    await buildAssets({ renderers: buildRegistry(data.config), themes: THEMES, data, sink });
    assert.ok(sink.files.has('assets/stats-mobile-dark.svg'));
    assert.ok(sink.files.has('assets/stats-dark.svg'));
    // A contact button is already phone-sized and has no second variant.
    assert.ok(!sink.files.has('assets/contact-linkedin-mobile-dark.svg'));
  });

  it('serves a narrower intrinsic width for the cards that pair up', async () => {
    const data = await fixtureData();
    const stats = buildRegistry(data.config).find((r) => r.id === 'stats');
    const theme = THEMES[0];
    assert.ok(stats);
    assert.ok(theme);
    // Two of these plus the inline gap must fit GitHub's README column, which
    // is what makes them share a row on a laptop and stack on a phone.
    assert.ok(stats.size('wide').display * 2 < 880);
    const svg = stats.render({ theme, data, viewport: 'wide' });
    assert.ok(svg.includes(`width="${String(stats.size('wide').display)}"`));
  });

  it('keeps renderer ids unique', async () => {
    const ids = buildRegistry((await fixtureData()).config).map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('matches snapshots for both themes and viewports', async (t) => {
    const data = await fixtureData();
    for (const renderer of buildRegistry(data.config)) {
      for (const viewport of VIEWPORTS) {
        if (!renderer.viewports.includes(viewport)) continue;
        for (const theme of THEMES) {
          t.assert.snapshot(renderer.render({ theme, data, viewport }), {
            serializers: [(value) => String(value)],
          });
        }
      }
    }
  });
});

describe('readme', () => {
  const hero = { id: 'hero', viewports: ['wide', 'compact'] } as const;

  it('emits picture blocks that reference built asset paths', () => {
    const markup = picture(hero, { alt: 'Hero', width: '100%', href: 'https://x' });
    assert.ok(markup.startsWith('<a href="https://x"><picture><source'));
    assert.ok(!markup.includes('\n'), 'single line');
    assert.ok(markup.endsWith('</picture></a>'));
    assert.ok(markup.includes('srcset="assets/hero-dark.svg"'));
    assert.ok(markup.includes('srcset="assets/hero-light.svg"'));
    assert.ok(markup.includes('width="100%"'));
  });

  it('puts the narrow sources first, so a phone matches them before the wide ones', () => {
    const markup = picture(hero, { alt: 'Hero', mobileBreakpoint: 600 });
    const order = [
      'assets/hero-mobile-dark.svg',
      'assets/hero-mobile-light.svg',
      'assets/hero-dark.svg',
    ].map((path) => markup.indexOf(path));
    assert.deepEqual(
      order,
      [...order].sort((a, b) => a - b),
    );
    assert.ok(markup.includes('(prefers-color-scheme: dark) and (max-width: 600px)'));
    assert.ok(!markup.includes('width='), 'intrinsic sizing when no width is asked for');
  });

  it('omits the narrow sources for assets that have only one layout', () => {
    const markup = picture(
      { id: 'contact-x', viewports: ['wide'] },
      {
        alt: 'X',
        mobileBreakpoint: 600,
      },
    );
    assert.ok(!markup.includes('max-width'));
  });

  it('references every project, stat card and contact link', async () => {
    const { config } = await fixtureData();
    const markdown = readmeMarkdown(config, buildRegistry(config));
    for (const project of config.projects.items)
      assert.ok(markdown.includes(`assets/project-${project.repo.toLowerCase()}-dark.svg`));
    for (const link of config.links) assert.ok(markdown.includes(link.url));
    assert.ok(markdown.includes('assets/stats-dark.svg'));
    assert.ok(markdown.includes('assets/languages-light.svg'));
    assert.ok(markdown.includes('assets/contributions-dark.svg'));
    assert.ok(
      markdown.indexOf('assets/stats-dark.svg') < markdown.indexOf('assets/project-'),
      'activity precedes projects',
    );
    assert.ok(!markdown.includes('refreshed daily'), 'no footer');
  });

  it('follows the configured section order and drops what is not listed', async () => {
    const { config } = await fixtureData();
    const reordered = { ...config, sections: ['contributions', 'hero'] as const };
    const markdown = readmeMarkdown(reordered, buildRegistry(reordered));
    assert.ok(markdown.indexOf('contributions-dark') < markdown.indexOf('hero-dark'));
    assert.ok(!markdown.includes('assets/stats-dark.svg'));
  });
});

describe('contributions layout', () => {
  it('places days in Sunday-first week columns', () => {
    const cells = placeCells([
      { date: '2026-09-02', count: 1, level: 1 }, // Wednesday
      { date: '2026-09-03', count: 0, level: 0 },
      { date: '2026-09-04', count: 0, level: 0 },
      { date: '2026-09-05', count: 0, level: 0 },
      { date: '2026-09-06', count: 2, level: 2 }, // Sunday → next column
    ]);
    assert.deepEqual(
      cells.map((c) => [c.column, c.row]),
      [
        [0, 3],
        [0, 4],
        [0, 5],
        [0, 6],
        [1, 0],
      ],
    );
  });

  it('hunts every contribution one grid step at a time', () => {
    // 2026-08-30 is a Sunday, so three full columns of seven.
    const cells = placeCells(
      Array.from({ length: 21 }, (_, i) => {
        const date = new Date(Date.UTC(2026, 7, 30 + i)).toISOString().slice(0, 10);
        const level = i === 9 || i === 20 || i === 3 ? 2 : 0;
        return { date, count: level, level: level };
      }),
    );
    const hunt = huntPath(cells);
    // Food at 0:3, 1:2 and 2:6 (column:row); nearest first, ties left to right.
    assert.deepEqual([...hunt.eatenAt.keys()], ['0:3', '1:2', '2:6']);
    const eaten = [...hunt.eatenAt.values()];
    assert.deepEqual(
      eaten,
      [...eaten].sort((a, b) => a - b),
    );
    for (let i = 1; i < hunt.steps.length; i += 1) {
      const a = hunt.steps[i - 1];
      const b = hunt.steps[i];
      assert.ok(a && b);
      assert.equal(Math.abs(a.column - b.column) + Math.abs(a.row - b.row), 1, 'unit step');
    }
    assert.equal(hunt.steps.length, 1 + 3 + 2 + 5);
  });
});
