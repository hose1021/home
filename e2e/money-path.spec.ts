import {test, expect} from "@playwright/test";

/**
 * Money path end-to-end: login → pay an open month → receipt → report.
 * Requires a seeded DB (npm run db:migrate && npm run db:seed).
 * Idempotent: if every month is already paid, the payment step is skipped;
 * the receipt link always exists in the payment history.
 */
test("money path: payment → receipt → report", async ({page}) => {
  test.setTimeout(120_000);

  // 1. Login as the seeded admin
  await page.goto("/ru/login");
  await page.getByLabel("Логин").fill("admin.admin");
  await page.getByLabel("Пароль").fill("admin123");
  await page.getByRole("button", {name: /войти/i}).click();
  await expect(page).toHaveURL(/\/ru\/?$/);

  // 2. Open the first owner
  await page.goto("/ru/owners");
  await expect(page.getByRole("heading", {name: /собственники/i})).toBeVisible();
  // Admin Admin (first in the list) owns no units — pick the second owner
  await page.locator("a[href*='/owners/']").nth(1).click();
  await expect(page).toHaveURL(/\/ru\/owners\/[0-9a-f-]{36}/);

  // 3. Pay an open month (skipped when everything is already paid)
  const payButton = page.getByRole("button", {name: /^оплатить$/i}).first();
  if (await payButton.isVisible()) {
    await payButton.click();
    await page.getByRole("button", {name: /^оплатить \d/i}).click();
    await expect(page.getByText("Платёж проведён")).toBeVisible();
  }

  // 4. Open the receipt from the payment history
  const receiptLink = page.getByRole("link", {name: /квитанция/i}).first();
  await expect(receiptLink).toBeVisible();
  await receiptLink.click();
  await expect(page).toHaveURL(/\/ru\/receipt\/[0-9a-f-]{36}/);

  // 5. Receipt content: title, payer, amount
  await expect(page.getByRole("heading", {name: /квитанция об оплате/i})).toBeVisible();
  await expect(page.getByText("Плательщик")).toBeVisible();

  // 6. Reports render the actual balance card
  await page.goto("/ru/reports");
  await page.getByRole("button", {name: /доходы и расходы/i}).click();
  await expect(page.getByText("Фактический баланс")).toBeVisible();
});
