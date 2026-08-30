import { expect, test } from '@playwright/test';

import { dismissInitialNotice } from '../../src/web/notice';

test.describe('degradation: CMS media unavailable', () => {
  test('the page still renders meaningful content when CMS media requests fail', async ({ page }) => {
    // One deterministic degradation scenario (Part 5): every CMS media
    // asset is served from a fixed CloudFront origin (also asserted in the
    // API media-URL contract tests). Aborting that origin only, instead of
    // touching the CMS itself, reproduces "media temporarily unavailable"
    // without mutating or depending on shared CMS state.
    await page.route('https://d2y8b8r86vndtb.cloudfront.net/**', route => route.abort());

    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('/');
    await dismissInitialNotice(page);

    // Safe recovery: text content still renders and the app did not crash,
    // even though every image on the page failed to load.
    const headings = page.getByRole('heading');
    await expect(headings.first()).toBeVisible();
    expect(await headings.count()).toBeGreaterThan(1);
    expect(pageErrors).toEqual([]);

    for (const link of ['/menu', '/reservas', '/legal/privacy_policy']) {
      await expect(page.locator(`a[href="${link}"]`).first()).toBeVisible();
    }
  });
});
