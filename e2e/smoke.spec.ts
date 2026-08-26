import {test, expect} from "@playwright/test";

test("login page is available", async ({page}) => {
  await page.goto("/ru/login");
  await expect(page).toHaveURL(/\/ru\/login$/);
  await expect(page.getByRole("button", {name: /войти/i})).toBeVisible();
});
