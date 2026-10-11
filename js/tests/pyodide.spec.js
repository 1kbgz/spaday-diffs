import { existsSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("Pyodide runs the Python example and transports round trips", async ({
  page,
}) => {
  test.skip(
    !existsSync("dist/lite/index.html") &&
      process.env.SPADAY_DIFFS_PYODIDE_ONLY !== "1",
    "Build with make pyodide-example first",
  );
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/dist/lite/");
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.ready === "true" ||
      !document.querySelector("#pyodide-error").hidden,
    undefined,
    { timeout: 150000 },
  );
  await expect(page.locator("#pyodide-error")).toBeHidden();
  const diff = page.locator("#review-diff");
  await expect(
    diff.locator("[data-additions] [data-line]").last(),
  ).toContainText("return round");
  await diff.locator('[data-additions] [data-column-number="2"]').click();
  await expect(page.locator("#sync-status")).toContainText(
    "Python received lines 2–2",
  );
  await page.getByRole("button", { name: "Toggle layout" }).click();
  await expect(diff.locator("[data-diff]")).toHaveAttribute(
    "data-diff-type",
    "single",
  );
  const before = Number(await page.locator("#revision").innerText());
  await page.getByRole("button", { name: "Next revision" }).click();
  await expect
    .poll(async () => Number(await page.locator("#revision").innerText()))
    .toBeGreaterThan(before);
  await page.locator("#gallery").scrollIntoViewIfNeeded();
  const scroll = await page.evaluate(() => window.scrollY);
  const next = Number(await page.locator("#revision").innerText());
  await expect
    .poll(async () => Number(await page.locator("#revision").innerText()), {
      timeout: 15000,
    })
    .toBeGreaterThan(next);
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  await expect(page.locator("#patch-diff [data-line]").last()).toBeVisible();
  expect(errors).toEqual([]);
});
