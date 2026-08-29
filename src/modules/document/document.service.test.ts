import {beforeEach, describe, expect, it, vi} from "vitest";
import {DocumentError, archiveDocument, deleteDocument, getDocumentObject, uploadDocument, validateUpload} from "./document.service";
import {InMemoryStorage, newObjectKey} from "./storage";

const {insert, returning, updateReturning, deleteWhere, selectLimit, writeAuditLog} = vi.hoisted(() => ({
  insert: vi.fn(),
  returning: vi.fn(),
  updateReturning: vi.fn(),
  deleteWhere: vi.fn(),
  selectLimit: vi.fn(),
  writeAuditLog: vi.fn(),
}));
vi.mock("@/core/db", () => ({
  db: {
    insert,
    update: vi.fn(() => ({set: () => ({where: () => ({returning: updateReturning})})})),
    delete: vi.fn(() => ({where: () => deleteWhere()})),
    select: vi.fn(() => ({from: () => ({where: () => ({limit: selectLimit})})})),
  },
}));
vi.mock("@/core/audit/audit.service", () => ({writeAuditLog}));

beforeEach(() => {
  insert.mockReset().mockImplementation(() => ({values: () => ({returning})}));
  updateReturning.mockReset();
  deleteWhere.mockReset().mockResolvedValue(undefined);
  selectLimit.mockReset();
  returning.mockReset();
  writeAuditLog.mockReset();
});

describe("getDocumentObject", () => {
  const row = {
    id: "d1", tenantId: "t1", title: "Договор", category: "contract", description: null,
    originalFileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 3,
    objectKey: "ab/xyz", status: "active", createdAt: new Date(), updatedAt: new Date(),
  };

  it("serves the stored bytes for the document's own tenant", async () => {
    selectLimit.mockResolvedValue([row]);
    const storage = new InMemoryStorage();
    await storage.put("ab/xyz", new Uint8Array([7, 7, 7]));

    const {document, bytes} = await getDocumentObject("t1", "d1", storage);

    expect(document.originalFileName).toBe("a.pdf");
    expect(bytes).toEqual(new Uint8Array([7, 7, 7]));
  });

  it("hides documents of other tenants behind not_found", async () => {
    selectLimit.mockResolvedValue([{...row, tenantId: "other"}]);
    const storage = new InMemoryStorage();
    await storage.put("ab/xyz", new Uint8Array([7]));

    await expect(getDocumentObject("t1", "d1", storage)).rejects.toThrow(DocumentError);
  });

  it("hides missing documents behind not_found", async () => {
    selectLimit.mockResolvedValue([]);
    await expect(getDocumentObject("t1", "d1", new InMemoryStorage())).rejects.toThrow(DocumentError);
  });
});

describe("archiveDocument", () => {
  it("flips active to archived and audits the old status", async () => {
    selectLimit.mockResolvedValue([{id: "d1", tenantId: "t1", status: "active"}]);
    updateReturning.mockResolvedValue([{id: "d1", status: "archived"}]);

    const updated = await archiveDocument("t1", "d1", "u1");

    expect(updated.status).toBe("archived");
    expect(writeAuditLog).toHaveBeenCalledTimes(1);
    expect(writeAuditLog.mock.calls[0]?.[0]).toMatchObject({
      action: "update", entityType: "document",
      oldValues: {status: "active"}, newValues: {status: "archived"},
    });
  });

  it("is a no-op for an already archived document", async () => {
    selectLimit.mockResolvedValue([{id: "d1", tenantId: "t1", status: "archived"}]);

    const updated = await archiveDocument("t1", "d1", "u1");

    expect(updated.status).toBe("archived");
    expect(writeAuditLog).not.toHaveBeenCalled();
  });
});

describe("deleteDocument", () => {
  it("removes the record, the stored object and audits", async () => {
    selectLimit.mockResolvedValue([{id: "d1", tenantId: "t1", title: "Договор", status: "active", objectKey: "ab/xyz"}]);
    const storage = new InMemoryStorage();
    await storage.put("ab/xyz", new Uint8Array([1]));
    const delSpy = vi.spyOn(storage, "delete");

    await deleteDocument("t1", "d1", "u1", storage);

    expect(deleteWhere).toHaveBeenCalledTimes(1);
    expect(delSpy).toHaveBeenCalledWith("ab/xyz");
    await expect(storage.get("ab/xyz")).rejects.toThrow();
    expect(writeAuditLog.mock.calls[0]?.[0]).toMatchObject({action: "delete", entityType: "document", oldValues: {title: "Договор"}});
  });

  it("succeeds when the stored object is already gone", async () => {
    selectLimit.mockResolvedValue([{id: "d1", tenantId: "t1", title: "Договор", status: "active", objectKey: "ab/xyz"}]);
    const storage = new InMemoryStorage();

    await expect(deleteDocument("t1", "d1", "u1", storage)).resolves.toBeUndefined();
  });
});

