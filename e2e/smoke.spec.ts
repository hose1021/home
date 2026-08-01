import {test, expect} from "@playwright/test";

test("login page is available", async ({page}) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", {name: /войти/i})).toBeVisible();
});
