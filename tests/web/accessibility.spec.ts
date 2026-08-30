import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { dismissInitialNotice } from '../../src/web/notice';

test.describe('accessibility', () => {
  test('home has no serious or critical automated accessibility violations', async ({ page }) => {
    await page.goto('/');
    await dismissInitialNotice(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const blocking = results.violations.filter(
      violation => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(
      blocking,
      blocking.map(v => `${v.id}: ${v.help} (${v.nodes.length} node(s))`).join('\n'),
    ).toEqual([]);
  });

  test('every CMS-driven image carries meaningful alternative text', async ({ page }) => {
    await page.goto('/');
    await dismissInitialNotice(page);

    const images = await page.locator('img').all();
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      const alt = await image.getAttribute('alt');
      expect(alt, `image with src=${await image.getAttribute('src')}`).toBeTruthy();
      expect(alt!.trim().length).toBeGreaterThan(0);
    }
  });
});