describe("deleteDocument-failure", () => {

  it("keeps the record deleted and keeps serving when storage delete fails", async () => {
    selectLimit.mockResolvedValue([{id: "d1", tenantId: "t1", title: "Договор", status: "active", objectKey: "ab/xyz"}]);
    const storage = new InMemoryStorage();
    vi.spyOn(storage, "delete").mockRejectedValue(new Error("disk on fire"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteDocument("t1", "d1", "u1", storage)).resolves.toBeUndefined();
    expect(writeAuditLog).toHaveBeenCalledTimes(1);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining("ab/xyz"), expect.any(Error));
    errSpy.mockRestore();
  });
});

describe("uploadDocument", () => {
  const input = {
    title: "Договор",
    category: "contract" as const,
    fileName: "protokol-3.pdf",
    mimeType: "application/pdf",
    bytes: new Uint8Array([1, 2, 3]),
  };

  it("stores bytes through the seam and records metadata with audit", async () => {
    returning.mockResolvedValue([{id: "d1", title: "Договор", category: "contract", sizeBytes: 3, objectKey: "ab/xyz"}]);
    const storage = new InMemoryStorage();
    const putSpy = vi.spyOn(storage, "put");

    const created = await uploadDocument("t1", "u1", input, storage);

    expect(created.id).toBe("d1");
    const storedKey = putSpy.mock.calls[0]?.[0];
    expect(storedKey).toMatch(/^[0-9a-f]{2}\/[0-9a-f-]{36}$/);
    expect(await storage.get(storedKey as string)).toEqual(input.bytes);
    expect(writeAuditLog).toHaveBeenCalledTimes(1);
    expect(writeAuditLog.mock.calls[0]?.[0]).toMatchObject({tenantId: "t1", userId: "u1", action: "create", entityType: "document"});
  });

  it("removes the stored object when the metadata insert fails", async () => {
    returning.mockRejectedValue(new Error("db down"));
    const storage = new InMemoryStorage();
    const cleanup = vi.spyOn(storage, "delete");

    await expect(uploadDocument("t1", "u1", input, storage)).rejects.toThrow("db down");
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe("validateUpload", () => {
  const valid = {fileName: "protokol-3.pdf", mimeType: "application/pdf", sizeBytes: 1024, category: "protocol"};

  it("accepts a valid upload", () => {
    expect(() => validateUpload(valid)).not.toThrow();
  });

  it.each(["application/pdf", "image/png", "image/jpeg", "image/webp", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"])(
    "accepts whitelisted mime %s",
    (mimeType) => {
      expect(() => validateUpload({...valid, mimeType})).not.toThrow();
    },
  );

  it("rejects an empty file with empty_file code", () => {
    try {
      validateUpload({...valid, sizeBytes: 0});
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(DocumentError);
      expect((err as DocumentError).code).toBe("empty_file");
    }
  });

  it("rejects a file over the size limit with too_large code", () => {
    try {
      validateUpload({...valid, sizeBytes: 25 * 1024 * 1024 + 1});
      expect.unreachable();
    } catch (err) {
      expect((err as DocumentError).code).toBe("too_large");
      expect((err as DocumentError).statusCode).toBe(413);
    }
  });

  it("rejects a non-whitelisted mime with forbidden_mime code", () => {
    try {
      validateUpload({...valid, mimeType: "application/x-msdownload"});
      expect.unreachable();
    } catch (err) {
      expect((err as DocumentError).code).toBe("forbidden_mime");
    }
  });
});

describe("newObjectKey", () => {
  it("never contains the original file name", () => {
    for (let i = 0; i < 20; i++) {
      const key = newObjectKey();
      expect(key).not.toMatch(/protokol/i);
    }
  });

  it("generates unique keys", () => {
    const keys = new Set(Array.from({length: 50}, () => newObjectKey()));
    expect(keys.size).toBe(50);
  });
});

describe("DocumentError", () => {
  it("carries machine codes for the action boundary", () => {
    expect(new DocumentError("not_found").statusCode).toBe(404);
    expect(new DocumentError("empty_file").statusCode).toBe(400);
    expect(new DocumentError("too_large").statusCode).toBe(413);
    expect(new DocumentError("forbidden_mime").statusCode).toBe(400);
  });
});

describe("InMemoryStorage", () => {
  it("round-trips put/get/delete without touching the filesystem", async () => {
    const storage = new InMemoryStorage();
    await storage.put("k1", new Uint8Array([1, 2, 3]));
    expect(await storage.get("k1")).toEqual(new Uint8Array([1, 2, 3]));
    await storage.delete("k1");
    await expect(storage.get("k1")).rejects.toThrow();
  });
});
