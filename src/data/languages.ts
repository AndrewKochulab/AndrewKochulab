/**
 * @module data/languages
 * Byte-weighted language share across repositories, with a "rest" bucket.
 */

import type { LanguageShare } from '../core/types.ts';

/** Raw per-repository language sizes as reported by GitHub. */
export interface RepoLanguageEdge {
  readonly name: string;
  readonly color: string | null;
  readonly bytes: number;
}

/** Colour used when GitHub has none for a language. */
export const FALLBACK_LANGUAGE_COLOR = '#8b949e';

/** Languages that are build noise rather than a skill signal. */
const IGNORED = new Set(['Makefile', 'Mako', 'Dockerfile', 'HTML', 'CSS', 'Ruby']);

/**
 * Aggregates edges across repositories and returns the top `limit` languages
 * by share, percentages summing to 100 (of the retained languages).
 */
export function computeLanguageShare(
  edges: readonly RepoLanguageEdge[],
  limit = 6,
): LanguageShare[] {
  const totals = new Map<string, { bytes: number; color: string }>();
  for (const edge of edges) {
    if (IGNORED.has(edge.name) || edge.bytes <= 0) continue;
    const entry = totals.get(edge.name) ?? {
      bytes: 0,
      color: edge.color ?? FALLBACK_LANGUAGE_COLOR,
    };
    entry.bytes += edge.bytes;
    totals.set(edge.name, entry);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, limit);
  const total = ranked.reduce((sum, [, entry]) => sum + entry.bytes, 0);
  if (total === 0) return [];
  return ranked.map(([name, entry]) => ({
    name,
    color: entry.color,
    bytes: entry.bytes,
    percent: Math.round((entry.bytes / total) * 1000) / 10,
  }));
}
