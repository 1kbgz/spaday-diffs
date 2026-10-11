import { test, expect } from "@playwright/test";

test("added and deleted files use nullable inputs", async ({ page }) => {
  const diff = await fixture(page, { old_file: null });
  await expect(diff.locator("[data-line]")).toHaveText("value = 2");
  await diff.evaluate((el) => {
    el.old_file = { name: "app.py", contents: "removed = True\n" };
    el.new_file = null;
  });
  await expect(diff.locator("[data-line]")).toHaveText("removed = True");
  await diff.evaluate((el) => {
    el.old_file = null;
  });
  await expect(diff.getByRole("alert")).toContainText("cannot both be null");
});

test("line-click reports serializable line and side", async ({ page }) => {
  const diff = await fixture(page, { selectable: false });
  await diff.evaluate((el) => {
    window.clicks = [];
    el.addEventListener("line-click", (e) => window.clicks.push(e.detail));
  });
  await diff.locator("[data-additions] [data-line]").click();
  expect(await page.evaluate(() => window.clicks)).toEqual([
    { line: 1, side: "additions" },
  ]);
  expect(await diff.evaluate((el) => el.selected_lines)).toBeNull();
});

test("collapse and theme changes redraw without replacing the host", async ({
  page,
}) => {
  const diff = await fixture(page);
  await expect(diff.locator("[data-diffs-header]")).toBeVisible();
  await diff.evaluate((el) => {
    el.collapsed = true;
  });
  await expect(diff.locator("[data-line]")).toHaveCount(0);
  await diff.evaluate((el) => {
    el.collapsed = false;
    el.theme_type = "dark";
  });
  await expect(diff.locator("[data-line]")).toHaveCount(2);
  await expect(diff.locator("diffs-container")).toHaveCSS(
    "color-scheme",
    "dark",
  );
});

test("expands omitted context from full files", async ({ page }) => {
  const contents =
    Array.from({ length: 40 }, (_, i) => "line " + i).join("\n") + "\n";
  const diff = await fixture(page, {
    old_file: { name: "context.txt", contents },
    new_file: {
      name: "context.txt",
      contents: contents.replace("line 20", "changed 20"),
    },
  });
  await expect(diff.locator("[data-additions] [data-line]")).not.toHaveCount(
    40,
  );
  await diff.evaluate((el) => {
    el.expand_unchanged = true;
  });
  await expect(diff.locator("[data-additions] [data-line]")).toHaveCount(40);
});

async function fixture(page, props = {}) {
  await page.goto("/dist/");
  await page.evaluate(async (props) => {
    await customElements.whenDefined("spaday-diff");
    const el = document.createElement("spaday-diff");
    Object.assign(el, {
      old_file: { name: "app.py", contents: "value = 1\n" },
      new_file: { name: "app.py", contents: "value = 2\n" },
      theme_type: "light",
      ...props,
    });
    document.body.append(el);
  }, props);
  return page.locator("spaday-diff");
}

test("renders upstream diff and updates the existing container", async ({
  page,
}) => {
  const diff = await fixture(page);
  await expect(diff.locator("[data-additions] [data-line]")).toHaveText(
    "value = 2",
  );
  await diff.evaluate((el) => {
    window.originalContainer = el.firstElementChild;
    el.new_file = { name: "app.py", contents: "value = 3\n" };
  });
  await expect(diff.locator("[data-additions] [data-line]")).toHaveText(
    "value = 3",
  );
  expect(
    await diff.evaluate(
      (el) => el.firstElementChild === window.originalContainer,
    ),
  ).toBe(true);
  await diff.evaluate((el) => {
    el.diff_style = "unified";
    el.overflow = "wrap";
    el.header = false;
    el.line_numbers = false;
    el.indicators = "classic";
  });
  await expect(diff.locator("[data-diff]")).toHaveAttribute(
    "data-diff-type",
    "single",
  );
  await expect(diff.locator("[data-diff]")).toHaveAttribute(
    "data-overflow",
    "wrap",
  );
  await expect(diff.locator("[data-diffs-header]")).toHaveCount(0);
});

test("user selection emits once; programmatic selection is silent", async ({
  page,
}) => {
  const diff = await fixture(page);
  await diff.evaluate((el) => {
    window.selections = [];
    el.addEventListener("selection-change", (event) =>
      window.selections.push(event.detail),
    );
    el.selected_lines = { start: 1, end: 1, side: "deletions" };
  });
  expect(await page.evaluate(() => window.selections)).toEqual([]);
  await diff.evaluate((el) => {
    el.selected_lines = null;
  });
  await diff.locator('[data-additions] [data-column-number="1"]').click();
  await expect
    .poll(() => page.evaluate(() => window.selections.length))
    .toBe(1);
  expect(await page.evaluate(() => window.selections[0].range)).toMatchObject({
    start: 1,
    end: 1,
    side: "additions",
  });
  await diff.evaluate((el) => {
    el.selected_lines = null;
  });
  expect(await page.evaluate(() => window.selections.length)).toBe(1);
});

