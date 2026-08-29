import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterAll, describe, expect, it} from "vitest";
import {LocalFsStorage} from "./storage";

describe("LocalFsStorage", () => {
  const dirs: string[] = [];
  const storages: LocalFsStorage[] = [];

  afterAll(async () => {
    await Promise.all(storages.map((s) => s.destroy()));
  });

  async function make() {
    const dir = await mkdtemp(join(tmpdir(), "documents-"));
    dirs.push(dir);
    const storage = new LocalFsStorage(dir);
    storages.push(storage);
    return storage;
  }

  it("writes, reads and deletes an object on disk", async () => {
    const storage = await make();
    const bytes = new Uint8Array([9, 8, 7]);
    await storage.put("a/b/c", bytes);
    expect(await storage.get("a/b/c")).toEqual(bytes);
    await storage.delete("a/b/c");
    await expect(storage.get("a/b/c")).rejects.toThrow();
  });

  it("rejects key path escapes outside the root", async () => {
    const storage = await make();
    await expect(storage.put("../escape", new Uint8Array([1]))).rejects.toThrow();
    await expect(storage.get("a/../../escape")).rejects.toThrow();
  });
});
