import {test, expect} from "@playwright/test";

/**
 * Finance edit paths: entering an actual expense (budget fact) and topping up a fund.
 * Requires a seeded DB (npm run db:migrate && npm run db:seed).
 * Idempotent: values are re-entered; fund balance is computed relative to the current one.
 */
test("budget fact entry and fund top-up", async ({page}) => {
  test.setTimeout(120_000);

  // Login as the seeded admin
  await page.goto("/ru/login");
  await page.getByLabel("Логин").fill("admin.admin");
  await page.getByLabel("Пароль").fill("admin123");
  await page.getByRole("button", {name: /войти/i}).click();
  await expect(page).toHaveURL(/\/ru\/?$/);

  // ── P1.4: enter an actual expense for article 5010 ─────────────
  await page.goto("/ru/finance/budget");
  const salaryRow = page.getByRole("row").filter({hasText: "Зарплата персонала"});
  await salaryRow.getByRole("button", {name: "Ред."}).click();
  await page.locator('input[name="actualAmount"]').fill("700.00");
  await page.getByRole("button", {name: "Сохранить"}).click();
  await expect(page.getByText("Статья обновлена")).toBeVisible();
  await expect(salaryRow.getByText("700.00")).toBeVisible();

  // The income/expense report reflects the entered fact
  await page.goto("/ru/reports");
  await page.getByRole("button", {name: "Доходы и расходы"}).click();
  await expect(page.getByText("700.00")).toBeVisible();

  // Plan edits on an approved budget are still blocked
  await page.goto("/ru/finance/budget");
  await salaryRow.getByRole("button", {name: "Ред."}).click();
  await page.locator('input[name="plannedAmount"]').fill("999.00");
  await page.getByRole("button", {name: "Сохранить"}).click();
  await expect(page.getByText("Утверждённый бюджет нельзя изменять")).toBeVisible();

  // ── P1.5: top up the first fund ────────────────────────────────
  await page.goto("/ru/finance");
  await page.getByRole("button", {name: "Фонды"}).click();
  const fundCard = page.locator(".py-5").filter({has: page.getByRole("button", {name: /пополнить/i})}).first();
  const fundName = (await fundCard.locator(".text-base").textContent())!;
  const before = Number((await fundCard.locator(".font-bold.text-lg").textContent())?.match(/[\d.]+/)?.[0] ?? "0");

  await fundCard.getByRole("button", {name: /пополнить/i}).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").fill("100.00");
  await dialog.getByRole("button", {name: /^пополнить$/i}).click();
  await expect(page.getByText("Фонд пополнен")).toBeVisible();

  // The topped-up fund's card shows the new balance, whatever the card order
  await expect(
    page.locator(".py-5").filter({hasText: fundName}).locator(".font-bold.text-lg"),
  ).toHaveText(`${(before + 100).toFixed(2)} ₼`);
});
