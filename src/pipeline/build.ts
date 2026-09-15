/**
 * @module pipeline/build
 * Renders every registered asset in every theme, validates it and hands it
 * to a sink. Pure orchestration: no knowledge of individual assets.
 */

import type { AssetRenderer, ProfileData, Theme, ThemeName, Viewport } from '../core/types.ts';
import { validateSvg } from '../core/validate.ts';
import type { FileSink } from './file-sink.ts';

export interface BuildOptions {
  readonly renderers: readonly AssetRenderer[];
  readonly themes: readonly Theme[];
  readonly data: ProfileData;
  readonly sink: FileSink;
  /** Directory (relative to the sink root) that receives the SVGs. Default `assets`. */
  readonly outDir?: string;
  /** Viewports to render. Default both. */
  readonly viewports?: readonly Viewport[];
}

export interface BuiltAsset {
  readonly id: string;
  readonly theme: ThemeName;
  readonly viewport: Viewport;
  readonly path: string;
  readonly bytes: number;
}

/**
 * File name convention shared with the README generator: the wide variant
 * keeps the plain name, the phone variant gains a `-mobile` infix.
 */
export function assetPath(
  id: string,
  theme: ThemeName,
  viewport: Viewport = 'wide',
  outDir = 'assets',
): string {
  return `${outDir}/${id}${viewport === 'compact' ? '-mobile' : ''}-${theme}.svg`;
}

/** Runs the build and returns a manifest of what was written. */
export async function buildAssets(options: BuildOptions): Promise<BuiltAsset[]> {
  const {
    renderers,
    themes,
    data,
    sink,
    outDir = 'assets',
    viewports = ['wide', 'compact'],
  } = options;
  const manifest: BuiltAsset[] = [];
  for (const renderer of renderers) {
    for (const viewport of viewports) {
      if (!renderer.viewports.includes(viewport)) continue;
      for (const theme of themes) {
        const svg = renderer.render({ theme, data, viewport });
        const path = assetPath(renderer.id, theme.name, viewport, outDir);
        const bytes = validateSvg(path, svg);
        await sink.write(path, svg);
        manifest.push({ id: renderer.id, theme: theme.name, viewport, path, bytes });
      }
    }
  }
  return manifest;
}
