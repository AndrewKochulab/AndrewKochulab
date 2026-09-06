/**
 * @module cli/build
 * `npm run build` — renders every asset in every theme into `assets/`.
 */

import { ROOT_DIR, loadProfileData } from '../data/load.ts';
import { buildAssets } from '../pipeline/build.ts';
import { DiskSink } from '../pipeline/file-sink.ts';
import { buildRegistry } from '../renderers/index.ts';
import { activePaletteId, themesFor } from '../theme/index.ts';

async function main(): Promise<void> {
  const data = await loadProfileData();
  const palette = activePaletteId(data.profile.palette);
  console.info(`Palette: ${palette}`);
  const manifest = await buildAssets({
    renderers: buildRegistry(data),
    themes: themesFor(palette),
    data,
    sink: new DiskSink(ROOT_DIR),
  });
  const total = manifest.reduce((sum, asset) => sum + asset.bytes, 0);
  for (const asset of manifest) {
    console.info(`${asset.path.padEnd(48)} ${(asset.bytes / 1024).toFixed(1).padStart(7)} KB`);
  }
  console.info(`${manifest.length} assets, ${(total / 1024).toFixed(1)} KB total`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
