/**
 * @module pipeline/build
 * Renders every registered asset in every theme, validates it and hands it
 * to a sink. Pure orchestration: no knowledge of individual assets.
 */

import type { AssetRenderer, ProfileData, Theme, ThemeName } from '../core/types.ts';
import { validateSvg } from '../core/validate.ts';
import type { FileSink } from './file-sink.ts';

export interface BuildOptions {
  readonly renderers: readonly AssetRenderer[];
  readonly themes: readonly Theme[];
  readonly data: ProfileData;
  readonly sink: FileSink;
  /** Directory (relative to the sink root) that receives the SVGs. Default `assets`. */
  readonly outDir?: string;
}

export interface BuiltAsset {
  readonly id: string;
  readonly theme: ThemeName;
  readonly path: string;
  readonly bytes: number;
}

/** File name convention shared with the README generator. */
export function assetPath(id: string, theme: ThemeName, outDir = 'assets'): string {
  return `${outDir}/${id}-${theme}.svg`;
}

/** Runs the build and returns a manifest of what was written. */
export async function buildAssets(options: BuildOptions): Promise<BuiltAsset[]> {
  const { renderers, themes, data, sink, outDir = 'assets' } = options;
  const manifest: BuiltAsset[] = [];
  for (const renderer of renderers) {
    for (const theme of themes) {
      const svg = renderer.render({ theme, data });
      const path = assetPath(renderer.id, theme.name, outDir);
      const bytes = validateSvg(path, svg);
      await sink.write(path, svg);
      manifest.push({ id: renderer.id, theme: theme.name, path, bytes });
    }
  }
  return manifest;
}
