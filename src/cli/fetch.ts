/**
 * @module cli/fetch
 * `npm run fetch` — pulls a fresh stats snapshot from GitHub into `data/stats.json`.
 *
 * Token resolution: `PROFILE_TOKEN` (a personal token, sees private
 * contributions) → `GITHUB_TOKEN` (Actions default, public data only).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { FetchGraphQLTransport, GitHubClient } from '../data/github-client.ts';
import { dataPath, loadConfig } from '../data/load.ts';
import { preserveRicherSnapshot } from '../data/merge.ts';
import { LiveStatsSource, parseSnapshot } from '../data/stats-source.ts';

async function main(): Promise<void> {
  // An unset secret reaches the workflow as an empty string, so blanks count as absent.
  const token = [process.env['PROFILE_TOKEN'], process.env['GITHUB_TOKEN']].find(
    (candidate) => candidate !== undefined && candidate !== '',
  );
  if (token === undefined) {
    throw new Error('Set PROFILE_TOKEN or GITHUB_TOKEN to fetch stats.');
  }
  const { profile } = await loadConfig();
  const source = new LiveStatsSource(
    new GitHubClient(new FetchGraphQLTransport(token)),
    profile.login,
  );
  const fresh = await source.load();
  const target = dataPath('stats.json');
  const previous = await readPrevious(target);
  const { snapshot, preserved } = preserveRicherSnapshot(previous, fresh);
  if (preserved) {
    console.warn(
      'Token sees public data only; kept the private contribution figures from the previous snapshot.',
    );
  }
  await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.info(
    `Wrote ${target} (${snapshot.scope}): ${snapshot.contributionsLastYear} contributions, ${snapshot.starsEarned} stars, ${snapshot.languages.length} languages, ${Object.keys(snapshot.repos).length} public repos`,
  );
  if (snapshot.scope === 'public') {
    console.warn(
      'Private contributions were not visible; add a PROFILE_TOKEN secret to include them.',
    );
  }
}

/** The committed snapshot, or undefined when none exists or it cannot be parsed. */
async function readPrevious(path: string): Promise<ReturnType<typeof parseSnapshot> | undefined> {
  try {
    return parseSnapshot(await readFile(path, 'utf8'));
  } catch {
    return undefined;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
