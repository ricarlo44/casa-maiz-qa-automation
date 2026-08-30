import { expect, test } from '@playwright/test';

import { getContent } from '../../src/api/client';
import { apiErrorSchema, envelopeSchema } from '../../src/contracts/schemas';

/**
 * Known-failure handling policy (Part 2.4):
 *
 * Every test below asserts what the published OpenAPI contract actually
 * promises (platform/market/audience/appVersion are each `required`, and
 * market/audience are typed `const`). Three of them currently fail against
 * the live API, because the runtime is more permissive than the contract it
 * publishes. Those are marked with `test.fail()` instead of being deleted,
 * skipped, or loosened:
 *   - the strict, spec-correct assertion stays in the suite and in the
 *     machine-readable report (visibility is preserved, nothing is quietly
 *     dropped);
 *   - a normal CI run is not blocked by a defect that is already known and
 *     reported (see DEFECT_REPORT.md and the README's "Known deviations"
 *     section);
 *   - if the API is ever fixed to match its own contract, the test starts
 *     passing and Playwright reports it as an "unexpected pass" -- a loud
 *     signal to come back and remove the test.fail() marker, rather than a
 *     silent, unnoticed fix.
 */

test.describe('context validation: enforced today', () => {
  test('rejects an unsupported platform value with a contract-shaped 400', async ({ request }) => {
    const response = await getContent(request, 'bootstrap', { platform: 'windows' });
    expect(response.status()).toBe(400);

    const envelope = await response.json();
    const error = apiErrorSchema.parse(envelope);
    expect(error.error).toBeTruthy();
  });

  test('rejects a malformed appVersion with a contract-shaped 400', async ({ request }) => {
    const response = await getContent(request, 'bootstrap', { appVersion: 'not-a-version' });
    expect(response.status()).toBe(400);

    const error = apiErrorSchema.parse(await response.json());
    expect(error.error).toBeTruthy();
  });

  test('resolvedContext echoes back a fully valid request', async ({ request }) => {
    const response = await getContent(request, 'bootstrap', {
      platform: 'android',
      market: 'MX',
      audience: 'guest',
      appVersion: '3.2.1',
    });
    expect(response.status()).toBe(200);

    const envelope = envelopeSchema.parse(await response.json());
    expect(envelope.resolvedContext?.platform).toBe('android');
    expect(envelope.resolvedContext?.market).toBe('MX');
    expect(envelope.resolvedContext?.appVersion).toBe('3.2.1');
  });
});

test.describe('context validation: known deviations from the published contract', () => {
  test.fail(
    true,
    'DEFECT (see DEFECT_REPORT.md "Known deviations"): OpenAPI declares market as ' +
      'required and const "MX", but the runtime accepts an out-of-contract value ' +
      'instead of rejecting it with 400.',
  );
  test('market is documented as a required const "MX" but an out-of-contract value is silently accepted', async ({ request }) => {
    const response = await getContent(request, 'bootstrap', { market: 'US' });
    expect(response.status()).toBe(400);
  });

  test.fail(
    true,
    'DEFECT (see DEFECT_REPORT.md "Known deviations"): OpenAPI declares audience as ' +
      'required and const "guest", but the runtime accepts an out-of-contract value ' +
      'instead of rejecting it with 400.',
  );
  test('audience is documented as a required const "guest" but an out-of-contract value is silently accepted', async ({ request }) => {
    const response = await getContent(request, 'bootstrap', { audience: 'member' });
    expect(response.status()).toBe(400);
  });

  test.fail(
    true,
    'DEFECT (see DEFECT_REPORT.md "Known deviations"): OpenAPI declares appVersion as ' +
      'required, but omitting it entirely is silently accepted instead of rejected with 400.',
  );
  test('appVersion is documented as required but omitting it entirely is silently accepted', async ({ request }) => {
    const response = await getContent(request, 'bootstrap', { appVersion: null });
    expect(response.status()).toBe(400);
  });
});
