import { expect, test } from '@playwright/test';

import { getContent } from '../../src/api/client';
import { isValidNextChangeAt, isWithinCacheWindow } from '../../src/contracts/cache';
import { envelopeSchema } from '../../src/contracts/schemas';

test.describe('cache boundary: nextChangeAt', () => {
  test('a live envelope, when it carries nextChangeAt, uses a parseable ISO date-time', async ({ request }) => {
    const response = await getContent(request, 'bootstrap');
    const envelope = envelopeSchema.parse(await response.json());

    // nextChangeAt is optional in the envelope (content with no scheduled
    // transition omits it), so this only asserts the format when present --
    // it must never fail a run just because nothing is scheduled today.
    if (envelope.nextChangeAt) {
      expect(isValidNextChangeAt(envelope.nextChangeAt)).toBe(true);
    }
  });

  // The boundary rule itself is pure logic shared with the mobile client
  // (src/contracts/cache.ts mirrors payload-mobile-consumer's
  // isCachedEnvelopeValid). Verifying it here with fixed clocks is fast,
  // deterministic, and does not depend on the CMS scheduling anything today:
  // a client must stop trusting cached content at, not after, nextChangeAt.
  test('cached content is valid strictly before nextChangeAt and expired at/after it', () => {
    const nextChangeAt = '2026-07-15T18:00:00.000Z';
    const oneSecondBefore = new Date('2026-07-15T17:59:59.000Z').getTime();
    const exactBoundary = new Date(nextChangeAt).getTime();

    expect(isWithinCacheWindow({ nextChangeAt }, oneSecondBefore)).toBe(true);
    expect(isWithinCacheWindow({ nextChangeAt }, exactBoundary)).toBe(false);
  });

  test('content without a scheduled transition has no expiry', () => {
    expect(isWithinCacheWindow({}, Date.now())).toBe(true);
  });
});
