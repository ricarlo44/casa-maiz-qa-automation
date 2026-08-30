import { expect, test } from '@playwright/test';

import { getContent } from '../../src/api/client';
import { envelopeSchema, legalContentSchema, pageSchema } from '../../src/contracts/schemas';

for (const slug of ['home', 'menu'] as const) {
  test.describe(`page: ${slug}`, () => {
    test(`delivers a renderable ${slug} layout with a usable blockType per block`, async ({ request }) => {
      const response = await getContent(request, `pages/${slug}`);
      expect(response.status()).toBe(200);

      const envelope = envelopeSchema.parse(await response.json());
      const page = pageSchema.parse(envelope.data);

      expect(page.slug).toBe(slug);
      // Coherent metadata: a title and a real update timestamp, not asserted
      // against fixed editorial copy.
      expect(page.title.trim().length).toBeGreaterThan(0);
      expect(Number.isNaN(new Date(page.updatedAt).getTime())).toBe(false);

      for (const block of page.layout) {
        expect(block.blockType.trim().length).toBeGreaterThan(0);
      }
    });

    test(`is delivered consistently for both mobile platforms`, async ({ request }) => {
      const [ios, android] = await Promise.all([
        getContent(request, `pages/${slug}`, { platform: 'ios' }),
        getContent(request, `pages/${slug}`, { platform: 'android' }),
      ]);
      expect(ios.status()).toBe(200);
      expect(android.status()).toBe(200);

      const iosEnvelope = envelopeSchema.parse(await ios.json());
      const androidEnvelope = envelopeSchema.parse(await android.json());
      expect(iosEnvelope.resolvedContext?.platform).toBe('ios');
      expect(androidEnvelope.resolvedContext?.platform).toBe('android');
    });
  });
}

test.describe('legal: privacy_policy', () => {
  test('delivers legal content coherent enough to render', async ({ request }) => {
    const response = await getContent(request, 'legal/privacy_policy');
    expect(response.status()).toBe(200);

    const envelope = envelopeSchema.parse(await response.json());
    const legal = legalContentSchema.parse(envelope.data);

    expect(legal.title.trim().length).toBeGreaterThan(0);
  });
});
