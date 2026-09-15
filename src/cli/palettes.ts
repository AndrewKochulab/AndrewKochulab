/**
 * @module cli/palettes
 * `npm run palettes` — renders the hero, stats and contributions assets in
 * every palette variant into `preview/palettes/` with a comparison page, so a
 * variant can be chosen by eye before it is configured.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT_DIR, loadProfileData } from '../data/load.ts';
import { buildAssets } from '../pipeline/build.ts';
import { DiskSink } from '../pipeline/file-sink.ts';
import { buildRegistry } from '../renderers/index.ts';
import { PALETTES, themesFor } from '../theme/index.ts';

const SAMPLE_IDS = new Set(['hero', 'stats', 'languages', 'contributions']);

async function main(): Promise<void> {
  const data = await loadProfileData();
  const renderers = buildRegistry(data.config).filter((renderer) => SAMPLE_IDS.has(renderer.id));
  const sections: string[] = [];
  for (const [id, variant] of Object.entries(PALETTES)) {
    const outDir = `preview/palettes/${id}`;
    await buildAssets({
      renderers,
      themes: themesFor(id, data.config.appearance.radius),
      data,
      sink: new DiskSink(ROOT_DIR),
      outDir,
      viewports: ['wide'],
    });
    const images = (mode: 'dark' | 'light'): string =>
      renderers.map((r) => `<img src="${id}/${r.id}-${mode}.svg" alt="${r.id} ${mode}">`).join('');
    sections.push(
      `<section><h2>${variant.name} <code>${id}</code></h2><p>${variant.description}</p>` +
        `<div class="dark">${images('dark')}</div><div class="light">${images('light')}</div></section>`,
    );
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Palette variants</title><style>
  body{margin:0;font:15px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;background:#1c1c1e;color:#f5f5f7}
  section{max-width:1240px;margin:0 auto;padding:32px 20px}
  h2{margin:0 0 4px}code{opacity:.6;font-weight:400}p{margin:0 0 16px;opacity:.75}
  .dark,.light{padding:20px;border-radius:24px;display:grid;gap:14px;grid-template-columns:1fr 1fr}
  .dark{background:#0d1117}.light{background:#fff;margin-top:14px}
  img{width:100%;display:block}img[alt^="hero"],img[alt^="contributions"]{grid-column:1/-1}
  </style></head><body>${sections.join('')}</body></html>`;
  const dir = join(ROOT_DIR, 'preview', 'palettes');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), html, 'utf8');
  console.info(`Wrote ${join(dir, 'index.html')} (${Object.keys(PALETTES).length} variants)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
