/**
 * @module cli/preview
 * `npm run preview` — writes `preview/index.html`, a page that mirrors the
 * README at GitHub's content width with light/dark and desktop/phone
 * switches, so both layouts can be checked in a browser before pushing.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT_DIR, loadConfig } from '../data/load.ts';
import { readmeMarkdown } from '../readme/template.ts';
import { buildRegistry } from '../renderers/index.ts';

const PAGE = (body: string): string => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profile preview</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background: #ffffff; color: #1f2328; }
  body.dark { background: #0d1117; color: #e6edf3; }
  main { max-width: 896px; margin: 0 auto; padding: 32px 32px 96px; }
  /* GitHub's own README rules that decide the layout: images never overflow
     the column, and anything narrower than it shares the line. */
  img { max-width: 100%; height: auto; }
  a { color: inherit; }
  main.phone { max-width: 390px; padding: 16px 16px 64px; }
  body.dark.phone { background: #010409; }
  main.phone > p { margin: 12px 0; }
  .bar { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; justify-content: flex-end; padding: 12px 24px; background: rgba(127,127,127,.12); backdrop-filter: blur(6px); }
  button { font: inherit; padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(127,127,127,.4); background: transparent; color: inherit; cursor: pointer; }
</style>
</head>
<body>
<div class="bar">
  <button id="reload">Replay animations</button>
  <button id="width">Phone width</button>
  <button id="toggle">Toggle theme</button>
</div>
<main id="page">${body}</main>
<script>
  const body = document.body;
  const page = document.getElementById('page');
  const params = new URLSearchParams(location.search);
  let dark = params.has('theme') ? params.get('theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  let phone = params.get('width') === 'phone';
  // The published page picks a source with a media query; here the switches
  // do it by hand, so both variants can be inspected on one screen.
  const apply = () => {
    body.classList.toggle('dark', dark);
    body.classList.toggle('phone', phone);
    page.classList.toggle('phone', phone);
    document.getElementById('width').textContent = phone ? 'Desktop width' : 'Phone width';
    for (const source of document.querySelectorAll('picture source')) {
      const media = source.dataset.media ?? (source.dataset.media = source.getAttribute('media'));
      // A source with no colour scheme in its media (the blank placeholder a
      // hidden section resolves to) matches whichever theme is showing.
      const scheme = /dark|light/.test(media);
      const wantsScheme = !scheme || media.includes(dark ? 'dark' : 'light');
      const isCompact = media.includes('max-width');
      source.setAttribute('media', wantsScheme && isCompact === phone ? 'all' : 'not all');
    }
  };
  apply();
  document.getElementById('toggle').onclick = () => { dark = !dark; apply(); };
  document.getElementById('width').onclick = () => { phone = !phone; apply(); };
  document.getElementById('reload').onclick = () => { for (const img of document.querySelectorAll('img')) { const src = img.src; img.src = ''; img.src = src.split('?')[0] + '?t=' + Date.now(); } };
</script>
</body>
</html>
`;

async function main(): Promise<void> {
  const config = await loadConfig();
  const markdown = readmeMarkdown(config, buildRegistry(config));
  const html = markdown
    .replace(/^<!--[\s\S]*?-->\n/, '')
    .replaceAll('src="assets/', 'src="../assets/')
    .replaceAll('srcset="assets/', 'srcset="../assets/');
  const dir = join(ROOT_DIR, 'preview');
  await mkdir(dir, { recursive: true });
  const target = join(dir, 'index.html');
  await writeFile(target, PAGE(html), 'utf8');
  console.info(`Wrote ${target}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
