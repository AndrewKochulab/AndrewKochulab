import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_TEXT } from '../src/config/defaults.ts';
import { format } from '../src/config/format.ts';
import { ConfigError, parseConfig, parseConfigJson } from '../src/config/parse.ts';
import { loadConfig } from '../src/data/load.ts';

const minimal = { profile: { login: 'octocat', name: 'Octo Cat' } };

describe('config defaults', () => {
  it('needs nothing but a login and a name', () => {
    const config = parseConfig(minimal);
    assert.equal(config.profile.login, 'octocat');
    assert.equal(config.profile.title, '');
    assert.deepEqual(config.sections, ['hero', 'activity', 'projects', 'contributions', 'contact']);
    assert.equal(config.appearance.palette, 'aurora');
    assert.equal(config.appearance.mobile.breakpoint, 600);
    assert.equal(config.text.statsTitle, DEFAULT_TEXT.statsTitle);
    assert.deepEqual(config.projects.items, []);
    assert.deepEqual(config.links, []);
  });

  it('derives project owners and urls from the login', () => {
    const config = parseConfig({ ...minimal, projects: { items: [{ repo: 'Hello' }] } });
    assert.deepEqual(
      config.projects.items.map((item) => [item.owner, item.url]),
      [['octocat', 'https://github.com/octocat/Hello']],
    );
  });

  it('fills the brand colours of a known network and keeps custom ones', () => {
    const config = parseConfig({
      ...minimal,
      links: [
        { id: 'linkedin', url: 'https://example.com/in' },
        {
          id: 'homepage',
          url: 'https://example.com',
          icon: 'safari',
          gradient: ['#111'],
          angle: 10,
        },
      ],
    });
    assert.deepEqual(
      config.links.map((link) => [link.label, link.icon, link.gradient, link.angle]),
      [
        ['linkedin', 'linkedin', ['#0a66c2', '#0a66c2'], 0],
        ['homepage', 'safari', ['#111'], 10],
      ],
    );
  });

  it('overrides only the strings it is given', () => {
    const config = parseConfig({ ...minimal, text: { statsTitle: 'Aktivität' } });
    assert.equal(config.text.statsTitle, 'Aktivität');
    assert.equal(config.text.languagesTitle, DEFAULT_TEXT.languagesTitle);
  });
});

describe('config validation', () => {
  const rejects = (raw: unknown, pattern: RegExp): void => {
    assert.throws(
      () => parseConfig(raw),
      (error: unknown) => {
        assert.ok(error instanceof ConfigError);
        assert.match(error.message, /^data\/config\.json: /);
        assert.match(error.message, pattern);
        return true;
      },
    );
  };

  it('names the field that is wrong', () => {
    rejects({}, /profile is required/);
    rejects({ profile: { login: 'a' } }, /profile\.name is required/);
    rejects({ ...minimal, sections: ['nope'] }, /sections\[0\] must be one of/);
    rejects({ ...minimal, stats: { tiles: ['moon'] } }, /stats\.tiles\[0\] must be one of/);
    rejects({ ...minimal, languages: { count: 99 } }, /languages\.count must be between/);
    rejects({ ...minimal, text: { nope: 'x' } }, /text\.nope is not a known string/);
    rejects({ ...minimal, hero: { tiles: [{ slug: 'a', gradient: ['#1'] }] } }, /exactly two/);
    rejects({ ...minimal, projects: { items: [{ repo: 'a' }, { repo: 'A' }] } }, /lists "A" twice/);
    rejects({ ...minimal, links: [{ id: 'x' }] }, /links\[0\]\.url is required/);
  });

  it('reports unreadable JSON without a stack trace', () => {
    assert.throws(() => parseConfigJson('{'), /is not valid JSON/);
  });
});

describe('template strings', () => {
  it('substitutes known placeholders and leaves typos visible', () => {
    assert.equal(format('{a} of {b}', { a: 1, b: 'two' }), '1 of two');
    assert.equal(format('{nope}', {}), '{nope}');
  });
});

describe('the repository configuration', () => {
  it('parses and lists every asset the README needs', async () => {
    const config = await loadConfig();
    assert.ok(config.projects.items.length > 0);
    assert.ok(config.links.length > 0);
    assert.ok(config.hero.stack.length > 0);
  });
});