test("annotations are literal text and can be replaced or cleared", async ({
  page,
}) => {
  const diff = await fixture(page, {
    annotations: [
      { side: "additions", line: 1, text: "<img src=x onerror=alert(1)>" },
    ],
  });
  await expect(diff.locator(".spaday-diff-annotation")).toHaveText(
    "<img src=x onerror=alert(1)>",
  );
  await expect(diff.locator("img")).toHaveCount(0);
  await diff.evaluate((el) => {
    el.annotations = [{ side: "additions", line: 1, text: "Updated note" }];
  });
  await expect(diff.locator(".spaday-diff-annotation")).toHaveText(
    "Updated note",
  );
  await diff.evaluate((el) => {
    el.annotations = [];
  });
  await expect(diff.locator(".spaday-diff-annotation")).toHaveCount(0);
});

test("patch file selection, errors, and return to complete files", async ({
  page,
}) => {
  const patch =
    "--- a/one.txt\n+++ b/one.txt\n@@ -1 +1 @@\n-old\n+first\n--- a/two.txt\n+++ b/two.txt\n@@ -1 +1 @@\n-old\n+second\n";
  const diff = await fixture(page, { patch });
  await expect(diff.locator("[data-additions] [data-line]")).toHaveText(
    "first",
  );
  await diff.evaluate((el) => {
    el.patch_file = 1;
  });
  await expect(diff.locator("[data-additions] [data-line]")).toHaveText(
    "second",
  );
  await diff.evaluate((el) => {
    window.errors = [];
    el.addEventListener("render-error", (event) =>
      window.errors.push(event.detail),
    );
    el.patch_file = 8;
  });
  await expect(diff.getByRole("alert")).toContainText("patch_file");
  expect(await page.evaluate(() => window.errors.length)).toBe(1);
  await diff.evaluate((el) => {
    el.patch = null;
  });
  await expect(diff.locator("[data-additions] [data-line]")).toHaveText(
    "value = 2",
  );
});

test("disconnect and reconnect restores source and selection", async ({
  page,
}) => {
  const diff = await fixture(page);
  await expect(diff.locator("[data-additions]")).toBeVisible();
  await diff.evaluate((el) => {
    el.selected_lines = { start: 1, end: 1, side: "additions" };
    el.remove();
    document.body.append(el);
  });
  await expect(diff.locator("diffs-container")).toHaveCount(1);
  await expect(diff.locator("[data-additions] [data-line]")).toHaveText(
    "value = 2",
  );
  expect(await diff.evaluate((el) => el.selected_lines)).toEqual({
    start: 1,
    end: 1,
    side: "additions",
  });
});

test("tokens inherit from ancestors and override the upstream shadow host", async ({
  page,
}) => {
  const diff = await fixture(page);
  await page.evaluate(() => {
    document.body.style.setProperty("--spa-diffs-surface", "rgb(20, 30, 40)");
    document.body.style.setProperty("--spa-success", "rgb(10, 200, 100)");
  });
  await expect(diff.locator("diffs-container")).toHaveCSS(
    "background-color",
    "rgb(20, 30, 40)",
  );
  expect(
    await diff
      .locator("diffs-container")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--diffs-addition-base").trim(),
      ),
  ).toBe("rgb(10, 200, 100)");
});

test("content updates preserve page scroll and horizontal code scroll", async ({
  page,
}) => {
  const diff = await fixture(page, {
    old_file: {
      name: "long.txt",
      contents: ("old " + "x".repeat(250) + "\n").repeat(100),
    },
    new_file: {
      name: "long.txt",
      contents: ("new " + "x".repeat(250) + "\n").repeat(100),
    },
  });
  await expect(diff.locator("[data-additions]")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 700));
  const before = await page.evaluate(() => window.scrollY);
  await diff.locator("[data-additions]").evaluate((el) => {
    el.scrollLeft = 120;
  });
  await diff.evaluate((el) => {
    el.new_file = {
      ...el.new_file,
      contents: el.new_file.contents.replace("new", "updated"),
    };
  });
  await expect(
    diff.locator("[data-additions] [data-line]").first(),
  ).toContainText("updated");
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  expect(
    await diff.locator("[data-additions]").evaluate((el) => el.scrollLeft),
  ).toBe(120);
});

test("Python example round-trips selection and controls", async ({ page }) => {
  await page.goto("http://127.0.0.1:8017");
  const diff = page.locator("#review-diff");
  await diff.locator('[data-additions] [data-column-number="2"]').click();
  await expect(page.locator("#sync-status")).toContainText(
    "Python received lines 2–2",
  );
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect.poll(() => diff.evaluate((el) => el.selected_lines)).toBeNull();
  await page.getByRole("button", { name: "Toggle layout" }).click();
  await expect(diff.locator("[data-diff]")).toHaveAttribute(
    "data-diff-type",
    "single",
  );
  await page.getByRole("button", { name: "Toggle wrapping" }).click();
  await expect(diff.locator("[data-diff]")).toHaveAttribute(
    "data-overflow",
    "wrap",
  );
  const before = Number(await page.locator("#revision").innerText());
  await page.getByRole("button", { name: "Next revision" }).click();
  await expect
    .poll(async () => Number(await page.locator("#revision").innerText()))
    .toBeGreaterThan(before);
  await expect(page.locator("#patch-diff [data-line]").last()).toBeVisible();
  await expect(
    page.locator("#dark-diff .spaday-diff-annotation"),
  ).toBeVisible();
});
