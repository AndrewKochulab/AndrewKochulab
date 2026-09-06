import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ANIM, animationCss, delayStyle, staggerStyle, styles } from '../src/core/animation.ts';
import { DURATION, EASING, staggerDelay } from '../src/core/easing.ts';
import { compact, el, escapeXml, grouped, num, svgDocument, text } from '../src/core/svg.ts';
import { layoutText, measureText, outlineText } from '../src/core/text.ts';
import { AssetValidationError, MAX_ASSET_BYTES, validateSvg } from '../src/core/validate.ts';

describe('svg builder', () => {
  it('escapes attribute and text content', () => {
    assert.equal(escapeXml('a<b>&"c"'), 'a&lt;b&gt;&amp;&quot;c&quot;');
    assert.equal(text('x<y'), '<text>x&lt;y</text>');
  });

  it('drops undefined/false attributes and self-closes empty elements', () => {
    assert.equal(
      el('rect', { x: 1.5, hidden: false, y: undefined, rx: 2 }),
      '<rect x="1.5" rx="2"/>',
    );
    assert.equal(el('g', {}, ['<a/>', '<b/>']), '<g><a/><b/></g>');
  });

  it('formats numbers compactly', () => {
    assert.equal(num(1.23456), '1.235');
    assert.equal(num(2.5), '2.5');
    assert.equal(num(3), '3');
    assert.equal(compact(950), '950');
    assert.equal(compact(1234), '1.2k');
    assert.equal(compact(12345), '12.3k');
    assert.equal(grouped(1234567), '1,234,567');
  });

  it('frames a document with viewBox and title', () => {
    const doc = svgDocument({ width: 10, height: 20, title: 'T', children: ['<g/>'] });
    assert.ok(doc.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20"'));
    assert.ok(doc.includes('<title>T</title>'));
    assert.ok(doc.endsWith('</svg>'));
  });
});

describe('easing and animation', () => {
  it('computes staggered delays from an index', () => {
    assert.equal(staggerDelay(0), 120);
    assert.equal(staggerDelay(3, { base: 100, step: 50 }), 250);
    assert.equal(staggerStyle(2), 'animation-delay:260ms');
    assert.equal(delayStyle(12.6), 'animation-delay:13ms');
    assert.equal(styles('a:1', undefined, '', 'b:2'), 'a:1;b:2');
  });

  it('declares every animation class and a reduced-motion override', () => {
    const css = animationCss();
    for (const name of Object.values(ANIM)) assert.ok(css.includes(`.${name}{`), name);
    assert.ok(css.includes('prefers-reduced-motion'));
    assert.ok(css.includes(EASING.out));
    assert.ok(css.includes(`${DURATION.entrance}ms`));
  });
});

describe('text outlining', () => {
  it('lays out glyphs with advancing pen positions', () => {
    const layout = layoutText('AV', { font: 'displayBold', size: 40 });
    assert.equal(layout.glyphs.length, 2);
    assert.ok((layout.glyphs[1]?.x ?? 0) > 0);
    assert.ok(layout.width > (layout.glyphs[1]?.x ?? 0));
    assert.ok(layout.metrics.capHeight > 0 && layout.metrics.capHeight < 40);
  });

  it('treats whitespace as advance without a path', () => {
    const layout = layoutText('a b', { font: 'mono', size: 12 });
    assert.equal(layout.glyphs[1]?.d, '');
    assert.ok(
      measureText('a b', { font: 'mono', size: 12 }) >
        measureText('ab', { font: 'mono', size: 12 }),
    );
  });

  it('anchors outlined text', () => {
    const start = outlineText('Hi', {
      font: 'displayMedium',
      size: 20,
      x: 100,
      y: 50,
      fill: '#000',
    });
    const end = outlineText('Hi', {
      font: 'displayMedium',
      size: 20,
      x: 100,
      y: 50,
      fill: '#000',
      anchor: 'end',
    });
    assert.ok(start.includes('translate(100 50)'));
    assert.ok(!end.includes('translate(100 50)'));
  });
});

describe('validation', () => {
  it('accepts a balanced document', () => {
    assert.ok(validateSvg('ok', '<svg><g><rect/></g></svg>') > 0);
  });

  it('rejects oversized, unbalanced and scripted documents', () => {
    assert.throws(
      () => validateSvg('big', `<svg>${'x'.repeat(MAX_ASSET_BYTES)}</svg>`),
      AssetValidationError,
    );
    assert.throws(() => validateSvg('bad', '<svg><g></svg>'), /unbalanced/);
    assert.throws(() => validateSvg('js', '<svg><script></script></svg>'), /script/);
    assert.throws(() => validateSvg('frag', '<g/>'), /standalone/);
  });
});
