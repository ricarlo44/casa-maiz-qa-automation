import { expect, test } from '@playwright/test';

import { getContent } from '../../src/api/client';
import { envelopeSchema, isSupportedContractVersion } from '../../src/contracts/schemas';

test.describe('contract envelope', () => {
  test('a live bootstrap response is a supported, well-shaped envelope', async ({ request }) => {
    const response = await getContent(request, 'bootstrap');
    expect(response.status()).toBe(200);

    const body = await response.json();
    const envelope = envelopeSchema.parse(body);

    expect(isSupportedContractVersion(envelope.contractVersion)).toBe(true);
    expect(envelope.data).toBeTruthy();
  });

  test('detects a breaking major-version bump while tolerating additive minor fields', () => {
    // Synthetic envelopes, not live traffic: the CMS cannot be asked to
    // serve "contractVersion: 2.0" on demand, but the compatibility rule
    // itself is pure logic and deserves a fast, deterministic test.
    const additiveMinorBump = {
      contractVersion: '1.9',
      data: { hello: 'world' },
      // A field no client has ever heard of -- must not break parsing.
      futureRolloutCohort: 'beta-42',
    };
    expect(() => envelopeSchema.parse(additiveMinorBump)).not.toThrow();
    expect(isSupportedContractVersion(additiveMinorBump.contractVersion)).toBe(true);

    const breakingMajorBump = { contractVersion: '2.0', data: null };
    expect(isSupportedContractVersion(breakingMajorBump.contractVersion)).toBe(false);
  });

  test('rejects an envelope missing the required contractVersion key', () => {
    expect(() => envelopeSchema.parse({ data: {} })).toThrow();
  });
});
