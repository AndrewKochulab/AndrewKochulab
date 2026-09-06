/**
 * @module core/random
 * A tiny deterministic generator so decorative layouts (blobs, particles)
 * are stable across builds and snapshot tests.
 */

/** Linear congruential generator returning values in [0, 1). */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
