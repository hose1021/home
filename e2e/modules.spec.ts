import {test, expect} from "@playwright/test";

/**
 * New domain modules: contractor and management-member creation via the UI.
 * Requires a seeded DB. Idempotent: names are unique per run via timestamp.
 */
test("module CRUD: contractor and board member", async ({page}) => {
  test.setTimeout(120_000);

  await page.goto("/ru/login");
  await page.getByLabel("Логин").fill("admin.admin");
  await page.getByLabel("Пароль").fill("admin123");
  await page.getByRole("button", {name: /войти/i}).click();
  await expect(page).toHaveURL(/\/ru\/?$/);

  const stamp = Date.now();

  // ── Contractor ────────────────────────────────────────────────
  await page.goto("/ru/contractors");
  await page.getByRole("button", {name: /^\+ подрядчик$/i}).click();
  await page.locator("#c-name").fill(`Тест Сантехник ${stamp}`);
  await page.locator("#c-contact").fill("Иван");
  await page.locator("#c-spec").fill("сантехника, отопление");
  await page.getByRole("button", {name: /сохранить/i}).click();
  await expect(page.getByText("Подрядчик добавлен")).toBeVisible();
  await expect(page.getByRole("row").filter({hasText: `Тест Сантехник ${stamp}`})).toBeVisible();

  // ── Management board member ───────────────────────────────────
  await page.goto("/ru/management-members");
  await page.getByRole("button", {name: /^\+ член правления$/i}).click();
  await page.locator("#m-name").fill(`Иванов Иван ${stamp}`);
  await page.locator("#m-block").fill("Блок 1");
  await page.locator("#m-pos").fill("Председатель");
  await page.getByRole("button", {name: /сохранить/i}).click();
  await expect(page.getByText("Член добавлен")).toBeVisible();
  await expect(page.getByRole("row").filter({hasText: `Иванов Иван ${stamp}`})).toBeVisible();
});
