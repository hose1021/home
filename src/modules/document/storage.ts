import {mkdir, readFile, realpath, rm, writeFile} from "node:fs/promises";
import {dirname, join, resolve, sep} from "node:path";

/** Storage seam (spec #1): the only place that knows where document bytes live. */
export interface Storage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}

/** Random, sharded object key — the original file name never reaches the disk path. */
export function newObjectKey(): string {
  const id = crypto.randomUUID();
  return `${id.slice(0, 2)}/${id}`;
}

export class InMemoryStorage implements Storage {
  private objects = new Map<string, Uint8Array>();

  async put(key: string, bytes: Uint8Array): Promise<void> {
    this.objects.set(key, bytes);
  }

  async get(key: string): Promise<Uint8Array> {
    const bytes = this.objects.get(key);
    if (!bytes) throw new Error(`Object not found: ${key}`);
    return bytes;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}

export class LocalFsStorage implements Storage {
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = resolve(rootDir);
  }

  private resolveKey(key: string): string {
    const path = resolve(this.root, key);
    if (path !== this.root && !path.startsWith(this.root + sep)) {
      throw new Error(`Invalid object key: ${key}`);
    }
    return path;
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    const path = this.resolveKey(key);
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, bytes);
  }

  async get(key: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(this.resolveKey(key)));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), {force: true});
  }

  /** Test helper: remove the whole storage tree. */
  async destroy(): Promise<void> {
    await rm(this.root, {recursive: true, force: true});
  }
}

/** Root directory from env so the docker volume can be pointed at the store. */
export async function createDefaultStorage(): Promise<Storage> {
  const rootDir = process.env.DOCUMENTS_DIR ?? join(process.cwd(), "data", "documents");
  const storage = new LocalFsStorage(rootDir);
  await realpath(rootDir).catch(async () => {
    await mkdir(rootDir, {recursive: true});
  });
  return storage;
}
