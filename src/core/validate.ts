/**
 * @module core/validate
 * Guards that every generated SVG is well-formed and reasonably small before
 * it is written. GitHub silently refuses to render broken images, so failing
 * the build is the kinder outcome.
 */

/** Upper bound for one asset. Larger files slow the profile and hint at a bug. */
export const MAX_ASSET_BYTES = 300 * 1024;

export class AssetValidationError extends Error {
  readonly assetId: string;

  constructor(assetId: string, message: string) {
    super(`${assetId}: ${message}`);
    this.name = 'AssetValidationError';
    this.assetId = assetId;
  }
}

/** Counts `<tag` openings against `</tag>` closings, ignoring self-closing elements. */
function findUnbalancedTag(svg: string): string | undefined {
  const stack: string[] = [];
  const tagPattern = /<(\/?)([a-zA-Z][\w:-]*)[^<>]*?(\/?)>/g;
  for (const match of svg.matchAll(tagPattern)) {
    const [, closing, name, selfClosing] = match;
    if (name === undefined) continue;
    if (selfClosing === '/') continue;
    if (closing === '/') {
      if (stack.pop() !== name) return name;
    } else {
      stack.push(name);
    }
  }
  return stack[0];
}

/**
 * Throws {@link AssetValidationError} when `svg` is too large, lacks the SVG
 * root, or has mismatched element tags. Returns the byte size otherwise.
 */
export function validateSvg(assetId: string, svg: string): number {
  const bytes = Buffer.byteLength(svg, 'utf8');
  if (bytes > MAX_ASSET_BYTES) {
    throw new AssetValidationError(assetId, `is ${bytes} bytes; limit is ${MAX_ASSET_BYTES}`);
  }
  if (!svg.startsWith('<svg') || !svg.endsWith('</svg>')) {
    throw new AssetValidationError(assetId, 'is not a standalone <svg> document');
  }
  if (svg.includes('<script')) {
    throw new AssetValidationError(assetId, 'contains a <script> element');
  }
  const unbalanced = findUnbalancedTag(svg);
  if (unbalanced !== undefined) {
    throw new AssetValidationError(assetId, `has an unbalanced <${unbalanced}> element`);
  }
  return bytes;
}
