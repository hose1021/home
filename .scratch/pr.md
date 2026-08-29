## Ticket #2 — first vertical slice of the documents module (spec #1)

### What's included
- **Storage seam**: a `Storage` interface (put/get/delete by random sharded key), a FS adapter with path-escape protection, an in-memory implementation for tests. The original file name never reaches the disk path
- **Schema**: a `documents` table with a composite tenant FK `(tenant_id, created_by) → users(tenant_id, id)` — the migrations 0022/0023 pattern; migration 0024
- **Service**: upload/list with coded errors per ADR-0001 (`not_found`, `empty_file`, `too_large`, `forbidden_mime`), audit via `writeAuditLog`, stored-object cleanup on insert failure
- **UI**: the `/documents` page with an upload dialog (title, category, description, file), category badges, uploaded-by/when metadata
- **Permissions**: `document:write` → management_member; `document:read` → commandant (per the spec's user stories)
- **Translations**: ru/az/en
- **Ops**: named volume + `DOCUMENTS_DIR` in docker-compose.prod, `bodySizeLimit: 25mb`

### Review
Two parallel reviews (standards + spec). Fixed: request body limit (25 MB was unreachable through the 10 MB server-action cap), the composite tenant-FK, dead code, duplicated category unions, orphaned file on insert failure.

### Verification
- 115 unit tests green (+25 new: validateUpload, DocumentError, newObjectKey, InMemoryStorage, uploadDocument with a mocked db, LocalFsStorage against a temp directory)
- `tsc --noEmit` clean, eslint 0 warnings
- Migration applied to the dev database

Closes #2
