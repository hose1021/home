import {test, expect} from "@playwright/test";

/**
 * Documents: upload via the UI, then download with the original file name.
 * Requires a seeded DB. Idempotent: titles are unique per run via timestamp.
 */
test("documents: upload and download round trip", async ({page}) => {
  test.setTimeout(120_000);

  await page.goto("/ru/login");
  await page.getByLabel("Логин").fill("admin.admin");
  await page.getByLabel("Пароль").fill("admin123");
  await page.getByRole("button", {name: /войти/i}).click();
  await expect(page).toHaveURL(/\/ru\/?$/);

  const title = `Тестовый документ ${Date.now()}`;

  // ── Upload ────────────────────────────────────────────────────
  await page.goto("/ru/documents");
  await page.getByRole("button", {name: /^\+ документ$/i}).click();
  await page.locator("#d-title").fill(title);
  await page.locator("#d-category").selectOption("other");
  await page.locator("#d-file").setInputFiles({
    name: `protokol-${Date.now()}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test document bytes"),
  });
  await page.getByRole("button", {name: /создать$/i}).click();
  await expect(page.getByText("Документ загружен")).toBeVisible();

  const row = page.locator(".surface-panel").filter({hasText: title});
  await expect(row).toBeVisible();

  // ── Download: served under the original name ─────────────────
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    row.getByRole("link", {name: /скачать/i}).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^protokol-\d+\.pdf$/);
});

test("documents: download requires authentication", async ({request}) => {
  const anon = await request.get("/api/documents/00000000-0000-4000-8000-000000000000/download");
  expect(anon.status()).toBe(401);
});

test("documents: download refuses unknown id with 404", async ({page}) => {
  await page.goto("/ru/login");
  await page.getByLabel("Логин").fill("admin.admin");
  await page.getByLabel("Пароль").fill("admin123");
  await page.getByRole("button", {name: /войти/i}).click();
  await expect(page).toHaveURL(/\/ru\/?$/);

  const resp = await page.request.get("/api/documents/00000000-0000-4000-8000-000000000000/download");
  expect(resp.status()).toBe(404);
});
