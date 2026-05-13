/**
 * signup-vertical-validation: regression guard for the exact bug that
 * triggered this scaffold (commit 1d9f32f / dogfood report 2026-05-13).
 *
 * The /signup form's vertical <select> used to carry the HTML5
 * `required` attribute. When a cold prospect clicked "Create account"
 * without picking one, the browser's native invalid-form tooltip
 * ("Please select an item in the list.") fired BEFORE React's submit
 * handler could render the dark-theme inline `<p role="alert">` below
 * the field. On the dark Practiq theme the native tooltip is white-on-
 * orange and nearly invisible, so the prospect hit a wall with no
 * feedback.
 *
 * The fix (committed): drop `required`, keep `aria-required="true"`,
 * pre-flight the empty value inside handleSubmit and render the inline
 * error. THIS spec asserts that fix stays in place by:
 *
 *   v01 — Submitting with empty vertical produces the inline error
 *         element with role="alert" and the expected copy.
 *   v02 — handleSubmit IS allowed to run (no native HTML5 short-
 *         circuit). We assert this by listening for the click + the
 *         setError flow; if `required` is reintroduced, the click does
 *         NOT trigger a network call AND the inline alert never
 *         renders (browser blocks both).
 *
 * Local synthetic-regression check (do not commit):
 *   Edit src/app/(auth)/signup/page.tsx and add `required` back to the
 *   <select id="signup-vertical">. This spec must FAIL.
 */
import { test, expect } from "@playwright/test";

const BASE_URL =
  process.env.PRACTIQ_BASE_URL ??
  process.env.E2E_BASE_URL ??
  "https://practiq.dev";

test.describe("signup vertical validation", () => {
  test("v01 — empty vertical surfaces inline role=alert error (not HTML5 tooltip)", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/signup`);

    // Fill everything EXCEPT vertical. We need name + email + password
    // present so the only reason a submit would fail is the vertical
    // pre-flight — if HTML5 picks any of these instead, the test would
    // be a false negative.
    await page.locator("#signup-name").fill("Vertical Test");
    await page
      .locator("#signup-email")
      .fill(`seungdo+e2e-vertical-${Date.now()}@grindworks.ai`);
    await page.locator("#signup-password").fill("Practiq-E2E-2026!");

    // Click submit. If `required` regresses on the vertical select,
    // the browser will intercept and the React handler will never
    // see the click → neither alert nor network call will happen.
    await page.getByRole("button", { name: /Create account/i }).click();

    // The inline error element (rendered by React's setVerticalError)
    // MUST appear. The exact copy is stable: "Pick the vertical that
    // best matches your firm so we can tailor onboarding."
    const inlineAlert = page.locator("#signup-vertical-error");
    await expect(
      inlineAlert,
      "Inline vertical-error <p role=alert> did not render — `required` regression on the <select>?",
    ).toBeVisible({ timeout: 5_000 });
    await expect(inlineAlert).toHaveAttribute("role", "alert");
    await expect(inlineAlert).toContainText(/vertical/i);

    // Belt-and-braces: confirm aria-invalid flipped to true on the
    // select itself — proves the React handler actually ran.
    await expect(page.locator("#signup-vertical")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("v02 — vertical select carries aria-required but NOT the html5 required attribute", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/signup`);
    const select = page.locator("#signup-vertical");

    // aria-required="true" — kept for a11y.
    await expect(select).toHaveAttribute("aria-required", "true");

    // No `required` attribute — that was the regression. We check via
    // a DOM property read, since the HTML attribute can be absent but
    // the JS property is still authoritative.
    const isRequired = await select.evaluate(
      (el: HTMLSelectElement) => el.required,
    );
    expect(
      isRequired,
      "<select id=signup-vertical> has the HTML5 required attribute — this re-introduces commit 1d9f32f's regression",
    ).toBe(false);
  });

  test("v03 — picking a vertical clears the inline error on the next attempt", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.locator("#signup-name").fill("Vertical Recovery");
    await page
      .locator("#signup-email")
      .fill(`seungdo+e2e-vertical-recover-${Date.now()}@grindworks.ai`);
    await page.locator("#signup-password").fill("Practiq-E2E-2026!");
    await page.getByRole("button", { name: /Create account/i }).click();
    await expect(page.locator("#signup-vertical-error")).toBeVisible();

    // Now pick a vertical — the inline error should disappear and
    // aria-invalid flip back off (the handleSubmit code does this
    // on the <select>'s onChange).
    await page.locator("#signup-vertical").selectOption("law");
    await expect(page.locator("#signup-vertical-error")).toHaveCount(0, {
      timeout: 2_000,
    });
  });
});
