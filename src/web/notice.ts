import type { Page } from '@playwright/test';

/**
 * The CMS alert used on the published site has frequency "always" (see the
 * live bootstrap payload), so a fresh page load shows it on every visit.
 * Every web test that needs to interact with the page below the fold
 * dismisses it first through its real accessible name, shared here so the
 * three spec files that need it stay consistent without a page-object layer.
 */
export const dismissInitialNotice = async (page: Page): Promise<void> => {
  const dismiss = page.getByRole('button', { name: 'Cerrar aviso' });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
};
