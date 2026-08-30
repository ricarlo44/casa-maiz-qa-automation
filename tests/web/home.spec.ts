import { expect, test } from '@playwright/test';

test.describe('home', () => {
  test('loads meaningful, CMS-driven content rather than a blank or error shell', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Casa Ma[ií]z/i);
    // The page renders whatever the CMS currently delivers as its hero and
    // promotional headings -- asserted structurally (present, non-empty,
    // there is more than one), not against specific editorial copy that the
    // CMS is free to change.
    const headings = page.getByRole('heading');
    await expect(headings.first()).toBeVisible();
    expect(await headings.count()).toBeGreaterThan(1);

    for (const text of await headings.allTextContents()) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });

  test('exposes the main navigation destinations from the CMS navigation contract', async ({ page }) => {
    await page.goto('/');
    // Same destinations the mobile bootstrap contract publishes (Part 2.2):
    // home, menu, reservations, privacy.
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
    await expect(page.locator('a[href="/menu"]').first()).toBeVisible();
    await expect(page.locator('a[href="/reservas"]').first()).toBeVisible();
    await expect(page.locator('a[href="/legal/privacy_policy"]').first()).toBeVisible();
  });
});
