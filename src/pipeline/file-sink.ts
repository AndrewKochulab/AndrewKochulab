/**
 * @module pipeline/file-sink
 * Where generated assets go. The pipeline writes through this interface so
 * tests can capture output in memory instead of touching the disk.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface FileSink {
  /** Writes `content` at `relativePath` (POSIX separators). */
  write(relativePath: string, content: string): Promise<void>;
}

/** Writes files under `rootDir`, creating directories as needed. */
export class DiskSink implements FileSink {
  readonly #rootDir: string;

  constructor(rootDir: string) {
    this.#rootDir = rootDir;
  }

  async write(relativePath: string, content: string): Promise<void> {
    const target = join(this.#rootDir, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
}

/** Keeps files in a map; for tests and dry runs. */
export class MemorySink implements FileSink {
  readonly files = new Map<string, string>();

  write(relativePath: string, content: string): Promise<void> {
    this.files.set(relativePath, content);
    return Promise.resolve();
  }
}
