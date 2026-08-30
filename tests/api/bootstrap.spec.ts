import { expect, test } from '@playwright/test';

import { getContent } from '../../src/api/client';
import { bootstrapDataSchema, envelopeSchema } from '../../src/contracts/schemas';

// Bootstrap is requested for both mobile platforms independently (Part 2.2):
// the two are not expected to differ structurally, but each is a distinct,
// order-independent contract check against the live, read-only CMS.
for (const platform of ['ios', 'android'] as const) {
  test.describe(`bootstrap (${platform})`, () => {
    test(`returns a structurally valid experience for ${platform}`, async ({ request }) => {
      const response = await getContent(request, 'bootstrap', { platform });
      expect(response.status()).toBe(200);

      const envelope = envelopeSchema.parse(await response.json());
      const data = bootstrapDataSchema.parse(envelope.data);

      // Structural checks only -- no assertion on which alerts/promotions
      // exist, their IDs, or their editorial copy, since that content is
      // free to change in the shared CMS.
      for (const flag of Object.values(data.featureFlags)) {
        expect(typeof flag).toBe('boolean');
      }
      for (const alert of data.alerts) {
        expect(alert.actions.length).toBeGreaterThanOrEqual(0);
        expect(['topBar', 'modal']).toContain(alert.placement);
      }
      expect(Array.isArray(data.promotions)).toBe(true);

      expect(envelope.resolvedContext?.platform).toBe(platform);
    });

    test(`navigation destinations declared for ${platform} do not exclude it`, async ({ request }) => {
      const response = await getContent(request, 'bootstrap', { platform });
      const envelope = envelopeSchema.parse(await response.json());
      const data = bootstrapDataSchema.parse(envelope.data);

      for (const item of data.navigation?.items ?? []) {
        const supported = item.destination?.supportedPlatforms;
        if (supported && supported.length > 0) {
          expect(supported).toContain(platform);
        }
      }
    });
  });
}
