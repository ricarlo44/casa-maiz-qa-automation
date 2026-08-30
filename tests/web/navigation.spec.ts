import { expect, test } from '@playwright/test';

import { dismissInitialNotice } from '../../src/web/notice';

test.describe('navigation', () => {
  test('dismisses the initial notice and navigates to Menu using a user-facing control', async ({ page }) => {
    await page.goto('/');
    const notice = page.getByRole('heading', { name: 'AVISO DE CIERRE' });
    await expect(notice).toBeVisible();

    await dismissInitialNotice(page);
    await expect(notice).toBeHidden();

    await page.locator('a[href="/menu"]').first().click();
    await page.waitForURL('**/menu');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('navigates to Privacy using a user-facing control', async ({ page }) => {
    await page.goto('/');
    await dismissInitialNotice(page);

    await page.locator('a[href="/legal/privacy_policy"]').first().click();
    await page.waitForURL('**/legal/privacy_policy');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
