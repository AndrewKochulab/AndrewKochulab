/**
 * Minimal ambient typings for the subset of `opentype.js` v2 this project uses.
 * The package ships without type definitions; declaring only what we call keeps
 * the surface honest and type-checked.
 */
declare module 'opentype.js' {
  export interface PathCommand {
    readonly type: 'M' | 'L' | 'C' | 'Q' | 'Z';
    readonly x?: number;
    readonly y?: number;
    readonly x1?: number;
    readonly y1?: number;
    readonly x2?: number;
    readonly y2?: number;
  }

  export interface OpenTypePath {
    readonly commands: readonly PathCommand[];
    getBoundingBox(): { x1: number; y1: number; x2: number; y2: number };
  }

  export interface OpenTypeGlyph {
    readonly name: string;
    readonly advanceWidth: number;
    getPath(x: number, y: number, fontSize: number): OpenTypePath;
  }

  export interface OpenTypeFont {
    readonly unitsPerEm: number;
    readonly ascender: number;
    readonly descender: number;
    readonly tables: { os2?: { sCapHeight?: number; sxHeight?: number } };
    charToGlyph(char: string): OpenTypeGlyph;
    getKerningValue(left: OpenTypeGlyph, right: OpenTypeGlyph): number;
  }

  export interface OpenTypeModule {
    parse(buffer: ArrayBuffer): OpenTypeFont;
  }

  const opentype: OpenTypeModule;
  export default opentype;
}
