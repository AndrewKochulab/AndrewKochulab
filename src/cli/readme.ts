/**
 * @module cli/readme
 * `npm run readme` — regenerates README.md from the registry and data.
 */

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT_DIR, loadAuthoredData } from '../data/load.ts';
import { readmeMarkdown } from '../readme/template.ts';
import { buildRegistry } from '../renderers/index.ts';

async function main(): Promise<void> {
  const data = await loadAuthoredData();
  const markdown = readmeMarkdown(data, buildRegistry(data));
  const target = join(ROOT_DIR, 'README.md');
  await writeFile(target, markdown, 'utf8');
  console.info(`Wrote ${target}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
